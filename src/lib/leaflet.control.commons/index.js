import L from 'leaflet';

L.Control.include({
    _stopContainerEvents: function() {
        const container = this._container;
        L.DomEvent.disableClickPropagation(container);
        if (!L.Browser.touch) {
            L.DomEvent.disableScrollPropagation(container);
        } else {
            L.DomEvent.on(container, 'mousemove', L.DomEvent.stop);
        }

    }
});
