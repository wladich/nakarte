import L from 'leaflet';
import ko from 'knockout';

import {stopContainerEvents} from '~/lib/leaflet.control.commons';
import '~/lib/leaflet.hashState/leaflet.hashState';

import {providers, magicProviders} from './providers/index';
import './style.css';
import controlTemplate from './control.html';

class SearchViewModel {
    query = ko.observable('');
    inputPlaceholder = ko.observable(null);
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

    showWarningTooShort = ko.pureComputed(function() {
        const queryLength = this.query().trim().length;
        return this.inputHasFocus() && queryLength > 0 && queryLength < this.minSearchQueryLength;
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

    setInputPlaceholder(s) {
        this.inputPlaceholder(s);
    }

    constructor(minSearchQueryLength, inputDelay) {
        this.minSearchQueryLength = minSearchQueryLength;
        this.query.extend({rateLimit: {timeout: inputDelay, method: 'notifyWhenChangesStop'}});
        this.query.subscribe(this.maybeRequestSearch.bind(this));
        this.showResults.subscribe(this.onShowResults.bind(this));
        this.inputHasFocus.subscribe(this.onInputFocusChange.bind(this));
    }
}

const ResultMarker = L.Marker.extend({
    initialize: function(map) {
        const icon = L.divIcon({
            html: '<div class="marker-title"></div>',
            className: 'leaflet-search-result-marker',
        });
        L.Marker.prototype.initialize.call(this, null, {icon});
        this.__map = map;
        this.on('click', this.onClick, this);
    },

    setResult: function(latlng, title) {
        this.setLatLng(latlng);
        this.addTo(this.__map);
        this._icon.querySelector('.marker-title').innerHTML = title;
        this.__map.on('move', this.onMapMove, this);
        this.__map.suggestedPoint = {latlng, title};
    },

    hide: function() {
        this.__map.removeLayer(this);
        this.__map.suggestedPoint = null;
    },

    onMapMove: function() {
        if (!this.__map.getBounds().contains(this.getLatLng())) {
            this.__map.off('move', this.onMapMove, this);
            this.hide();
        }
    },

    onClick: function() {
        this.__map.fire('click', {latlng: this.getLatLng(), suggested: true});
        this.hide();
    },
});

const SearchControl = L.Control.extend({
    includes: L.Mixin.Events,

    options: {
        provider: 'mapycz',
        providerOptions: {
            maxResponses: 5,
        },
        delay: 500,
        minQueryLength: 3,
        hotkey: 'L',
    },

    initialize: function(options) {
        L.Control.prototype.initialize.call(this, options);
        this.provider = new providers[this.options.provider](this.options.providerOptions);
        this.magicProviders = magicProviders.map((Cls) => new Cls());
        this.searchPromise = null;
        this.viewModel = new SearchViewModel(this.options.minQueryLength, this.options.delay);
        this.viewModel.searchRequested.subscribe(this.onSearchRequested.bind(this));
        this.viewModel.itemSelected.subscribe(this.onResultItemClicked.bind(this));
        this.viewModel.query.subscribe(() => this.fire('querychange'));
    },

    onAdd: function(map) {
        this._map = map;
        const container = L.DomUtil.create('div', 'leaflet-search-container');
        container.innerHTML = controlTemplate;
        ko.applyBindings(this.viewModel, container);
        this.searchPromise = null;
        setTimeout(() => this.viewModel.setFocus(), 0);
        stopContainerEvents(container);
        L.DomEvent.on(document, 'keyup', this.onDocumentKeyUp, this);
        this.viewModel.setInputPlaceholder(`Search places, coordinates, links (Alt-${this.options.hotkey})`);
        this.marker = new ResultMarker(map);
        return container;
    },

    onSearchRequested: async function() {
        const query = this.viewModel.query();
        const searchOptions = {
            bbox: this._map.getBounds(),
            latlng: this._map.getCenter(),
            zoom: this._map.getZoom(),
        };
        let provider = this.provider;
        for (let magicProvider of this.magicProviders) {
            if (magicProvider.isOurQuery(query)) {
                provider = magicProvider;
            }
        }
        const searchPromise = (this.searchPromise = provider.search(query, searchOptions));
        const result = await searchPromise;
        if (this.searchPromise === searchPromise) {
            if (result.error) {
                this.viewModel.setResultError(result.error);
            } else if (result.results.length === 0) {
                this.viewModel.setResultError('Nothing found');
            } else {
                this.viewModel.setResult(result.results);
            }
        }
    },

    onResultItemClicked: function(item) {
        if (item.bbox) {
            this._map.fitBounds(item.bbox);
        } else {
            this._map.setView(item.latlng, item.zoom);
        }
        this.marker.setResult(item.latlng, item.title);
    },

    onDocumentKeyUp: function(e) {
        if (e.keyCode === this.options.hotkey.codePointAt(0) && e.altKey) {
            this.viewModel.setFocus();
        }
    },
});

SearchControl.include(L.Mixin.HashState);
SearchControl.include({
    stateChangeEvents: ['querychange'],

    serializeState: function() {
        const query = this.viewModel.query();
        if (query) {
            return [encodeURIComponent(query)];
        }
        return null;
    },

    unserializeState: function(state) {
        if (state?.length === 1) {
            this.viewModel.query(decodeURIComponent(state[0]));
            return true;
        }
        return false;
    },
});

export {SearchControl};