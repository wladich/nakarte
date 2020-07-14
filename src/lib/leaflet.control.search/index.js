import L from 'leaflet';
import ko from 'knockout';

import {stopContainerEvents} from '~/lib/leaflet.control.commons';

import {providers} from './providers';
import './style.css';
import controlTemplate from './control.html';

class SearchViewModel {
    query = ko.observable('');
    items = ko.observableArray([]);
    error = ko.observable(null);
    inputHasFocus = ko.observable(true).extend({rateLimit: {timeout: 10, method: 'notifyWhenChangesStop'}});
    highlightedIndex = ko.observable(null);
    resultsHaveFocus = ko.observable(false);

    showResults = ko.pureComputed(function() {
        return (
            this.items().length > 0 &&
            (this.inputHasFocus() || this.resultsHaveFocus()) &&
            this.query().trim().length >= this.minSearchQueryLength
        );
    }, this);

    showError = ko.pureComputed(function() {
        return this.error() !== null && this.inputHasFocus() && this.query().trim().length >= this.minSearchQueryLength;
    }, this);

    onItemMouseOver = (item) => {
        this.highlightedIndex(this.items.indexOf(item));
    };

    onItemClick = (item) => {
        this.resultsHaveFocus(false);
        this.itemSelected(item);
    };

    onShowResults(show) {
        if (show) {
            this.highlightedIndex(this.items().length > 0 ? 0 : null);
        }
    }

    onInputFocusChange(hasFocus) {
        if (hasFocus) {
            this.maybeRequestSearch(this.query());
        }
    }

    defaultEventHandle(_, e) {
        L.DomEvent.stopPropagation(e);
        return true;
    }

    onInputKeyDown = (_, e) => {
        let n;
        switch (e.which) {
            case 38: // up
                n = this.highlightedIndex();
                if (n === null) {
                    n = this.items().length - 1;
                } else {
                    n -= 1;
                }
                if (n === -1) {
                    n = this.items().length - 1;
                }
                this.highlightedIndex(n);
                break;
            case 40: // down
                n = this.highlightedIndex();
                if (n === null) {
                    n = 0;
                } else {
                    n += 1;
                }
                if (n === this.items().length) {
                    n = 0;
                }
                this.highlightedIndex(n);
                break;
            case 13: // enter
                if (this.items().length > 0) {
                    this.inputHasFocus(false);
                    this.itemSelected(this.items()[this.highlightedIndex()]);
                }
                break;
            case 27: // esc
                this.inputHasFocus(false);
                break;
            default:
                return true;
        }
        return false;
    };

    maybeRequestSearch(query) {
        query = query.trim();
        if (query.length >= this.minSearchQueryLength) {
            this.items.removeAll();
            this.error(null);
            this.searchRequested(null);
        }
    }

    // public events
    itemSelected = ko.observable().extend({notify: 'always'});
    searchRequested = ko.observable().extend({notify: 'always'});

    // public methods
    setResult(items) {
        this.items.splice(0, this.items().length, ...items);
        this.error(null);
    }

    setResultError(error) {
        this.items.removeAll();
        this.error(error);
    }

    setFocus() {
        this.inputHasFocus(true);
    }

    constructor(minSearchQueryLength, inputDelay) {
        this.minSearchQueryLength = minSearchQueryLength;
        this.query.extend({rateLimit: {timeout: inputDelay, method: 'notifyWhenChangesStop'}});
        this.query.subscribe(this.maybeRequestSearch.bind(this));
        this.showResults.subscribe(this.onShowResults.bind(this));
        this.inputHasFocus.subscribe(this.onInputFocusChange.bind(this));
    }
}

const SearchControl = L.Control.extend({
    options: {
        provider: 'mapycz',
        delay: 500,
        minQueryLength: 3,
        maxResponses: 5,
    },

    initialize: function(options) {
        L.Control.prototype.initialize.call(this, options);
        this.provider = new providers[this.options.provider]({maxResponses: this.options.maxResponses});
        this.searchPromise = null;
        this.viewModel = new SearchViewModel(this.options.minQueryLength, this.options.delay);
        this.viewModel.searchRequested.subscribe(this.onSearchRequested.bind(this));
        this.viewModel.itemSelected.subscribe(this.onResultItemClicked.bind(this));
    },

    onAdd: function(map) {
        this._map = map;
        const container = L.DomUtil.create('div', 'leaflet-search');
        container.innerHTML = controlTemplate;
        ko.applyBindings(this.viewModel, container);
        this.searchPromise = null;
        setTimeout(() => this.viewModel.setFocus(), 0);
        stopContainerEvents(container);
        return container;
    },

    onSearchRequested: async function() {
        const query = this.viewModel.query();
        const searchOptions = {
            bbox: this._map.getBounds(),
            latlng: this._map.getCenter(),
            zoom: this._map.getZoom(),
        };
        const searchPromise = (this.searchPromise = this.provider.search(query, searchOptions));
        const result = await searchPromise;
        if (this.searchPromise === searchPromise) {
            if (result.error) {
                this.viewModel.setResultError(result.error);
            } else {
                this.viewModel.setResult(result.results);
            }
        }
    },

    onResultItemClicked: function(item) {
        this._map.fitBounds(item.bbox);
    },
});

export {SearchControl};
