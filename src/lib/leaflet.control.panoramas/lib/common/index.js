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

function formatDateTime(ts) {
    const d = new Date(ts);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

const DateLabelMixin = {
    createDateLabel: function(container) {
        this.dateLabel = L.DomUtil.create('div', 'mapillary-viewer-date-overlay', container);
    },

    updateDateLabel: function(timestamp) {
        this.dateLabel.innerHTML = formatDateTime(timestamp);
    }
};

const Events = {
    ImageChange: 'ImageChange',
    BearingChange: 'BearingChange',
    YawPitchZoomChangeEnd: 'YawPitchZoomChangeEnd',
};

export {CloseButtonMixin, DateLabelMixin, Events};
