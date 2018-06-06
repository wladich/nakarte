import L from 'leaflet'
import ko from 'vendored/knockout';
import './coordinates.css';
import copyToClipboard from 'lib/clipboardCopy';
import Contextmenu from 'lib/contextmenu';
import {makeButtonWithBar} from 'lib/leaflet.control.commons';
import safeLocalStorage from 'lib/safe-localstorage';
import 'lib/controls-styles/controls-styles.css';
import FORMATS from './formats';

const DEFAULT_FORMAT = FORMATS.DEGREES;
const UNKNOWN_COORDINATES = {
    lat: '-------',
    lng: '-------'
};

L.Control.Coordinates = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        formats: [
            FORMATS.SIGNED_DEGREES,
            FORMATS.DEGREES,
            FORMATS.DEGREES_AND_MINUTES,
            FORMATS.DEGREES_AND_MINUTES_AND_SECONDS
        ],

        initialize: function(options) {
            L.Control.prototype.initialize.call(this, options);

            this.latlng = ko.observable();
            this.formatCode = ko.observable(DEFAULT_FORMAT.code);

            this.format = ko.pureComputed(() => {
                for (let format of this.formats) {
                    if (format.code === this.formatCode()) return format;
                }
                return DEFAULT_FORMAT;
            }, this);

            this.formattedCoordinates = ko.pureComputed(() => {
                if (this.latlng()) {
                    return this.format().process(this.latlng().wrap());
                }
                return UNKNOWN_COORDINATES;
            }, this);

            this.formatCode.subscribe((_) => {
                this.saveStateToStorage();
            }, this);
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
                <div class="leaflet-coordinates-container" data-bind="with: formattedCoordinates()">
                    <span data-bind="html: lat"></span>
                    &nbsp;
                    <span data-bind="html: lng"></span>
                </div>
                <hr class="leaflet-coordinates-divider" />
                <div data-bind="foreach: formats">
                    <div class="leaflet-coordinates-format">
                        <label>
                            <input type="radio" data-bind="checked: $parent.formatCode, value: code" class="leaflet-coordinates-format-radio"/>
                            <span data-bind="html: label"></span>
                        </label>
                    </div>
                </div>
            `;

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
            if (!!enabled === this.isEnabled()) {
                return;
            }
            const classFunc = enabled ? 'addClass' : 'removeClass';
            const eventFunc = enabled ? 'on' : 'off';
            L.DomUtil[classFunc](this._container, 'active');
            L.DomUtil[classFunc](this._container, 'highlight');
            L.DomUtil[classFunc](this._map._container, 'coordinates-control-active');
            this._map[eventFunc]('mousemove', this.onMouseMove, this);
            this._map[eventFunc]('contextmenu', this.onMapRightClick, this);
            this._isEnabled = !!enabled;
        },

        onMapRightClick: function(e) {
            L.DomEvent.stop(e);

            const createItem = (format, options = {}) => {
                const {lat, lng} = format.process(e.latlng.wrap());
                const coordinates = `${lat} ${lng}`;

                return Object.assign({
                    text: `${coordinates} <span class="leaflet-coordinates-menu-fmt">${format.label}</span>`,
                    callback: () => copyToClipboard(coordinates, e.originalEvent)
                }, options);
            };

            const header = createItem(this.format(), {
                text: '<b>Copy coordinates to clipboard</b>',
                header: true,
            });
            const items = this.formats.map((format) => createItem(format));
            items.unshift(header, '-');

            new Contextmenu(items).show(e);
        },

        isEnabled: function() {
            return !!this._isEnabled;
        },

        onClick: function(e) {
            this.setEnabled(!this.isEnabled());
            this.saveStateToStorage();
        }
    }
);
