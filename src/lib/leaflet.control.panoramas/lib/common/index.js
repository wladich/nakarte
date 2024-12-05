import L from 'leaflet';
import './style.css';

const CloseButtonMixin = {
    createCloseButton: function(container) {
        this.closeButton = L.DomUtil.create('div', 'photo-viewer-button-close', container);
        L.DomEvent.on(this.closeButton, 'click', this.onCloseClick, this);
    },

    onCloseClick: function() {
        this.fire('closeclick');
    },
};

const Events = {
    ImageChange: 'ImageChange',
    BearingChange: 'BearingChange',
    YawPitchZoomChangeEnd: 'YawPitchZoomChangeEnd',
};

export {CloseButtonMixin, Events};
