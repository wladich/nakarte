import L from 'leaflet';
import './style.css';

const ZoomWithDisplay = L.Control.Zoom.extend({
    onAdd: function(map) {
        const container = L.Control.Zoom.prototype.onAdd.call(this, map);
        this._display = L.DomUtil.create('div', 'leaflet-control-zoom-display');
        container.insertBefore(this._display, this._zoomOutButton);
        map.on('zoomend', this._updateDisplay, this);
        this._updateDisplay();
        return container;
    },

    onRemove: function(map) {
        L.Control.Zoom.prototype.onRemove.call(this, map);
        map.off('zoomend', this._updateDisplay, this);
    },

    _updateDisplay: function() {
        this._display.innerHTML = this._map.getZoom();
    }

});

export default ZoomWithDisplay;
