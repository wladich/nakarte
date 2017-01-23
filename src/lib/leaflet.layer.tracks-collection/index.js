import L from 'leaflet';
import {fetch} from 'lib/xhr-promise';
import Pbf from 'pbf';
import {Tile as TileProto} from './track_tile_proto';
import {Cache} from 'lib/cache';
import './style.css';

class TileCache extends Cache {
    makeKey(coords) {
        return `${coords.x}:${coords.y}:${coords.z}`;
    }

    get(coords) {
        return super.get(this.makeKey(coords));
    }

    put(coords, value) {
        super.put(this.makeKey(coords), value);
    }
}

class TrackTilesLoader {
    constructor(url, maxZoom) {
        this.url = url;
        this.maxZoom = maxZoom;
        this.cache = new TileCache(50);
    }

    getTileUrl(coords) {
        const data = {
            x: coords.x,
            z: coords.z,
            y: (2 ** coords.z) - coords.y - 1
        };
        return L.Util.template(this.url, data)
    }

    unpackTileData(dataArray) {
        const
            pbf = new Pbf(new Uint8Array(dataArray)),
            tileData = TileProto.read(pbf);

        const tracksById = {};
        for (let track of tileData.tracks) {
            const
                ar = track.coordinates,
                ar_len = ar.length,
                ar2 = new Float64Array(ar_len);
            for (let i = 0; i < ar_len; i++) {
                ar2[i] = ar[i] / 255 * 256;
            }
            track.coordinates = ar2;
            tracksById[track.trackId] = track;
        }
        tileData.tracksById = tracksById;
        return tileData;
    }

    requestTileData(coords) {
        let {x, y, z} = coords;
        let adjustments;
        if (z > this.maxZoom) {
            let z2 = this.maxZoom,
                multiplier = 1 << (z - z2),
                x2 = Math.floor(x / multiplier),
                y2 = Math.floor(y / multiplier);
            adjustments = {
                multiplier: multiplier,
                offsetX: (x - x2 * multiplier) * 256,
                offsetY: (y - y2 * multiplier) * 256
            };
            [x, y, z] = [x2, y2, z2];
        }

        let tileData = this.cache.get({x, y, z});
        if (tileData !== undefined) {
            return {
                dataPromise: Promise.resolve({tileData, adjustments}),
                abortLoading: () => {
                }
            }
        }
        let url = this.getTileUrl({x, y, z});
        const fetchPromise = fetch(url, {
                responseType: 'arraybuffer',
                timeout: 10000,
                isResponseSuccess: (xhr) => xhr.status === 200 || xhr.status === 204
            }
        );
        //TODO: handle errors
        const dataPromise = fetchPromise.then((xhr) => {
                let tileData;
                if (xhr.status === 200 && xhr.response) {
                    tileData = this.unpackTileData(xhr.response)
                } else {
                    tileData = null;
                }
                this.cache.put({x, y, z}, tileData);
                return {tileData, adjustments};
            }
        );
        return {dataPromise, abortLoading: fetchPromise.abort.bind(fetchPromise)};
    }
}

function sqDistancePointToSegment(p, p1, p2) {
    var x = p1.x,
        y = p1.y,
        dx = p2.x - x,
        dy = p2.y - y,
        dot = dx * dx + dy * dy,
        t;

    if (dot > 0) {
        t = ((p.x - x) * dx + (p.y - y) * dy) / dot;

        if (t > 1) {
            x = p2.x;
            y = p2.y;
        } else if (t > 0) {
            x += dx * t;
            y += dy * t;
        }
    }

    dx = p.x - x;
    dy = p.y - y;

    return dx * dx + dy * dy;
}

function isPointOnTrack(track, p, tolerance) {
    let ar = track.coordinates,
        pos = 0,
        p1, p2;
    for (let segmentLength of track.segmentsLengths) {
        p1 = {
            x: ar[pos],
            y: ar[pos + 1]
        };
        pos += 2;
        for (let i = 1; i < segmentLength; i++) {
            p2 = {
                x: ar[pos],
                y: ar[pos + 1]
            };
            if (sqDistancePointToSegment(p, p1, p2) < tolerance) {
                return true;
            }
            pos += 2;
            p1 = p2;
        }
    }
    return false;
}

L.ProtobufTileLines = L.GridLayer.extend({
        options: {
            url: 'http://tracks-collection/gd/tile/{x}/{y}/{z}',
            tileSize: 256,
            trackFilter: 1 + 2,
            noWrap: true,
            bounds: L.latLngBounds([[-90, -180], [90, 180]])
        },

        initialize: function(options) {
            L.GridLayer.prototype.initialize.call(this, options);
            // FIXME: maxZoom mus be from arguments
            this.loader = new TrackTilesLoader(this.options.url, 12);
        },

        onAdd: function(map) {
            L.GridLayer.prototype.onAdd.call(this, map);
            this.on('tileunload', this.onTileUnload, this);
            map.on('mousemove', this.onMouseMove, this);
            L.DomUtil.addClass(this._map._container, 'tile-tracks-active');
        },

        onRemove: function(map) {
            L.DomUtil.removeClass(this._map._container, 'tile-tracks-active');
            this.off('tileunload', this.onTileUnload, this);
            map.off('mousemove', this.onMouseMove, this);
            L.GridLayer.prototype.onRemove.call(this, map);

        },

        createTile: function(coords, done) {
            const tile = document.createElement('div');
            const canvas = document.createElement('canvas');
            const overlayCanvas = document.createElement('canvas');
            tile.appendChild(canvas);
            tile.appendChild(overlayCanvas);
            canvas.width = 256;
            canvas.height = 256;
            overlayCanvas.width = 256;
            overlayCanvas.height = 256;
            let {dataPromise, abortLoading} = this.loader.requestTileData(coords);
            dataPromise.then((tileData) => {
                    tile._tileData = tileData.tileData;
                    tile._adjustments = tileData.adjustments;
                    this.drawTile(canvas, tileData);
                    this._tileOnLoad(done, tile)
                }
            );

            tile._canvas = canvas;
            tile._overlayCanvas = overlayCanvas;
            tile._abortLoading = abortLoading;
            return tile;
        },

        drawTile: function(canvas, {tileData, adjustments}) {
            if (!tileData) {
                return
            }
            let rastersCombinedFilter = 0;
            for (let raster of tileData.rasters) {
                if (this.options.trackFilter & raster.filter) {
                    rastersCombinedFilter |= raster.filter;
                }
            }
            canvas._rastersCombinedFilter = rastersCombinedFilter;
            if (tileData.rasters.length) {
                this.drawRasterTile(canvas, tileData.rasters);
            }
            this.drawVectorTile(canvas, tileData.tracks, adjustments);
        },

        drawRasterTile: function(canvas, rasters) {
            const color = 'rgba(0, 0, 255, 0.004)';
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, 256, 256);
            const imageData = ctx.getImageData(0, 0, 256, 256);
            const data = imageData.data;
            let ind, c1, c2;
            for (let raster of rasters) {
                if (raster.filter & this.options.trackFilter) {
                    let rasterBytes = raster.raster;
                    for (let i = 0; i < 65536; i++) {
                        ind = i * 4 + 3;
                        c1 = data[ind];
                        c2 = rasterBytes[i];
                        data[ind] = (c1 < c2) ? c2 : c1;
                    }
                }
            }
            ctx.putImageData(imageData, 0, 0);
            canvas._imageData = data;
        },

        drawTrackLines: function(context, track, adjustments) {
            let ar = track.coordinates,
                x, y;
            if (adjustments) {
                const
                    ar_len = ar.length,
                    ar2 = new Float64Array(ar_len),
                    {multiplier, offsetX, offsetY} = adjustments;
                let i = 0;
                while (i < ar_len) {
                    ar2[i] = ar[i] * multiplier - offsetX;
                    ar2[i + 1] = ar[i + 1] * multiplier - offsetY;
                    i += 2;
                }
                ar = ar2;
            }
            let pos = 0;
            for (let segmentLength of track.segmentsLengths) {
                x = ar[pos];
                y = ar[pos + 1];
                pos += 2;
                context.moveTo(x, y);
                for (let i = 1; i < segmentLength; i++) {
                    x = ar[pos];
                    y = ar[pos + 1];
                    context.lineTo(x, y);
                    pos += 2;
                }
            }
        },

        drawVectorTile: function(canvas, tracks, adjustments) {
            const ctx = canvas.getContext('2d');
            let hasDrawn = false;
            ctx.strokeStyle = '#0000FF';
            ctx.beginPath();
            for (let track of tracks) {
                if (track.filter & this.options.trackFilter & ~canvas._rastersCombinedFilter) {
                    hasDrawn = true;
                    this.drawTrackLines(ctx, track, adjustments);
                }
            }
            if (hasDrawn) {
                ctx.stroke();
            }
        },

        _tileOnLoad: function(done, tile) {
            // For https://github.com/Leaflet/Leaflet/issues/3332
            if (L.Browser.ielt9) {
                setTimeout(L.bind(done, this, null, tile), 0);
            } else {
                done(null, tile);
            }
        },

        onTileUnload: function(e) {
            const tile = e.tile;
            tile._abortLoading();
            delete tile._promise;
            delete tile._features;
        },


        highlightTracks: function(trackIds) {
            console.log(trackIds);
            for (let tile of Object.values(this._tiles)) {
                if (tile.current) {
                    let tileData = tile.el._tileData;
                    if (!tileData) {
                        continue;
                    }
                    let canvas = tile.el._overlayCanvas;
                    let ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, 256, 256);
                    ctx.beginPath();
                    ctx.strokeStyle = '#FFAA00';
                    ctx.lineWidth = 2;
                    for (let trackId of trackIds) {
                        let track = tileData.tracksById[trackId];
                        if (track) {
                            this.drawTrackLines(ctx, track, tile.el._adjustments);
                        }
                    }
                    ctx.stroke();
                }
            }
        },

        _tileCoordsFromEvent: function(e) {
            const layerPoint = this._map.getPixelOrigin().add(e.layerPoint);
            let coords = {
                x: Math.floor(layerPoint.x / 256),
                y: Math.floor(layerPoint.y / 256),
                z: this._map.getZoom()
            };

            return {
                tileCoords: coords,
                pixelCoords: {
                    x: layerPoint.x % 256,
                    y: layerPoint.y % 256
                }
            };
        },

        pointNearRasterLine: function(imageData, pixel, tolerance) {
            let minX = pixel.x - tolerance,
                maxX = pixel.x + tolerance,
                minY = pixel.y - tolerance,
                maxY = pixel.y + tolerance;
            for (let y = minY; y <= maxY; y++){
                for (let x = minX; x <= maxX; x++){
                    if (imageData[(y * 256 + x) * 4 + 3] > 127) {
                        return true;
                    }
                }
            }
            return false;
        },

        getTracksIdsForPoint: function(tile, pixel) {
            const
                tileData = tile._tileData,
                adjustments = tile._adjustments;
            let
                tolerance = 5;
            if (!tileData) {
                return [];
            }
            if (adjustments) {
                pixel.x = (pixel.x + adjustments.offsetX) / adjustments.multiplier;
                pixel.y = (pixel.y + adjustments.offsetY) / adjustments.multiplier;
                tolerance /= adjustments.multiplier;
            }
            if (tile._canvas._imageData) { // tile was drawn as raster
                let trackIds = [];
                if (this.pointNearRasterLine(tile._canvas._imageData, pixel, tolerance)) {
                    trackIds = 'RASTER';
                }
                return trackIds;
            }
            let sqTolerance = tolerance * tolerance,
                trackIds = {};
            for (let track of tileData.tracks) {
                if (track.filter & this.options.trackFilter) {
                    if (isPointOnTrack(track, pixel, sqTolerance)) {
                        trackIds[track.trackId] = 1;
                    }
                }
            }
            return Object.keys(trackIds);
        },

        onMouseMove: function(e) {
            const
                {tileCoords, pixelCoords} = this._tileCoordsFromEvent(e),
                key = this._tileCoordsToKey(tileCoords);
            let tile = this._tiles[key];
            if (!tile) {
                return;
            }
            tile = tile.el;
            if (!tile) {
                return;
            }
            const ids = this.getTracksIdsForPoint(tile, pixelCoords);
            this.highlightTracks(ids);
        }
    }
);

L.TracksCollection = L.ProtobufTileLines.extend({});