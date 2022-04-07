import L from 'leaflet';
import {fetch} from '~/lib/xhr-promise';
import config from '~/config';
import './style.css';
import {CloseButtonMixin, DateLabelMixin} from '../common';

function getCoverageLayer(options) {
    return L.tileLayer(config.mapillaryRasterTilesUrl, L.extend({
        tileSize: 1024,
        zoomOffset: -2,
        minNativeZoom: 0,
    }, options));
}

async function getMapillary() {
    const [mapillary] = await Promise.all([
        import(
            /* webpackChunkName: "mapillary" */
            'mapillary-js'
            ),
        import(
            /* webpackChunkName: "mapillary" */
            'mapillary-js/dist/mapillary.css'
            ),
    ]);
    return mapillary;
}
async function getPanoramaAtPos(latlng, searchRadiusMeters) {
    function radiusToBbox(latlng, radiusInMeters) {
        const center = L.CRS.EPSG3857.project(latlng);
        const metersPerMapUnit = L.CRS.EPSG3857.unproject(L.point(center.x, center.y + 1)).distanceTo(latlng);
        const radiusInMapUnits = radiusInMeters / metersPerMapUnit;
        return L.latLngBounds(
            L.CRS.EPSG3857.unproject(L.point(center.x - radiusInMapUnits, center.y - radiusInMapUnits)),
            L.CRS.EPSG3857.unproject(L.point(center.x + radiusInMapUnits, center.y + radiusInMapUnits))
        );
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

    const searchBbox = radiusToBbox(latlng, searchRadiusMeters);
    const precision = 6;
    const searchBboxStr = [
        searchBbox.getWest().toFixed(precision),
        searchBbox.getSouth().toFixed(precision),
        searchBbox.getEast().toFixed(precision),
        searchBbox.getNorth().toFixed(precision),
    ].join(',');
    const url = `https://graph.mapillary.com/images?access_token=${config.mapillary4}&bbox=${searchBboxStr}&limit=100`;
    const resp = await fetch(url, {responseType: 'json', timeout: 20000});
    if (resp.responseJSON.data.length) {
        const points = resp.responseJSON.data.map((it) => ({
            id: it.id,
            lat: it.geometry.coordinates[1],
            lng: it.geometry.coordinates[0],
        }));
        points.sort((p1, p2) => isCloser(latlng, p1, p2));
        return {found: true, data: points[0].id};
    }
    return {found: false};
}

const Viewer = L.Evented.extend({
        includes: [CloseButtonMixin],

        initialize: function(mapillary, container) {
            const id = `container-${L.stamp(container)}`;
            container.id = id;
            const viewer = this.viewer = new mapillary.Viewer(
                {
                    container: id,
                    accessToken: config.mapillary4,
                    component: {cover: false, bearing: false, cache: false}
                });
            viewer.on('image', this.onNodeChanged.bind(this));
            this.createCloseButton(container);
            this._bearing = 0;
            this._zoom = 0;
            this._center = [0, 0];
            this.invalidateSize = L.Util.throttle(this._invalidateSize, 100, this);
        },

        showPano: function(data) {
            this.deactivate();
            this.activate();
            this.viewer.moveTo(data).then(() => {
                this.viewer.setZoom(0);
                this.updateZoomAndCenter();
            });
        },

        onNodeChanged: function(event) {
            if (this.currentImage && (event.image.id === this.currentImage.id)) {
                return;
            }
            this.currentImage = event.image;
            this.fireChangeEvent();
        },

        getBearingCorrection: function() {
            if (this.currentImage && 'computedCompassAngle' in this.currentImage) {
                return (this.currentImage.computedCompassAngle - this.currentImage.originalCompassAngle);
            }
            return 0;
        },

        fireChangeEvent: function() {
            if (this.currentImage) {
                const lnglat = this.currentImage.originalLngLat;
                this.fire('change', {
                        latlng: L.latLng(lnglat.lat, lnglat.lng),
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
            if (!this.currentImage) {
                return [];
            }
            const {lat, lng} = this.currentImage.originalLngLat;
            return [
                lat.toFixed(6),
                lng.toFixed(6),
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
                        this.viewer.moveTo(res.data);
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
