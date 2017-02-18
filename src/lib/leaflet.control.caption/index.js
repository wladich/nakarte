import L from 'leaflet';
import './style.css';
import 'lib/leaflet.control.commons';

L.Control.Caption = L.Control.extend({
    options: {
        position: 'bottomright',
        className: 'leaflet-control-caption'
    },

    initialize: function (contents, options) {
        L.setOptions(this, options);
        this._contents = contents;
    },

    onAdd: function (map) {
        this._container = L.DomUtil.create('div', this.options.className);
        this._stopContainerEvents();
        this._container.innerHTML = this._contents;
        return this._container;
    }

});

