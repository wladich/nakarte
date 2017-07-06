import L from 'leaflet';
import {MapillaryLoader} from './mapillary-loader';

const MapillaryCoverage = L.GridLayer.extend({
        options: {
            tileSize: 1024,
            updateWhenIdle: true,
            color: '#00cfb1'
        },

        initialize: function(options) {
            L.GridLayer.prototype.initialize.call(this, options);
            this.loader = new MapillaryLoader(this.options.url, 12);
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

        drawOverview: function(canvas) {
            const
                tileData = canvas._tileData;
            let {multiplier, offsetX, offsetY} = canvas._adjustment;
            const canvasCtx = canvas.getContext('2d');
            canvasCtx.fillStyle = this.options.color;
            for (let feature of tileData['mapillary-sequence-overview']) {
                if (feature.geometry.type !== 'Point') {
                    throw new Error(`Invalid sequence overview geometry type "${feature.geometry.type}"`)
                }
                canvasCtx.beginPath();
                let x = feature.geometry.coordinates[0] * multiplier - offsetX;
                let y = feature.geometry.coordinates[1] * multiplier - offsetY;
                canvasCtx.arc(x, y, 5, 0, 2 * Math.PI);
                canvasCtx.fill();
            }

        },

        drawSequences: function(canvas, lineWidth) {
            let
                tileData = canvas._tileData,
                adjustment = canvas._adjustment;

            const canvasCtx = canvas.getContext('2d');
            canvasCtx.beginPath();
            canvasCtx.strokeStyle = this.options.color;
            canvasCtx.lineWidth = lineWidth;
            // canvasCtx.lineWidth = thinLines ? 1 : 1;
            canvasCtx.lineCap = "round";
            canvasCtx.lineJoin = "bevel";
            for (let feature of tileData['mapillary-sequences']) {
                if (feature.geometry.type !== 'MultiLineString') {
                    throw new Error(`Invalid sequence geometry type "${feature.geometry.type}"`)
                }
                let {multiplier, offsetX, offsetY} = adjustment;

                let lines = feature.geometry.coordinates;
                for (let lineI = 0; lineI < lines.length; lineI++) {
                    let line = lines[lineI];
                    if (!line.length) {
                        continue;
                    }
                    let x = line[0][0] * multiplier - offsetX;
                    let y = line[0][1] * multiplier - offsetY;
                    canvasCtx.moveTo(x, y);
                    if (line.length === 1) {
                        canvasCtx.lineTo(x, y);
                    }
                    for (let pointI = 0; pointI < line.length; pointI++) {
                        let x = line[pointI][0] * multiplier - offsetX;
                        let y = line[pointI][1] * multiplier - offsetY;
                        canvasCtx.lineTo(x, y);
                    }
                }
            }
            canvasCtx.stroke();
        },

        drawImages: function(canvas) {
            let
                tileData = canvas._tileData,
                adjustment = canvas._adjustment;
            let {multiplier, offsetX, offsetY} = adjustment;
            const canvasCtx = canvas.getContext('2d');
            canvasCtx.beginPath();
            canvasCtx.fillStyle = this.options.color;
            for (let feature of tileData['mapillary-images']) {
                if (feature.geometry.type !== 'Point') {
                    throw new Error(`Invalid image geometry type "${feature.geometry.type}"`)
                }
                canvasCtx.beginPath();
                let x = feature.geometry.coordinates[0] * multiplier - offsetX;
                let y = feature.geometry.coordinates[1] * multiplier - offsetY;
                canvasCtx.arc(x, y, 4, 0, 2 * Math.PI);
                canvasCtx.fill();
            }

        },

        drawTile: function(canvas, coords) {
            if (!this._map) {
                return;
            }
            if (!canvas._tileData) {
                return;
            }
            if (coords.z < 6 + 2 ) {
                this.drawOverview(canvas);
            } else if (coords.z < 14 + 2) {
                let width = coords.z < 14 ? 10 : 5;
                this.drawSequences(canvas, width);
            } else {
                this.drawSequences(canvas, 2);
                this.drawImages(canvas)
            }

        },

        createTile: function(coords, done) {
            const canvas = L.DomUtil.create('canvas', 'leaflet-tile');
            canvas.width = this.options.tileSize;
            canvas.height = this.options.tileSize;
            let {dataPromise, abortLoading} = this.loader.requestTileData(coords);
            dataPromise.then((data) => {
                    canvas._tileData = data.tileData;
                    canvas._adjustment = data.adjustment || {multiplier: 1, offsetX: 0, offsetY: 0};
                    setTimeout(() => {
                        this.drawTile(canvas, coords);
                        done(null, canvas);
                    }, 1);
                }
            );

            canvas._abortLoading = abortLoading;
            return canvas;
        },

    }
);

export {MapillaryCoverage};
