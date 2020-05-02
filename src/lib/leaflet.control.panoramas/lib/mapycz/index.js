import L from 'leaflet';
import {getSMap} from './apiLoader';
import {CloseButtonMixin, DateLabelMixin} from '../common';

function getCoverageLayer(options) {
    return L.tileLayer('https://mapserver.mapy.cz/panorama_hybrid-m/{z}-{x}-{y}', options);
}

async function getPanoramaAtPos(latlng, searchRadiusMeters) {
    const smap = await getSMap();
    const request = smap.Pano.getBest(smap.Coords.fromWGS84(latlng.lng, latlng.lat), searchRadiusMeters);
    try {
        return {
            found: true,
            data: await request,
        };
    } catch (e) {
        return {found: false};
    }
}

const Viewer = L.Evented.extend({
    includes: [CloseButtonMixin, DateLabelMixin],

    initialize: function(smap, container) {
        // Disable keyboard events for panorama as they  conflict with other hotkeys.
        const orig_windowAddEventListener = window.addEventListener;
        window.addEventListener = (function(type, ...args) {
            if (!/^key/u.test(type)) {
                orig_windowAddEventListener(type, ...args);
            }
        });
        this.panorama = new smap.Pano.Scene(container);
        window.addEventListener = orig_windowAddEventListener;
        this.createDateLabel(container);
        this.createCloseButton(container);
        window.addEventListener('resize', this.resize.bind(this));
    },

    showPano: function(data) {
        const yaw = this.panorama.getCamera().yaw;
        this.panorama.show(data, {yaw});
        this.panorama.setCamera({fov: 1.256637061});
        this.updatePositionAndView();
        this.updateDateLabel();
    },

    activate: function() {
        this._active = true;
        this.resize();
        if (!this._updateHandler) {
            this._updateHandler = setInterval(() => this.updatePositionAndView(), 200);
        }
    },

    deactivate: function() {
        this._active = false;
        if (this._updateHandler) {
            clearInterval(this._updateHandler);
            this._updateHandler = null;
        }
    },

    getState: function() {
        const camera = this.panorama.getCamera();
        const place = this.panorama.getPlace();
        if (!place) {
            return null;
        }
        const coords = place.getCoords().toWGS84();
        return [
            coords[1].toFixed(6),
            coords[0].toFixed(6),
            camera.yaw.toFixed(4),
            camera.pitch.toFixed(4),
            camera.fov.toFixed(4),
        ];
    },

    setState: function(state) {
        const lat = parseFloat(state[0]);
        const lng = parseFloat(state[1]);
        const yaw = parseFloat(state[2]);
        const pitch = parseFloat(state[3]);
        const fov = parseFloat(state[4]);
        if (!isNaN(lat) && !isNaN(lng) && !isNaN(yaw) && !isNaN(pitch) && !isNaN(fov)) {
            getPanoramaAtPos({lat, lng}, 0).then(({data, found}) => {
                if (found) {
                    this.panorama.show(data, {yaw, pitch, fov});
                    this.panorama.setCamera({yaw, pitch, fov});
                    this.updateDateLabel();
                }
            });
            return true;
        }
        return false;
    },

    resize: function() {
        this.panorama.syncPort();
    },

    updatePositionAndView: function() {
        const place = this.panorama.getPlace();
        if (!place) {
            return;
        }
        const coords = place.getCoords().toWGS84();
        const oldPosition = this._position;
        const oldHeading = this._heading;
        this._position = L.latLng(coords[1], coords[0]);
        this._heading = this.panorama.getCamera().yaw;
        const positionChanged = !oldPosition || !this._position.equals(oldPosition);
        const headingChanged = this._heading !== oldHeading;
        if (positionChanged) {
            this.updateDateLabel();
        }
        if (positionChanged || headingChanged) {
            this.fire('change', {
                latlng: this._position,
                heading: (this._heading * 180) / Math.PI,
            });
        }
    },

    updateDateLabel: function() {
        const place = this.panorama.getPlace();
        const timestamp = Date.parse(place.getDate());
        DateLabelMixin.updateDateLabel.call(this, timestamp);
    }
});

async function getViewer(container) {
    const smap = await getSMap();
    return new Viewer(smap, container);
}

export default {getCoverageLayer, getPanoramaAtPos, getViewer};
