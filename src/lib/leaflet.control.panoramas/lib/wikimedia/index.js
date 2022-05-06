import L from 'leaflet';
import {MultiLayer, WikimediaVectorCoverage} from './coverage-layer';
import {fetch} from '~/lib/xhr-promise';
import './style.css';
import '../common/style.css';
import config from '~/config';
import {CloseButtonMixin, Events} from "../common";

function getCoverageLayer(options) {
    const url = config.wikimediaCommonsCoverageUrl;
    return new MultiLayer([
        {layer: L.tileLayer(url, L.extend({}, options, {tms: true})), minZoom: 0, maxZoom: 10},
        {layer: new WikimediaVectorCoverage(url, options), minZoom: 11, maxZoom: 18}
    ]);
}

function isCoordLikeArtificial(x) {
    // check if number has less then 2 non-zero digits after decimal point
    return Number.isInteger(x * 10);
}

function parseSearchResponse(resp) { // eslint-disable-line complexity
    const images = [];
    if (resp && resp.query && resp.query.pages && resp.query.pages) {
        for (let page of Object.values(resp.query.pages)) {
            const coordinates = page.coordinates?.[0];
            const pageTitle = page.title ?? '';
            const extension = pageTitle.split('.').pop();
            if (
                !coordinates ||
                coordinates.globe !== 'earth' ||
                (isCoordLikeArtificial(coordinates.lat) && isCoordLikeArtificial(coordinates.lon)) ||
                coordinates.lat === 0 ||
                coordinates.lon === 0 ||
                coordinates.lat === coordinates.lon ||
                pageTitle.includes('View of Earth') ||
                extension.toLowerCase() !== 'jpg'
            ) {
                continue;
            }

            const iinfo = page.imageinfo[0];
            let imageDescription = iinfo.extmetadata.ImageDescription ? iinfo.extmetadata.ImageDescription.value : null;
            let objectDescription = iinfo.extmetadata.ObjectName ? iinfo.extmetadata.ObjectName.value : null;
            if (imageDescription && /^<table (.|\n)+<\/table>$/u.test(imageDescription)) {
                imageDescription = null;
            }
            if (imageDescription) {
                imageDescription = imageDescription.replace(/<[^>]+>/ug, '');
                imageDescription = imageDescription.replace(/[\n\r]/ug, '');
            }
            if (
                imageDescription &&
                objectDescription &&
                objectDescription.toLowerCase().includes(imageDescription.toLowerCase())
            ) {
                imageDescription = null;
            }
            if (
                objectDescription &&
                imageDescription &&
                imageDescription.toLowerCase().includes(objectDescription.toLowerCase())
            ) {
                objectDescription = null;
            }
            let description = 'Wikimedia commons';
            if (objectDescription || imageDescription) {
                description = '';
                if (objectDescription) {
                    description = objectDescription;
                }
                if (imageDescription) {
                    // eslint-disable-next-line max-depth
                    if (objectDescription) {
                        description += '</br>';
                    }
                    description += imageDescription;
                }
            }

            let author = iinfo.extmetadata.Artist ? iinfo.extmetadata.Artist.value : null;
            if (author && /^<table (.|\n)+<\/table>$/u.test(author)) {
                author = `See author info at <a href="${iinfo.descriptionurl}">Wikimedia commons</a>`;
            }

            // original images can be rotated, 90 degrees
            // thumbnails are always oriented right
            // so we request thumbnail of original image size
            let url = iinfo.thumburl.replace('134px', `${iinfo.width}px`);
            images.push({
                url,
                width: iinfo.width,
                height: iinfo.height,
                lat: coordinates.lat,
                lng: coordinates.lon,
                author: author,
                timeOriginal: iinfo.extmetadata.DateTimeOriginal ? iinfo.extmetadata.DateTimeOriginal.value : null,
                time: iinfo.extmetadata.DateTime ? iinfo.extmetadata.DateTime.value : null,
                description: description,
                pageUrl: iinfo.descriptionurl,
                pageId: page.pageid.toString()
            });
        }
        if (images.length) {
            return images;
        }
    }
    return null;
}

function isCloser(target, a, b) {
    const d1 = target.distanceTo(a);
    const d2 = target.distanceTo(b);
    if (d1 < d2) {
        return -1;
    } else if (d1 === d2) {
        return 0;
    }
    return 1;
}

async function getPanoramaAtPos(latlng, searchRadiusMeters) {
    latlng = L.latLng(latlng.lat, latlng.lng); // make independent copy

    const clusterSize = 10;
    const urlTemplate = 'https://commons.wikimedia.org/w/api.php?' +
                        'origin=*&format=json&action=query&generator=geosearch&' +
                        'ggsprimary=all&ggsnamespace=6&ggslimit=10&iilimit=1&coprimary=all&' +
                        'ggsradius={radius}&ggscoord={lat}|{lng}&' +
                        'iiurlwidth=134&' +
                        'prop=imageinfo|coordinates&' +
                        'iiprop=url|mime|size|extmetadata|commonmetadata|metadata';
    searchRadiusMeters += clusterSize;
    if (searchRadiusMeters < 10) {
        searchRadiusMeters = 10;
    }
    if (searchRadiusMeters > 10000) {
        searchRadiusMeters = 10000;
    }
    const url = L.Util.template(urlTemplate, {lat: latlng.lat, lng: latlng.lng, radius: Math.ceil(searchRadiusMeters)});
    const resp = await fetch(url, {responseType: 'json', timeout: 10000});
    if (resp.status === 200) {
        let photos = parseSearchResponse(resp.responseJSON);
        if (photos) {
            photos.sort(isCloser.bind(null, latlng));
            const nearestLatlng = L.latLng(photos[0].lat, photos[0].lng);
            photos = photos.filter((photo) => nearestLatlng.distanceTo(L.latLng(photo.lat, photo.lng)) <= clusterSize);
            return {
                found: true,
                data: photos
            };
        }
        return {found: false};
    }
    return {found: false};
}

function formatDateTime(dateStr) {
    const m = /^(\d+)-(\d+)-(\d+)/u.exec(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (m) {
        let [year, month, day] = m.slice(1);
        return `${day} ${months[month - 1]} ${year}`;
    }
    return dateStr;
}

const Viewer = L.Evented.extend({
    includes: [CloseButtonMixin],
    initialize: function(container) {
        container = L.DomUtil.create('div', 'wikimedia-viewer-container', container);
        this.createCloseButton(container);
        const mapContainer = this.mapContainer = L.DomUtil.create('div', 'wikimedia-viewer-map-container', container);
        this.pageButtonContainer = L.DomUtil.create('div', 'wikimedia-viewer-page-buttons-container', container);

        this.map = L.map(mapContainer, {
            maxBoundsViscosity: 1,
            crs: L.CRS.Simple,
            zoomControl: false,
            attributionControl: false,
            zoomSnap: 0,
        });

        this.map.on('zoomend moovend', () => this.fire(Events.YawPitchZoomChangeEnd));

        this.infoLabel = L.DomUtil.create('div', 'wikimedia-viewer-info-overlay', mapContainer);
        this.prevPhotoButton = L.DomUtil.create('div', 'wikimedia-viewer-button-prev', mapContainer);
        this.nextPhotoButton = L.DomUtil.create('div', 'wikimedia-viewer-button-next', mapContainer);
        L.DomEvent.on(this.prevPhotoButton, 'click', () => {
            this.switchPhoto(this._imageIdx - 1);
        });
        L.DomEvent.on(this.nextPhotoButton, 'click', () => {
            this.switchPhoto(this._imageIdx + 1);
        });
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
                button.innerHTML = String(i + 1);
                this._buttons.push(button);
                L.DomEvent.on(button, 'click', () => this.switchPhoto(i));
            }
        } else {
            L.DomUtil.removeClass(this.pageButtonContainer, 'enabled');
        }
    },

    switchPhoto: function(imageIdx, imagePos = null) {
        this._imageIdx = imageIdx;
        if (this.imageLayer) {
            this.map.removeLayer(this.imageLayer);
        }
        let image = this.images[imageIdx];
        let mapSize = this.map.getSize();
        if (!mapSize.x || !mapSize.y) {
            mapSize = {x: 500, y: 500};
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
            caption.push(formatDateTime(image.timeOriginal));
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
        this.notifyImageChange();
    },

    notifyImageChange: function() {
        if (this.images && this._active) {
            const image = this.images[this._imageIdx];
            this.fire(Events.ImageChange, {
                    latlng: L.latLng(image.lat, image.lng),
                    latlngs: this.images.map((image) => L.latLng(image.lat, image.lng))
                }
            );
        }
    },

    showPano: function(images, imageIdx = 0, imagePos = null) {
        this.images = images;
        this.setupPageButtons(images.length);
        this.switchPhoto(imageIdx, imagePos);
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
            getPanoramaAtPos({lat, lng}, 0).then((resp) => {
                if (!resp.found) {
                    return;
                }
                for (let [i, image] of resp.data.entries()) {
                    if (image.pageId === pageId) {
                        imageIdx = i;
                        break;
                    }
                }
                if (imageIdx > -1) {
                    this.showPano(resp.data, imageIdx, {center: L.latLng(y, x), zoom});
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
    },

    invalidateSize: function() {
        this.map.invalidateSize();
    }
});

function getViewer(container) {
    return new Viewer(container);
}

const wikimediaProvider = {getCoverageLayer, getPanoramaAtPos, getViewer};
export default wikimediaProvider;
