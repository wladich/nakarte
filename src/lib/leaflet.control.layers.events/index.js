import L from 'leaflet';
import '~/lib/leaflet.control.commons';

const originalLayerOnAdd = L.Control.Layers.prototype.onAdd;

L.Control.Layers.include({
    onAdd: function(map) {
        const container = originalLayerOnAdd.call(this, map);
        this._stopContainerEvents();
        return container;
    }
});

const originalZoomOnAdd = L.Control.Zoom.prototype.onAdd;

L.Control.Zoom.include({
    onAdd: function(map) {
        const container = originalZoomOnAdd.call(this, map);
        this._container = container;
        this._stopContainerEvents();
        return container;
    }
});
