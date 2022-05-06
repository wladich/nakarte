import L from 'leaflet';
import {getSMap} from './apiLoader';
import {CloseButtonMixin, DateLabelMixin, Events} from '../common';

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
        this.invalidateSize = L.Util.throttle(this._invalidateSize, 100, this);
        this._updateHandler = null;
        this._placeId = null;
        this._yaw = null;
        this._pitch = null;
        this._fov = null;
        this._yawPitchZoomChangeTimer = null;
    },

    showPano: function(place, yaw = null, pitch = 0, fov = 1.256637061) {
        if (yaw === null) {
            yaw = this.panorama.getCamera().yaw;
        }
        this.panorama.show(place, {yaw});
        this.panorama.setCamera({fov, pitch});
        if (!this._updateHandler) {
            this._updateHandler = setInterval(this.watchMapyStateChange.bind(this), 50);
        }
    },

    activate: function() {
        this.resize();
    },

    deactivate: function() {
        this._placeId = null;
        this._yaw = null;
        this._pitch = null;
        this._fov = null;
        clearInterval(this._updateHandler);
        this._updateHandler = null;
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
            getPanoramaAtPos({lat, lng}, 0).then(({data: place, found}) => {
                if (found) {
                    this.showPano(place, yaw, pitch, fov);
                }
            });
            return true;
        }
        return false;
    },

    resize: function() {
        this.panorama.syncPort();
    },

    watchMapyStateChange: function() {
        const place = this.panorama.getPlace();
        if (!place) {
            return;
        }
        const placeId = place.getId();
        if (this._placeId !== placeId) {
            this._placeId = placeId;
            const coords = place.getCoords().toWGS84();
            this.updateDateLabel();
            this.fire(Events.ImageChange, {latlng: L.latLng(coords[1], coords[0])});
        }
        const camera = this.panorama.getCamera();
        if (this._yaw !== camera.yaw || this._pitch !== camera.pitch || this._fov !== camera.fov) {
            if (this._yaw !== camera.yaw) {
                this.fire(Events.BearingChange, {bearing: (this._yaw * 180) / Math.PI});
            }
            this._yaw = camera.yaw;
            this._pitch = camera.pitch;
            this._fov = camera.fov;
            if (this._yawPitchZoomChangeTimer !== null) {
                clearTimeout(this._yawPitchZoomChangeTimer);
                this._yawPitchZoomChangeTimer = null;
            }
            this._yawPitchZoomChangeTimer = setTimeout(() => {
                this.fire(Events.YawPitchZoomChangeEnd);
            }, 120);
        }
    },

    updateDateLabel: function() {
        const place = this.panorama.getPlace();
        const timestamp = Date.parse(place.getDate());
        DateLabelMixin.updateDateLabel.call(this, timestamp);
    },

    _invalidateSize: function() {
        this.panorama.syncPort();
    }
});

async function getViewer(container) {
    const smap = await getSMap();
    return new Viewer(smap, container);
}

const mapyczProvider = {getCoverageLayer, getPanoramaAtPos, getViewer};
export default mapyczProvider;
