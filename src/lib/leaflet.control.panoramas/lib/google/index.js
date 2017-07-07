import L from 'leaflet';
import getGoogle from 'lib/googleMapsApi';


function getCoverageLayer(options) {
    return L.tileLayer(
        'https://maps.googleapis.com/maps/vt?pb=!1m5!1m4!1i{z}!2i{x}!3i{y}!4i256!2m8!1e2!2ssvv!4m2!1scb_client!2sapiv3!4m2!1scc!2s*211m3*211e3*212b1*213e2*211m3*211e2*212b1*213e2!3m5!3sUS!12m1!1e40!12m1!1e18!4e0',
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
            )
        }
    );
    if (status === google.maps.StreetViewStatus.OK) {
        return {found: true, data};
    } else {
        return {found: false};
    }
}


const Viewer = L.Evented.extend({
    initialize: function(google, container) {
        const panorama = this.panorama = new google.maps.StreetViewPanorama(container, {
                enableCloseButton: true,
                imageDateControl: true
            }
        );
        panorama.addListener('position_changed', () => this.onPanoramaChangeView());
        panorama.addListener('pov_changed', () => this.onPanoramaChangeView());
        panorama.addListener('closeclick', () => this.onCloseClick());
    },

    showPano: function(data) {
        this.panorama.setPosition(data.location.latLng);
        this.panorama.setZoom(1);
    },

    onPanoramaChangeView: function() {
        if (!this._active) {
            return;
        }
        let pos = this.panorama.getPosition();
        pos = L.latLng(pos.lat(), pos.lng());
        const pov = this.panorama.getPov();
        this.fire('change', {latlng: pos, heading: pov.heading, zoom: pov.zoom, pitch: pov.pitch});
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
            return [pos.lat().toFixed(6), pos.lng().toFixed(6),
                (pov.heading || 0).toFixed(1), (pov.pitch || 0).toFixed(1), (pov.zoom || 1).toFixed(1)];
        } else {
            return null;
        }
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

    }
});

async function getViewer(container) {
    const google = await getGoogle();
    return new Viewer(google, container)
}


export default {getCoverageLayer, getPanoramaAtPos, getViewer};