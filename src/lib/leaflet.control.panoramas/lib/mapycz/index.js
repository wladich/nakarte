import L from 'leaflet';

import config from '~/config';

import {getPanorama} from './apiLoader';
import {CloseButtonMixin, Events} from '../common';

function getCoverageLayer(options) {
    return L.tileLayer('https://proxy.nakarte.me/mapy/panorama_ln_hybrid-m/{z}-{x}-{y}', options);
}

async function getPanoramaAtPos(latlng, searchRadiusMeters) {
    const panoramaClass = await getPanorama();
    const res = await panoramaClass.panoramaExists({
        lon: latlng.lng,
        lat: latlng.lat,
        radius: searchRadiusMeters,
        apiKey: config.mapyCzKey,
    });
    return {
        found: res.exists,
        data: res.info,
    };
}

const MapyPanoramaWrapper = L.Evented.extend({
    initialize: function (mapyPanorama, container, apiKey) {
        this.apiKey = apiKey;
        this.container = L.DomUtil.create('div', null, container);
        this.container.style.height = '100%';
        this.mapyPanorama = mapyPanorama;
        this.viewerControl = null;
        this.position = null;
        this.pov = null;
    },

    deactivate: function () {
        this.reset();
        this.position = null;
        this.pov = null;
    },
    showPano: async function (position, pov) {
        this.reset();
        this.position = null;
        // Disable keyboard events for panorama as they  conflict with other hotkeys.
        const origWindowAddEventListener = window.addEventListener;
        window.addEventListener = function (type, ...args) {
            if (!/^key/u.test(type)) {
                origWindowAddEventListener(type, ...args);
            }
        };
        let res;
        try {
            res = await this.mapyPanorama.panoramaFromPosition({
                parent: this.container,
                ...position,
                ...(pov ?? this.pov ?? {yaw: 'auto'}),
                radius: 0.01,
                showNavigation: true,
                apiKey: this.apiKey,
                lang: 'en',
            });
        } finally {
            window.addEventListener = origWindowAddEventListener; // eslint-disable-line require-atomic-updates
        }
        if (res.error) {
            return;
        }
        this.viewerControl = res;
        this.onPositionChange(res);
        const loadedPanoPov = res.getCamera();
        this.onPOVChange(loadedPanoPov);
        this.viewerControl.addListener('pano-view', this.onPOVChange.bind(this));
        this.viewerControl.addListener('pano-place', this.onPositionChange.bind(this));
    },

    reset: function () {
        if (this.viewerControl) {
            this.viewerControl.destroy();
            this.viewerControl = null;
        }
    },

    onPOVChange: function (pov) {
        this.pov = pov;
        this.notifyViewChanged(pov);
    },

    onPositionChange: function (e) {
        this.position = e.info;
        this.notifyPositionChanged(e.info);
    },

    notifyPositionChanged: function (position) {
        this.fire('position-change', position);
    },

    notifyViewChanged: function (pov) {
        this.fire('view-change', pov);
    },

    getPanoramaCoords: function () {
        return this.position;
    },

    getPov: function () {
        if (this.viewerControl === null) {
            return null;
        }
        return this.viewerControl.getCamera();
    },
});

const Viewer = L.Evented.extend({
    includes: [CloseButtonMixin],

    initialize: function (mapyPanorama, container) {
        this.mapyPanoramaWrapper = new MapyPanoramaWrapper(mapyPanorama, container, config.mapyCzKey);
        this.createCloseButton(container);
        this.mapyPanoramaWrapper.on('position-change', this.onPanoramaPositionChanged, this);
        this.mapyPanoramaWrapper.on('view-change', this.onPanoramaPovChanged, this);
        this.povChangeTimer = null;
    },

    showPano: function (place, pov) {
        this.mapyPanoramaWrapper.showPano(place, pov);
    },

    activate: function () {
        // no action needed
    },

    deactivate: function () {
        this.mapyPanoramaWrapper.reset();
    },

    getState: function () {
        const coords = this.mapyPanoramaWrapper.getPanoramaCoords();
        const pov = this.mapyPanoramaWrapper.getPov();
        if (coords === null || pov === null) {
            return null;
        }
        return [
            coords.lat.toFixed(6),
            coords.lon.toFixed(6),
            pov.yaw.toFixed(4),
            pov.pitch.toFixed(4),
            pov.fov.toFixed(4),
        ];
    },

    setState: function (state) {
        const lat = parseFloat(state[0]);
        const lng = parseFloat(state[1]);
        const yaw = parseFloat(state[2]);
        const pitch = parseFloat(state[3]);
        const fov = parseFloat(state[4]);
        if (isNaN(lat) || isNaN(lng) || isNaN(yaw) || isNaN(pitch) || isNaN(fov)) {
            return false;
        }
        this.showPano({lat, lon: lng}, {yaw, pitch, fov});
        return true;
    },

    onPanoramaPositionChanged: function (position) {
        this.fire(Events.ImageChange, {latlng: L.latLng(position.lat, position.lon)});
    },

    onPanoramaPovChanged: function (pov) {
        this.fire(Events.BearingChange, {bearing: (pov.yaw * 180) / Math.PI});
        if (this.povChangeTimer !== null) {
            clearTimeout(this.povChangeTimer);
            this.povChangeTimer = null;
        }
        this.povChangeTimer = setTimeout(() => {
            this.povChangeTimer = null;
            this.fire(Events.YawPitchZoomChangeEnd);
        }, 120);
    },

    invalidateSize: function () {
        // no action needed
    },
});

async function getViewer(container) {
    const mapyPanorama = await getPanorama();
    return new Viewer(mapyPanorama, container);
}

const mapyczProvider = {getCoverageLayer, getPanoramaAtPos, getViewer};
export default mapyczProvider;
