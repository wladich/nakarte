import L from 'leaflet';
import ko from 'knockout';
import './coordinates.css';
import copyToClipboard from '~/lib/clipboardCopy';
import Contextmenu from '~/lib/contextmenu';
import {makeButtonWithBar} from '~/lib/leaflet.control.commons';
import safeLocalStorage from '~/lib/safe-localstorage';
import '~/lib/controls-styles/controls-styles.css';
import * as formats from './formats';

const DEFAULT_FORMAT = formats.DEGREES;
const UNKNOWN_COORDINATES = {
    lat: '-------',
    lng: '-------'
};

L.Control.Coordinates = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        formats: [
            formats.SIGNED_DEGREES,
            formats.DEGREES,
            formats.DEGREES_AND_MINUTES,
            formats.DEGREES_AND_MINUTES_AND_SECONDS
        ],

        initialize: function(options) {
            L.Control.prototype.initialize.call(this, options);

            this.latlng = ko.observable();
            this.format = ko.observable(DEFAULT_FORMAT);
            this.formatCode = ko.pureComputed({
                read: () => this.format().code,
                write: (value) => {
                    for (let format of this.formats) {
                        if (value === format.code) {
                            this.format(format);
                            break;
                        }
                    }
                }
            });

            this.formattedCoordinates = ko.pureComputed(() => {
                if (this.latlng()) {
                    return formats.formatLatLng(this.latlng().wrap(), this.format());
                }
                return UNKNOWN_COORDINATES;
            }, this);

            this.wrapperClass = ko.pureComputed(() => this.format().wrapperClass, this);

            this.formatCode.subscribe(this.saveStateToStorage, this);
        },

        onAdd: function(map) {
            const {container, link, barContainer} = makeButtonWithBar(
                'leaflet-contol-coordinates',
                'Show coordinates at cursor',
                'icon-coordinates'
            );

            this._map = map;
            this._container = container;
            this._link = link;

            barContainer.innerHTML = `
                <div data-bind="css: wrapperClass">
                    <div class="leaflet-coordinates-container" data-bind="with: formattedCoordinates()">
                        <span class="leaflet-coordinates-latitude" data-bind="html: lat"></span>
                        <span class="leaflet-coordinates-longitude" data-bind="html: lng"></span>
                    </div>
                    <hr class="leaflet-coordinates-divider" />
                    <div data-bind="foreach: formats">
                        <div>
                            <label title="">
                                <input type="radio" data-bind="checked: $parent.formatCode, value: code" 
                                       class="leaflet-coordinates-format-radio"/>
                                <span data-bind="html: label"></span>
                            </label>
                        </div>
                    </div>
                </div>
            `;

            barContainer.title = "Right click on map to copy coordinates";

            this.loadStateFromStorage();
            ko.applyBindings(this, container);
            L.DomEvent.on(link, 'click', this.onClick, this);

            return container;
        },

        onRemove: function() {
            L.DomEvent.off(this._link, 'click', this.onClick, this);
        },

        loadStateFromStorage: function() {
            const active = safeLocalStorage.leafletCoordinatesActive === '1';
            const code = safeLocalStorage.leafletCoordinatesFmt || DEFAULT_FORMAT.code;

            this.formatCode(code);
            this.setEnabled(active);
        },

        saveStateToStorage: function() {
            safeLocalStorage.leafletCoordinatesActive = this.isEnabled() ? '1' : '0';
            safeLocalStorage.leafletCoordinatesFmt = this.formatCode();
        },

        onMouseMove: function(e) {
            this.latlng(e.latlng);
        },

        setEnabled: function(enabled) {
            if (Boolean(enabled) === this.isEnabled()) {
                return;
            }
            const classFunc = enabled ? 'addClass' : 'removeClass';
            const eventFunc = enabled ? 'on' : 'off';
            L.DomUtil[classFunc](this._container, 'active');
            L.DomUtil[classFunc](this._container, 'highlight');
            L.DomUtil[classFunc](this._map._container, 'coordinates-control-active');
            this._map[eventFunc]('mousemove', this.onMouseMove, this);
            this._map[eventFunc]('contextmenu', this.onMapRightClick, this);
            this._isEnabled = Boolean(enabled);
            this.latlng(null);
        },

        onMapRightClick: function(e) {
            L.DomEvent.stop(e);

            function createItem(format, options = {}) {
                const {lat, lng} = formats.formatLatLng(e.latlng.wrap(), format);
                const coordinates = `${lat} ${lng}`;

                return {text: `${coordinates} <span class="leaflet-coordinates-menu-fmt">${format.label}</span>`,
                    callback: () => copyToClipboard(coordinates, e.originalEvent),
                    ...options};
            }

            const header = createItem(this.format(), {
                text: '<b>Copy coordinates to clipboard</b>',
                header: true,
            });
            const items = this.formats.map((format) => createItem(format));
            items.unshift(header, '-');

            new Contextmenu(items).show(e);
        },

        isEnabled: function() {
            return Boolean(this._isEnabled);
        },

        onClick: function() {
            this.setEnabled(!this.isEnabled());
            this.saveStateToStorage();
        }
    }
);
