import L from 'leaflet';
import {TiledDataLoader} from '~/lib/tiled-data-loader';

const MultiLayer = L.Layer.extend({
    initialize: function(layers) {
        this.layers = layers;
    },

    setLayersVisibility: function(e) {
        if (!this._map) {
            return;
        }

        let newZoom;
        if (e && e.zoom !== undefined) {
            newZoom = e.zoom;
        } else {
            newZoom = this._map.getZoom();
        }

        for (let layer of this.layers) {
            if (layer.minZoom <= newZoom && newZoom <= layer.maxZoom) {
                this._map.addLayer(layer.layer);
            } else {
                this._map.removeLayer(layer.layer);
            }
        }
    },

    onAdd: function(map) {
        this._map = map;
        this.setLayersVisibility();
        map.on('zoomend', this.setLayersVisibility, this);
    },

    onRemove: function() {
        for (let layer of this.layers) {
            this._map.removeLayer(layer.layer);
        }
        this._map.off('zoomend', this.setLayersVisibility, this);
        this._map.off('zoomanim', this.setLayersVisibility, this);
        this._map = null;
    }

});

class WikimediaLoader extends TiledDataLoader {
    constructor(urlTemplate, zoom) {
        super();
        this.url = urlTemplate;
        this.maxZoom = zoom;
    }

    getTileUrl(coords) {
        const data = {
            x: coords.x,
            z: coords.z,
            y: 2 ** coords.z - 1 - coords.y
        };
        return L.Util.template(this.url, data);
    }

    layerTileToDataTileCoords(layerTileCoords) {
        let z = layerTileCoords.z;
        let z2 = null;
        if (z > this.maxZoom) {
            z2 = this.maxZoom;
        } else {
            return {z, x: layerTileCoords.x, y: layerTileCoords.y};
        }

        let multiplier = 1 << (z - z2);
        return {
            x: Math.floor(layerTileCoords.x / multiplier),
            y: Math.floor(layerTileCoords.y / multiplier),
            z: z2
        };
    }

    makeRequestData(dataTileCoords) {
        return {
            url: this.getTileUrl(dataTileCoords),
            options: {
                responseType: 'arraybuffer',
                timeout: 10000,
                isResponseSuccess: (xhr) => xhr.status === 200 || xhr.status === 404
            }
        };
    }

    async processResponse(xhr, originalDataTileCoords) {
        let tileData;
        if (originalDataTileCoords.z >= this.maxZoom && xhr.status === 200 && xhr.response) {
            tileData = new Uint16Array(xhr.response);
        } else {
            tileData = null;
        }

        return {
            tileData,
            coords: originalDataTileCoords
        };
    }
}

const WikimediaVectorCoverage = L.GridLayer.extend({
        options: {
            tileSize: 256,
            color: '#ff00ff',
        },

        initialize: function(url, options) {
            L.GridLayer.prototype.initialize.call(this, options);
            this.loader = new WikimediaLoader(url, 11);
        },

        onAdd: function(map) {
            L.GridLayer.prototype.onAdd.call(this, map);
            this.on('tileunload', this.onTileUnload, this);
        },

        onRemove: function(map) {
            L.GridLayer.prototype.onRemove.call(this, map);
            this.off('tileunload', this.onTileUnload, this);
        },

        onTileUnload: function(e) {
            const tile = e.tile;
            tile._abortLoading();
            delete tile._tileData;
            delete tile._adjustment;
        },

        drawTile: function(canvas, _unused_coords) {
            if (!this._map) {
                return;
            }
            if (!canvas._tileData) {
                return;
            }
            const dataOffset = 5000;
            const dataExtent = 65535 - 2 * dataOffset;
            const tileData = canvas._tileData;
            let {multiplier, offsetX, offsetY} = canvas._adjustment;
            const canvasCtx = canvas.getContext('2d');
            const pixelScale = multiplier * 256 / dataExtent;
            canvasCtx.fillStyle = this.options.color;
            for (let i = 0, l = tileData.length; i < l; i += 2) {
                let x = (tileData[i] - dataOffset) * pixelScale - offsetX * 256;
                let y = (tileData[i + 1] - dataOffset) * pixelScale - offsetY * 256;
                canvasCtx.beginPath();
                canvasCtx.arc(x, y, 5, 0, 2 * Math.PI);
                canvasCtx.fill();
            }
        },

        createTile: function(coords, done) {
            const canvas = L.DomUtil.create('canvas', 'leaflet-tile');
            canvas.width = this.options.tileSize;
            canvas.height = this.options.tileSize;
            let {dataPromise, abortLoading} = this.loader.requestTileData(coords);
            dataPromise.then((data) => {
                if (!data.error) {
                    canvas._tileData = data.tileData;
                    canvas._adjustment = data.adjustment || {multiplier: 1, offsetX: 0, offsetY: 0};
                    setTimeout(() => {
                        this.drawTile(canvas, coords);
                        done(null, canvas);
                    }, 1);
                }
            });

            canvas._abortLoading = abortLoading;
            return canvas;
        },
    }
);

export {MultiLayer, WikimediaVectorCoverage};
