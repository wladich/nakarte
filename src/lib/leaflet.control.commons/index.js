import L from 'leaflet';

L.Control.include({
    _stopContainerEvents: function() {
        const container = this._container;
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);
        L.DomEvent.on(container, 'mousemove', L.DomEvent.stop);

    }
});
