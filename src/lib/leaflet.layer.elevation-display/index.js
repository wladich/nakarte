import L from 'leaflet';

import {fetch} from '~/lib/xhr-promise';

import './style.css';

class DataTileStatus {
    static STATUS_LOADING = 'LOADING';
    static STATUS_ERROR = 'ERROR';
    static STATUS_NO_DATA = 'ND';
    static STATUS_OK = 'OK';
}

const radToDeg = 180 / Math.PI;
const degToRad = 1 / radToDeg;

function decodeElevations(arrBuf) {
    const array = new Int16Array(arrBuf);
    for (let i = 1; i < array.length; i++) {
        array[i] += array[i - 1];
    }
    return array;
}

function mod(x, n) {
    return ((x % n) + n) % n;
}

const ElevationLayer = L.TileLayer.extend({
    options: {
        maxNativeZoom: 11,
        noDataValue: -512,
    },

    initialize: function (url, options) {
        L.TileLayer.prototype.initialize.call(this, url, options);
        this.label = L.tooltip(
            {
                direction: 'bottom',
                className: 'elevation-display-label',
                offset: [0, 6],
            },
            null
        );
        this.displayElevation = true;
    },

    enableElevationDisplay: function (enable) {
        this.displayElevation = enable;
        if (!this._map) {
            return;
        }
        if (enable) {
            this.setupEvents(true);
        } else {
            this._map.removeLayer(this.label);
            this.setupEvents(false);
        }
    },

    onAdd: function (map) {
        L.TileLayer.prototype.onAdd.call(this, map);
        this.enableElevationDisplay(this.displayElevation);
    },

    onRemove: function (map) {
        this.setupEvents(false);
        map.removeLayer(this.label);
        L.TileLayer.prototype.onRemove.call(this, map);
    },

    setupEvents: function (on) {
        const eventFunc = on ? 'on' : 'off';

        this[eventFunc](
            {
                tileunload: this.onTileUnload,
                tileload: this.onTileLoad,
            },
            this
        );
        this._map[eventFunc](
            {
                mousemove: this.onMouseMove,
                mouseover: this.onMouseMove,
                mouseout: this.onMouseOut,
                zoomend: this.onZoomEnd,
            },
            this
        );
    },

    onTileLoad: function () {
        if (this._mousePos) {
            this.updateElevationDisplay(this._map.layerPointToLatLng(this._mousePos));
        }
    },

    onTileUnload: function (ev) {
        ev.tile._data.request.abort();
        delete ev.tile._data;
    },

    createTile: function (coords, done) {
        const tile = L.DomUtil.create('div');
        tile._data = {};
        tile._data.status = DataTileStatus.STATUS_LOADING;
        tile._data.request = fetch(this.getTileUrl(coords), {
            responseType: 'arraybuffer',
            isResponseSuccess: (xhr) => [200, 404].includes(xhr.status),
        });
        tile._data.request.then(
            (xhr) => this.onDataLoad(xhr, tile, done),
            (error) => this.onDataLoadError(tile, done, error)
        );
        return tile;
    },

    onDataLoad: function (xhr, tile, done) {
        if (xhr.status === 200) {
            tile._data.elevations = decodeElevations(xhr.response);
            tile._data.status = DataTileStatus.STATUS_OK;
        } else {
            tile._data.status = DataTileStatus.STATUS_NO_DATA;
        }
        done(null, tile);
    },

    onDataLoadError: function (tile, done, error) {
        done(error, done);
        tile._data.status = DataTileStatus.STATUS_ERROR;
    },

    getElevationAtLayerPoint: function (layerPoint) {
        const tileSize = this.getTileSize();
        const coordsScale = tileSize.x / this.options.tileSize;
        const tileCoords = {
            x: Math.floor(layerPoint.x / tileSize.x),
            y: Math.floor(layerPoint.y / tileSize.y),
            z: this._map.getZoom(),
        };
        const tileKey = this._tileCoordsToKey(tileCoords);
        const tile = this._tiles[tileKey];
        if (!tile) {
            return {ready: false};
        }
        const tileData = tile.el._data;
        if (tileData.status === DataTileStatus.STATUS_LOADING) {
            return {ready: false};
        }
        if (tileData.status === DataTileStatus.STATUS_ERROR) {
            return {
                ready: true,
                error: true,
            };
        }
        if (tileData.status === DataTileStatus.STATUS_NO_DATA) {
            return {ready: true, elevation: null};
        }
        const dataCoords = {
            x: Math.floor(mod(layerPoint.x, tileSize.x) / coordsScale),
            y: Math.floor(mod(layerPoint.y, tileSize.y) / coordsScale),
        };
        let elevation = tileData.elevations[dataCoords.y * this.options.tileSize + dataCoords.x];
        if (elevation === this.options.noDataValue) {
            elevation = null;
        }
        return {ready: true, elevation};
    },

    bilinearInterpolate: function (values, dx, dy) {
        const [v1, v2, v3, v4] = values;
        const q1 = v1 * (1 - dx) + v2 * dx;
        const q2 = v3 * (1 - dx) + v4 * dx;
        return q1 * (1 - dy) + q2 * dy;
    },

    bilinearGradient: function (values, dx, dy) {
        const [v1, v2, v3, v4] = values;
        return {
            gradX: (v2 - v1) * (1 - dy) + (v4 - v3) * dy,
            gradY: (v3 - v1) * (1 - dx) + (v4 - v2) * dx,
        };
    },

    getElevation: function (latlng) {
        const zoom = this._tileZoom;

        let layerPoint = this._map.latLngToLayerPoint(latlng).add(this._map.getPixelOrigin());
        if (zoom <= this.options.maxNativeZoom) {
            return this.getElevationAtLayerPoint(layerPoint);
        }

        const tileSize = this.getTileSize();
        const coordsScale = tileSize.x / this.options.tileSize;
        layerPoint = layerPoint.subtract([coordsScale / 2, coordsScale / 2]);
        const elevations = [];
        for (const [dx, dy] of [
            [0, 0],
            [1, 0],
            [0, 1],
            [1, 1],
        ]) {
            const res = this.getElevationAtLayerPoint(layerPoint.add([dx * coordsScale, dy * coordsScale]));
            if (!res.ready || res.error || res.elevation === null) {
                return res;
            }
            elevations.push(res.elevation);
        }
        const dx = (mod(layerPoint.x, tileSize.x) / coordsScale) % 1;
        const dy = (mod(layerPoint.y, tileSize.y) / coordsScale) % 1;
        const {gradX, gradY} = this.bilinearGradient(elevations, dx, dy);
        const slopeAzimuth = Math.atan2(-gradY, -gradX) * radToDeg + 90;
        // prettier-ignore
        const cellSizeInMeters = (
            2 * Math.PI * L.Projection.SphericalMercator.R / // Earth equator length
            (2 ** zoom  * this.options.tileSize / coordsScale) * // number of pixels on actual data zoom level
            Math.cos(latlng.lat * degToRad) // account for latitude
        );
        const slopeGradient = Math.sqrt(gradX * gradX + gradY * gradY) / cellSizeInMeters;
        const slopeAngle = Math.atan(slopeGradient) * radToDeg;

        return {
            ready: true,
            elevation: Math.round(this.bilinearInterpolate(elevations, dx, dy)),
            slopeAzimuth,
            slopeAngle,
        };
    },

    onMouseMove: function (e) {
        this._mousePos = this._map.latLngToLayerPoint(e.latlng);
        this.label.setLatLng(e.latlng);
        this.label.addTo(this._map);
        this.updateElevationDisplay(e.latlng);
    },

    onMouseOut: function () {
        this._map.removeLayer(this.label);
    },

    onZoomEnd: function () {
        if (this._mousePos) {
            const latlng = this._map.layerPointToLatLng(this._mousePos);
            this.label.setLatLng(latlng);
            this.updateElevationDisplay(latlng);
        }
    },

    updateElevationDisplay: function (latlng) {
        setTimeout(() => this.label.setContent(this.getElevationText(latlng)), 0);
    },

    getElevationText: function (latlng) {
        const elevationResult = this.getElevation(latlng);
        if (!elevationResult.ready) {
            return 'Loading...';
        }
        if (elevationResult.error) {
            return 'Error';
        }
        if (elevationResult.elevation === null) {
            return 'No data';
        }
        const {elevation, slopeAzimuth, slopeAngle} = elevationResult;
        let text = `${elevation} m`;
        // if not null or undefined
        // eslint-disable-next-line no-eq-null,eqeqeq
        if (slopeAzimuth != null) {
            let directionChar = '<div class="arrow">●</div>';
            if (slopeAngle > 1) {
                directionChar = `<div class="arrow" style="rotate: ${slopeAzimuth + 180}deg">↧</div>`;
            }
            text += `<br>${directionChar} &ang; ${Math.round(slopeAngle)}&deg;`;
        }
        return text;
    },
});

export {ElevationLayer};
