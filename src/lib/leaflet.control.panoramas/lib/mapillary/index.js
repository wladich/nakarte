import L from 'leaflet';
import {MapillaryCoverage} from './mapillary-coverage-layer';
import {fetch} from '~/lib/xhr-promise';
import config from '~/config';
import './style.css';
import {CloseButtonMixin, DateLabelMixin} from '../common';

function getCoverageLayer(options) {
    return new MapillaryCoverage(options);
}

function getMapillary() {
    return new Promise((resolve) => {
        require.ensure(['mapillary-js/dist/mapillary.min.js', 'mapillary-js/dist/mapillary.min.css'], () => {
            require('mapillary-js/dist/mapillary.min.css');
            resolve(require('mapillary-js/dist/mapillary.min.js'));
        }, 'mapillary');
    });
}

async function getPanoramaAtPos(latlng, searchRadiusMeters) {
    const url = `https://a.mapillary.com/v3/images?` +
        `client_id=${config.mapillary}&closeto=${latlng.lng},${latlng.lat}&radius=${searchRadiusMeters}`;
    const resp = await fetch(url, {responseType: 'json', timeout: 10000});
    if (resp.status === 200 && resp.responseJSON.features.length) {
        return {found: true, data: resp.responseJSON.features[0].properties.key};
    }
    return {found: false};
}

const Viewer = L.Evented.extend({
        includes: [CloseButtonMixin, DateLabelMixin],

        initialize: function(mapillary, container) {
            const id = `container-${L.stamp(container)}`;
            container.id = id;
            const viewer = this.viewer = new mapillary.Viewer(
                {
                    container: id,
                    apiClient: config.mapillary,
                    component: {cover: false, bearing: false}
                });
            window.addEventListener('resize', function() {
                    viewer.resize();
                }
            );
            viewer.on('nodechanged', this.onNodeChanged.bind(this));
            this.createDateLabel(container);
            this.createCloseButton(container);
            this._bearing = 0;
            this._zoom = 0;
            this._center = [0, 0];
            this.invalidateSize = L.Util.throttle(this._invalidateSize, 100, this);
        },

        showPano: function(data) {
            this.deactivate();
            this.activate();
            this.viewer.moveToKey(data).then(() => {
                this.viewer.setZoom(0);
                this.updateZoomAndCenter();
            });
        },

        onNodeChanged: function(node) {
            if (this._node && (node.key === this._node.key)) {
                return;
            }
            this._node = node;
            this.fireChangeEvent();
            this.updateDateLabel(node.capturedAt);
        },

        getBearingCorrection: function() {
            if (this._node && 'computedCA' in this._node) {
                return (this._node.computedCA - this._node.originalCA);
            }
            return 0;
        },

        fireChangeEvent: function() {
            if (this._node) {
                const latlon = this._node.originalLatLon;
                this.fire('change', {
                        latlng: L.latLng(latlon.lat, latlon.lon),
                        heading: this._bearing,
                        pitch: this._pitch,
                        zoom: this._zoom
                    }
                );
            }
        },

        deactivate: function() {
            this.viewer.activateCover();
            if (this._updateHandler) {
                clearInterval(this._updateHandler);
                this._updateHandler = null;
            }
        },

        updateZoomAndCenter: function() {
            this.viewer.getZoom().then((zoom) => {
                if (zoom !== this._zoom) {
                    this._zoom = zoom;
                    this.fireChangeEvent();
                }
            });
            this.viewer.getCenter().then((center) => {
                if (center[0] < 0 || center[0] > 1 || center[1] < 0 || center[1] > 1) {
                    center = [0.5, 0.5];
                }
                if (center[0] !== this._center[0] || center[1] !== this._center[1]) {
                    this._center = center;
                    this.fireChangeEvent();
                }
            });
            this.viewer.getBearing().then((bearing) => {
                bearing -= this.getBearingCorrection();
                if (this._bearing !== bearing) {
                    this._bearing = bearing;
                    this.fireChangeEvent();
                }
            });
        },

        activate: function() {
            this.viewer.resize();
            this.viewer.deactivateCover();
            if (!this._updateHandler) {
                this._updateHandler = setInterval(() => this.updateZoomAndCenter(), 200);
            }
        },

        getState: function() {
            if (!this._node) {
                return [];
            }
            const {lat, lon} = this._node.originalLatLon;
            return [
                lat.toFixed(6),
                lon.toFixed(6),
                this._center[0].toFixed(4),
                this._center[1].toFixed(4),
                this._zoom.toFixed(2)
            ];
        },

        setState: function(state) {
            const lat = parseFloat(state[0]);
            const lng = parseFloat(state[1]);
            const center0 = parseFloat(state[2]);
            const center1 = parseFloat(state[3]);
            const zoom = parseFloat(state[4]);
            if (!isNaN(lat) && !isNaN(lng) && !isNaN(center0) && !isNaN(center1) && !isNaN(zoom)) {
                getPanoramaAtPos(L.latLng(lat, lng), 0.01).then((res) => {
                    if (res.found) {
                        this.viewer.moveToKey(res.data);
                        this.viewer.setCenter([center0, center1]);
                        this.viewer.setZoom(zoom);
                    }
                });
                return true;
            }
            return false;
        },

        _invalidateSize: function() {
            this.viewer.resize();
        }
    }
);

async function getViewer(container) {
    const mapillary = await getMapillary();
    return new Viewer(mapillary, container);
}

const mapillaryProvider = {getCoverageLayer, getPanoramaAtPos, getViewer};
export default mapillaryProvider;
