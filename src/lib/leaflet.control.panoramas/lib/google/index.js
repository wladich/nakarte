import L from 'leaflet';
import getGoogle from '~/lib/googleMapsApi';
import {Events} from "../common";

function getCoverageLayer(options) {
    return L.tileLayer(
        'https://maps.googleapis.com/maps/vt?pb=!1m5!1m4!1i{z}!2i{x}!3i{y}!4i256!2m8!1e2!2ssvv!4m2!1scb_client!2sapiv3!4m2!1scc!2s*211m3*211e3*212b1*213e2*211m3*211e2*212b1*213e2!3m5!3sUS!12m1!1e40!12m1!1e18!4e0', // eslint-disable-line max-len
        options
    );
}

async function getStreetViewService() {
    const google = await getGoogle();
    return new google.maps.StreetViewService();
}

async function getPanoramaAtPos(latlng, searchRadiusMeters) {
    const google = await getGoogle();
    const service = await getStreetViewService();
    const {data, status} = await new Promise((resolve) => {
            service.getPanorama({
                    location: latlng,
                    radius: searchRadiusMeters,
                    preference: google.maps.StreetViewPreference.NEAREST
                }, (data, status) => resolve({data, status})
            );
        }
    );
    if (status === google.maps.StreetViewStatus.OK) {
        return {found: true, data};
    }
    return {found: false};
}

const Viewer = L.Evented.extend({
    initialize: function(google, container) {
        this.google = google;
        const panorama = this.panorama = new google.maps.StreetViewPanorama(container, {
                enableCloseButton: true,
                imageDateControl: true,
                motionTracking: false,
                motionTrackingControl: false,
            }
        );
        panorama.addListener('position_changed', () => this.onPanoramaPositionChanged());
        panorama.addListener('pov_changed', () => this.onPanoramaPovChanged());
        panorama.addListener('closeclick', () => this.onCloseClick());
        this.invalidateSize = L.Util.throttle(this._invalidateSize, 50, this);
        this._yawPitchZoomChangeTimer = null;
    },

    showPano: function(data) {
        this.panorama.setPosition(data.location.latLng);
        this.panorama.setZoom(1);
        const heading = this.panorama.getPov().heading;
        this.panorama.setPov({heading, pitch: 0});
    },

    onPanoramaPositionChanged: function() {
        if (!this._active) {
            return;
        }
        const pos = this.panorama.getPosition();
        this.fire(Events.ImageChange, {latlng: L.latLng(pos.lat(), pos.lng())});
    },

    onPanoramaPovChanged: function() {
        const pov = this.panorama.getPov();
        this.fire(Events.BearingChange, {bearing: pov.heading});
        if (this._yawPitchZoomChangeTimer !== null) {
            clearTimeout(this._yawPitchZoomChangeTimer);
            this._yawPitchZoomChangeTimer = null;
        }
        this._yawPitchZoomChangeTimer = setTimeout(() => {
            this.fire(Events.YawPitchZoomChangeEnd);
        }, 120);
    },

    onCloseClick: function() {
        this.fire('closeclick');
    },

    activate: function() {
        this._active = true;
        this.panorama.setVisible(true);
    },

    deactivate: function() {
        this._active = false;
        this.panorama.setVisible(false);
    },

    getState: function() {
        const pos = this.panorama.getPosition();
        const pov = this.panorama.getPov();
        if (pos && pov) {
            return [
                pos.lat().toFixed(6),
                pos.lng().toFixed(6),
                (pov.heading || 0).toFixed(1),
                (pov.pitch || 0).toFixed(1),
                (pov.zoom || 1).toFixed(1)
            ];
        }
        return null;
    },

    setState: function(state) {
        const lat = parseFloat(state[0]);
        const lng = parseFloat(state[1]);
        const heading = parseFloat(state[2]);
        const pitch = parseFloat(state[3]);
        const zoom = parseFloat(state[4]);
        if (!isNaN(lat) && !isNaN(lng) && !isNaN(heading) && !isNaN(pitch) && !isNaN(zoom)) {
            this.panorama.setPosition({lat, lng});
            this.panorama.setPov({heading, pitch, zoom});
            return true;
        }
        return false;
    },

    _invalidateSize: function() {
        this.google.maps.event.trigger(this.panorama, 'resize');
    }
});

async function getViewer(container) {
    const google = await getGoogle();
    return new Viewer(google, container);
}

const googleProvider = {getCoverageLayer, getPanoramaAtPos, getViewer};
export default googleProvider;
