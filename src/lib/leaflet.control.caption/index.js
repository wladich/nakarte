import L from 'leaflet';
import './style.css';
import '~/lib/leaflet.control.commons';

L.Control.Caption = L.Control.extend({
    options: {
        position: 'bottomright',
        className: 'leaflet-control-caption'
    },

    initialize: function(contents, options) {
        L.setOptions(this, options);
        this._contents = contents;
    },

    onAdd: function(map) {
        this._map = map;
        this._container = L.DomUtil.create('div', this.options.className);
        this._container.innerHTML = this._contents;
        L.DomEvent.on(this._container, 'contextmenu', (e) => {
            L.DomEvent.stopPropagation(e);
            e.returnValue = true;
            return true;
        });
        return this._container;
    },

    setContents: function(contents) {
        this._contents = contents;
        if (this._map) {
            this._container.innerHTML = this._contents;
        }
    }

});

