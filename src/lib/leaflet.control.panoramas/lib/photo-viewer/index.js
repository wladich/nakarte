import L from 'leaflet';
import './style.css';
import '../common/style.css';

const Viewer = L.Evented.extend({
    initialize: function(container, getPanoramaAtPosFunc) {
        container = L.DomUtil.create('div', 'wikimedia-viewer-container', container);
        const mapContainer = this.mapContainer = L.DomUtil.create('div', 'wikimedia-viewer-map-container', container);
        this.pageButtonContainer = L.DomUtil.create('div', 'wikimedia-viewer-page-buttons-container', container);

        this.map = L.map(mapContainer, {
            maxBoundsViscosity: 1,
            crs: L.CRS.Simple,
            zoomControl: false,
            attributionControl: false,
            zoomSnap: 0,
        });

        this.map.on('zoomend', this.notifyChange, this);
        this.map.on('moveend', this.notifyChange, this);

        this.infoLabel = L.DomUtil.create('div', 'wikimedia-viewer-info-overlay', mapContainer);
        this.closeButton = L.DomUtil.create('div', 'photo-viewer-button-close', container);
        this.prevPhotoButton = L.DomUtil.create('div', 'wikimedia-viewer-button-prev', mapContainer);
        this.nextPhotoButton = L.DomUtil.create('div', 'wikimedia-viewer-button-next', mapContainer);
        L.DomEvent.on(this.prevPhotoButton, 'click', () => {
            this.switchPhoto(this._imageIdx - 1);
        });
        L.DomEvent.on(this.nextPhotoButton, 'click', () => {
            this.switchPhoto(this._imageIdx + 1);
        });
        L.DomEvent.on(this.closeButton, 'click', this.onCloseClick, this);
        this.getPanoramaAtPos = getPanoramaAtPosFunc;
    },

    setupPageButtons: function(count) {
        if (this._buttons) {
            for (let button of this._buttons) {
                this.pageButtonContainer.removeChild(button);
            }
        }
        this._buttons = [];
        if (count > 1) {
            L.DomUtil.addClass(this.pageButtonContainer, 'enabled');

            for (let i = 0; i < count; i++) {
                let button = L.DomUtil.create('div', 'wikimedia-viewer-page-button', this.pageButtonContainer);
                button.innerHTML = '' + (i + 1);
                this._buttons.push(button);
                L.DomEvent.on(button, 'click', () => this.switchPhoto(i));
            }
        } else {
            L.DomUtil.removeClass(this.pageButtonContainer, 'enabled');
        }
    },

    switchPhoto: function(imageIdx, imagePos=null) {
        this._imageIdx = imageIdx;
        if (this.imageLayer) {
            this.map.removeLayer(this.imageLayer);
        }
        let image = this.images[imageIdx];
        let mapSize = this.map.getSize();
        if (!mapSize.x || !mapSize.y) {
            mapSize = {x: 500, y: 500}
        }
        let maxZoom = Math.log2(Math.max(image.width / mapSize.x, image.height / mapSize.y)) + 2;
        if (maxZoom < 1) {
            maxZoom = 1;
        }
        let
            southWest = this.map.unproject([0, image.height], maxZoom - 2),
            northEast = this.map.unproject([image.width, 0], maxZoom - 2);
        const bounds = new L.LatLngBounds(southWest, northEast);
        this.map.setMaxZoom(maxZoom);
        this.map.setMaxBounds(bounds);
        if (imagePos) {
            this.map.setView(imagePos.center, imagePos.zoom, {animate: false});
        } else {
            this.map.fitBounds(bounds, {animate: false});
        }

        this.imageLayer = L.imageOverlay(null, bounds);
        L.DomUtil.addClass(this.mapContainer, 'loading');
        this.imageLayer.on('load', () => {
            L.DomUtil.removeClass(this.mapContainer, 'loading');
        });
        this.imageLayer.setUrl(image.url);
        this.imageLayer.addTo(this.map);
        let caption = [];

        if (image.timeOriginal) {
            caption.push(image.timeOriginal);
        }
        if (image.author) {
            caption.push(image.author);
        }
        caption.push(`<a href="${image.pageUrl}">${image.description}</a>`);
        caption = caption.join('</br>');
        this.infoLabel.innerHTML = caption;

        if (imageIdx > 0) {
            L.DomUtil.addClass(this.prevPhotoButton, 'enabled');
        } else {
            L.DomUtil.removeClass(this.prevPhotoButton, 'enabled');
        }
        if (imageIdx < this.images.length - 1) {
            L.DomUtil.addClass(this.nextPhotoButton, 'enabled');
        } else {
            L.DomUtil.removeClass(this.nextPhotoButton, 'enabled');
        }
        for (let [i, button] of this._buttons.entries()) {
            ((i === imageIdx) ? L.DomUtil.addClass : L.DomUtil.removeClass)(button, 'active');
        }
        this.notifyChange();
    },

    notifyChange: function() {
        if (this.images && this._active) {
            const image = this.images[this._imageIdx];
            this.fire('change', {
                    latlng: L.latLng(image.lat, image.lng),
                    latlngs: this.images.map((image) => {
                        return L.latLng(image.lat, image.lng);
                    })

                }
            )
        }
    },

    _showPano: function(images, imageIdx=0, imagePos=null) {
        this.images = images;
        this.setupPageButtons(images.length);
        this.switchPhoto(imageIdx, imagePos);
    },

    showPano: function(images) {
        this._showPano(images);
    },

    onCloseClick: function() {
        this.fire('closeclick');
    },

    activate: function() {
        this._active = true;
    },

    deactivate: function() {
        this._active = false;
    },

    setState: function(state) {
        const lat = parseFloat(state[0]);
        const lng = parseFloat(state[1]);
        const pageId = state[2];
        const y = parseFloat(state[3]);
        const x = parseFloat(state[4]);
        const zoom = parseFloat(state[5]);
        if (!isNaN(lat) && !isNaN(lng) && !isNaN(x) && !isNaN(y) && !isNaN(zoom)) {
            let imageIdx = -1;
            this.getPanoramaAtPos({lat, lng}, 0).then((resp) => {
                if (!resp.found) {
                    return false;
                }
                for (let [i, image] of resp.data.entries()) {
                    if (image.pageId === pageId) {
                        imageIdx = i;
                        break;
                    }
                }
                if (imageIdx > -1) {
                    this._showPano(resp.data, imageIdx, {center: L.latLng(y, x), zoom});
                }
            });
            return true;
        }
        return false;
    },

    getState: function() {
        if (!this.images) {
            return [];
        }
        const center = this.map.getCenter();
        return [
            this.images[0].lat.toFixed(6),
            this.images[0].lng.toFixed(6),
            this.images[this._imageIdx].pageId,
            center.lat.toFixed(2),
            center.lng.toFixed(2),
            this.map.getZoom().toFixed(1)
        ];
    }
});

export {Viewer};