import L from 'leaflet';
import './style.css';

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
        this._container.innerHTML = this._contents;
        if (L.DomEvent) {
            L.DomEvent.disableClickPropagation(this._container);
        }
        return this._container;
    }

});

