import L from 'leaflet';
import {fetch} from '~/lib/xhr-promise';

import {decodeTile} from './decoder';
import './style.css';

const ElevationTile = L.Evented.extend({
    statics: {
        STATUS_LOADING: 'LOADING',
        STATUS_ERROR: 'ERROR',
        STATUS_NO_DATA: 'ND',
        STATUS_OK: 'OK',
    },
    options: {
        noData: -1024,
        maxDataZoom: 12,
        dataWidth: 129,
    },

    initialize: function (nativeZoom) {
        this.zoom = nativeZoom;
        this.loaded = false;
        this.error = null;
        this.elevations = null;
    },

    load: function (url, done) {
        this._loadPromise = fetch(url, {
            responseType: 'arraybuffer',
            isResponseSuccess: (xhr) => [200, 404].includes(xhr.status),
        });
        this._loadPromise.then(this.onLoad.bind(this), this.onLoadError.bind(this));
    },

    onLoadError: function () {
        this.loaded = true;
        this.error = true;
        this.fire('error');
    },

    onLoad: function (xhr) {
        if (xhr.status !== 404) {
            const elevations = decodeTile(xhr.response, this.options.dataWidth);
            let scale = 2 ** (this.options.maxDataZoom - this.zoom);
            scale = Math.min(scale, 16);
            if (scale > 1) {
                for (let i = 0; i < elevations.length; i++) {
                    elevations[i] *= scale;
                }
            }
            this.elevations = elevations;
        }
        this.fire('load');
        this.loaded = true;
    },

    getElevation: function (p) {
        const status = this.getStatus();
        const result = {status};
        if (status !== ElevationTile.STATUS_OK) {
            return result;
        }
        const dataWidth = this.options.dataWidth;
        p = p.multiplyBy(dataWidth - 1);
        p.x = Math.max(Math.min(p.x, dataWidth), 0);
        p.y = Math.max(Math.min(p.y, dataWidth), 0);
        const x = Math.floor(p.x);
        const y = Math.floor(p.y);
        const dx = p.x - x;
        const dy = p.y - y;
        const v1 = this.elevations[y * dataWidth + x];
        const v2 = this.elevations[y * dataWidth + x + 1];
        const v3 = this.elevations[(y + 1) * dataWidth + x];
        const v4 = this.elevations[(y + 1) * dataWidth + x + 1];
        if ([v1, v2, v3, v4].includes(this.options.noData)) {
            result.status = ElevationTile.STATUS_NO_DATA;
            return result;
        }
        const elevation = v1 * (1 - dx) * (1 - dy) + v2 * dx * (1 - dy) + v3 * (1 - dx) * dy + v4 * dx * dy;
        result.elevation = Math.round(elevation);
        return result;
    },

    getStatus: function () {
        if (!this.loaded) {
            return ElevationTile.STATUS_LOADING;
        }
        if (this.error) {
            return ElevationTile.STATUS_ERROR;
        }
        if (!this.elevations) {
            return ElevationTile.STATUS_NO_DATA;
        }
        return ElevationTile.STATUS_OK;
    },
});

const ElevationLayer = L.TileLayer.extend({
    options: {
        tileSize: 512,
        zoomOffset: -1,
        maxNativeZoom: 12,
    },

    initialize: function (url, options) {
        L.TileLayer.prototype.initialize.call(this, url, options);
        this.label = L.tooltip(
            {
                direction: 'bottom',
                className: 'elevation-display-label',
                offset: [0, 4],
            },
            null
        );
    },

    createTile: function (coords, done) {
        const dummyElement = L.DomUtil.create('div');
        const url = this.getTileUrl(coords);
        const tile = new ElevationTile(this._getZoomForUrl());
        L.DomEvent.on(tile, 'load', L.bind(this._tileOnLoad, this, done, tile));
        L.DomEvent.on(tile, 'error', L.bind(this._tileOnError, this, done, tile));

        tile.load(url);
        dummyElement._elevationTile = tile;
        return dummyElement;
    },

    onAdd: function (map) {
        L.TileLayer.prototype.onAdd.call(this, map);
        this.setupEvents(true);
        this.resetMousePos();
    },

    onRemove: function (map) {
        this.setupEvents(false);
        map.removeLayer(this.label);
        L.TileLayer.prototype.onRemove.call(this, map);
    },

    setupEvents: function (on) {
        const func = on ? 'on' : 'off';
        this._map[func](
            {
                mousemove: this.onMouseMove,
                zoomstart: this.onZoom,
                zoomend: this.onZoom,
                zoom: this.onZoom,
                mouseout: this.onMouseOut,
            },
            this
        );
        this[func]('tileload tileerror', this.onDataUpdate, this);
    },

    updateMousePos: function (latlng) {
        this.mousePos = latlng;
        this.updateDisplay();
    },

    onMouseOut: function (e) {
        console.log('OUT');
    },

    onZoom: function (e) {
        // this.resetMousePos();
        console.log(e)
        this.updateDisplay();
    },

    onMouseMove: function (e) {
        this.updateMousePos(e.latlng);
    },

    resetMousePos: function () {
        this.updateMousePos(null);
    },

    updateDisplay() {
        const latlng = this.mousePos;
        if (latlng) {
            this.label.setLatLng(latlng);
            this.label.setContent(this.getElevation(latlng));
            this.label.addTo(this._map);
        } else {
            this._map.removeLayer(this.label);
        }
    },

    onDataUpdate: function () {
        this.updateDisplay();
        this.fire('load');
    },

    getElevation(latlng) {
        const p = this._map.project(latlng);
        const tileSize = this.getTileSize();
        const tileCoords = p.unscaleBy(tileSize).floor();
        tileCoords.z = this._tileZoom;
        const cacheKey = this._tileCoordsToKey(tileCoords);
        const tileWrapper = this._tiles[cacheKey];
        if (!tileWrapper) {
            return '[Loading]';
        }
        const localCoords = p.subtract(tileCoords.scaleBy(tileSize)).unscaleBy(tileSize);
        const tile = tileWrapper.el._elevationTile;
        const elevationResult = tile.getElevation(localCoords);
        if (elevationResult.status === ElevationTile.STATUS_OK) {
            return String(elevationResult.elevation);
        } else {
            return elevationResult.status;
        }
    },
});

export {ElevationLayer};
