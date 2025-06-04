import L from 'leaflet';
import {fetch} from '~/lib/xhr-promise';
import config from '~/config';
import './style.css';
import {CloseButtonMixin, Events} from '../common';

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
            this.viewer = new mapillary.Viewer(
                {
                    container: id,
                    accessToken: config.mapillary4,
                    component: {cover: false, bearing: false, cache: true, zoom: false, trackResize: true},
                });
            this.createCloseButton(container);
            this.invalidateSize = L.Util.throttle(this._invalidateSize, 100, this);
            this._updateHandler = null;
            this._currentImage = null;
            this._zoom = null;
            this._centerX = null;
            this._centerY = null;
            this._bearing = null;
            this._yawPitchZoomChangeTimer = null;
        },

        showPano: function(imageId) {
            this.viewer.moveTo(imageId)
                .then(() => {
                    if (!this._updateHandler) {
                        this._updateHandler = setInterval(this.watchMapillaryStateChange.bind(this), 50);
                    }
                })
                .catch(() => {
                    // ignore error
                });
        },

        watchMapillaryStateChange: function() {
            Promise.all([
                this.viewer.getImage(),
                this.viewer.getCenter(),
                this.viewer.getZoom(),
                this.viewer.getBearing(),
            ]).then(([image, center, zoom, bearing]) => {
                if (this._currentImage?.id !== image.id) {
                    this._currentImage = image;
                    const lngLat = image.originalLngLat;
                    this.fire(Events.ImageChange, {latlng: L.latLng(lngLat.lat, lngLat.lng)});
                }
                const [centerX, centerY] = center;
                if (centerX !== this._centerX || centerY !== this._centerY || zoom !== this._zoom) {
                    this._zoom = zoom;
                    this._centerX = centerX;
                    this._centerY = centerY;
                    if (this._yawPitchZoomChangeTimer !== null) {
                        clearTimeout(this._yawPitchZoomChangeTimer);
                        this._yawPitchZoomChangeTimer = null;
                    }
                    this._yawPitchZoomChangeTimer = setTimeout(() => {
                        this.fire(Events.YawPitchZoomChangeEnd);
                    }, 120);
                }
                bearing -= this.getBearingCorrection();
                if (bearing !== this._bearing) {
                    this._bearing = bearing;
                    this.fire(Events.BearingChange, {bearing: bearing});
                }
            }).catch(() => {
                // ignore error
            });
        },

        getBearingCorrection: function() {
            if (this._currentImage && 'computedCompassAngle' in this._currentImage) {
                return (this._currentImage.computedCompassAngle - this._currentImage.originalCompassAngle);
            }
            return 0;
        },

        deactivate: function() {
            this._currentImage = null;
            this._bearing = null;
            this._zoom = null;
            this._centerX = null;
            this._centerY = null;
            clearInterval(this._updateHandler);
            this._updateHandler = null;
            this.viewer.setCenter([0.5, 0.5]);
            this.viewer.setZoom(0);
        },

        activate: function() {
            this.viewer.resize();
        },

        getState: function() {
            if (
                this._currentImage === null ||
                this._zoom === null ||
                this._centerX === null ||
                this._centerY === null
            ) {
                return [];
            }
            return [
                this._currentImage.id,
                this._centerX.toFixed(6),
                this._centerY.toFixed(6),
                this._zoom.toFixed(2)
            ];
        },

        setState: function(state) {
            const imageId = state[0];
            const center0 = parseFloat(state[1]);
            const center1 = parseFloat(state[2]);
            const zoom = parseFloat(state[3]);
            if (imageId && !isNaN(center0) && !isNaN(center1) && !isNaN(zoom)) {
                this.showPano(imageId);
                this.viewer.setCenter([center0, center1]);
                this.viewer.setZoom(zoom);
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
