import L from 'leaflet';
import wmUtils from './wm-utils';


function isPointInPolygon(polygon, p) {
    var inside = false;
    var prevNode = polygon[polygon.length - 1],
        node, i;
    for (i = 0; i < polygon.length; i++) {
        node = polygon[i];
        if ((node[0] <= p[0] && p[0] < prevNode[0] || prevNode[0] <= p[0] && p[0] < node[0]) && p[1] < (prevNode[1] - node[1]) * (p[0] - node[0]) / (prevNode[0] - node[0]) + node[1]) {
            inside = !inside;
        }
        prevNode = node;
    }
    return inside;
}

const Label = L.Class.extend({
        initialize: function(text, latlng) {
            this.text = text;
            this.latlng = latlng;
        },

        onAdd: function(map) {
            this._map = map;
            this._container = L.DomUtil.create('div', 'leaflet-marker-icon leaflet-zoom-animated wikimapia-tooltip');
            this._container.innerHTML = this.text;

            map._container.appendChild(this._container);
            map.on('viewreset', this._updatePosition, this);
            map.on('mousemove', this.onMouseMove, this);
            this._updatePosition();
        },

        onRemove: function(map) {
            map.off('viewreset', this._updatePosition, this);
            map.off('mousemove', this.onMouseMove, this);
            map._container.removeChild(this._container);
        },

        onMouseMove: function(e) {
            this.latlng = e.latlng;
            this._updatePosition();
        },

        _updatePosition: function() {
            var pos = this._map.latLngToContainerPoint(this.latlng);
            var right = pos.x + this._container.clientWidth + 16 + 2;
            var x, y;
            y = pos.y - 16;
            x = pos.x;
            if (right > this._map._container.clientWidth) {
                x -= this._container.clientWidth + 16 + 2;
            } else {
                x += 16;
            }
            L.Util.extend(this._container.style, {
                    top: y + 'px',
                    left: x + 'px'
                }
            );
        }
    }
);

// TODO: как-то посылать remove() в очередь загрузок при событии tileunload
L.Layer.Wikimapia = L.GridLayer.extend({
        options: {
            tileSize: 512,
            updateWhenIdle: true,
            cacheSize: 30
        },

        initialize: function(options) {
            L.GridLayer.prototype.initialize.call(this, options);
            this._cache = {};
            this._cachePriority = [];
            this._downloading = {};
        },

        onAdd: function(map) {
            L.GridLayer.prototype.onAdd.call(this, map);
            map.on('mousemove', this.highlightPlace, this);
            // map.on('click', this.showPlaceDetails, this);
        },

        onRemove: function(map) {
            map.off('mousemove', this.highlightPlace, this);
            // map.off('click', this.showPlaceDetails, this);
            // if (this.highlightedPlace) {
            //     this._map.removeLayer(this.highlightedPlace.polygon);
            //     this._map.removeLayer(this.highlightedPlace.label);
            //     this.highlightedPlace = null;
            // }
            L.TileLayer.prototype.onRemove.call(this, map);

        },

        raiseCachePriority: function(tileId) {
            const i = this._cachePriority.indexOf(tileId);
            if (i > -1) {
                this._cachePriority.splice(i, 1);
            }
            this._cachePriority.unshift(tileId);
        },

        getWikimapiaDataFromCache: function(tileId) {
            console.log('getWikimapiaDataFromCache', tileId);
            if (tileId in this._cache) {
                console.log('Cache hit', tileId);
                this.raiseCachePriority(tileId);
                return this._cache[tileId];
            }
            while (tileId.length > 1) {
                tileId = tileId.substr(0, tileId.length - 1);
                let tile = this._cache[tileId];
                if (tile && !tile.hasChildren) {
                    console.log('Cache hit (parent)', tileId);
                    this.raiseCachePriority(tileId);
                    return tile;
                }
            }
            console.log('Cache miss', tileId);
            return null;
        },

        putWikimapiaDataToCache: function(data) {
            const tileId = data.tileId;
            console.log('putWikimapiaDataToCache', tileId);
            this._cache[tileId] = data;
            this.raiseCachePriority(tileId);
            while (this._cachePriority.length > this.options.cacheSize) {
                let tileId = this._cachePriority.pop();
                delete this._cache[tileId];
            }
        },

        // TODO: каждые 50-100 мс отдавать управление 
        projectPlacesForZoom: function(tile, viewZoom) {
            if (viewZoom < tile.coords.z) {
                throw new Error('viewZoom < tile.zoom');
            }
            if (tile.places && tile.places[0] && tile.places[0].projectedPolygons &&
                tile.places[0].projectedPolygons[viewZoom]) {
                return;
            }
            const virtualTileSize = 256 * (2 ** (viewZoom - tile.coords.z));
            const p1 = L.point([tile.coords.x * virtualTileSize, tile.coords.y * virtualTileSize]),
                p2 = L.point([(tile.coords.x + 1) * virtualTileSize, (tile.coords.y + 1) * virtualTileSize]),
                latlng1 = this._map.unproject(p1, viewZoom),
                latlng2 = this._map.unproject(p2, viewZoom),
                lat0 = latlng1.lat,
                lng0 = latlng1.lng;
            const qx = (p2.x - p1.x) / (latlng2.lng - latlng1.lng),
                qy = (p2.y - p1.y) / (latlng2.lat - latlng1.lat);

            const offsets = [],
                offsetsStep = virtualTileSize / 64;
            const y0 = p1.y;
            for (let y = -virtualTileSize; y <= 2 * virtualTileSize; y += offsetsStep) {
                let lat = y / qy + lat0;
                let offset = this._map.project([lat, lng0], viewZoom).y - y0 - y;
                offsets.push(offset);
            }

            let ll, offset, offsetPos, offsetIndex, offsetIndexDelta, x, y;
            const x0 = p1.x;
            for (let place of tile.places) {
                let polygon = place.polygon;
                if (polygon.length < 3) {
                    continue;
                }
                let projectedPolygon = [];
                for (let i = 0; i < polygon.length; i++) {
                    ll = polygon[i];
                    x = (ll[1] - lng0) * qx;
                    y = (ll[0] - lat0) * qy;
                    offsetPos = (y + virtualTileSize) / offsetsStep;
                    offsetIndex = Math.floor(offsetPos);
                    offsetIndexDelta = offsetPos - offsetIndex;
                    offset = offsets[offsetIndex] * (1 - offsetIndexDelta) + offsets[offsetIndex + 1] * offsetIndexDelta;
                    projectedPolygon.push([x + x0, y + offset + y0]);
                }
                projectedPolygon = projectedPolygon.map(L.point);
                projectedPolygon = L.LineUtil.simplify(projectedPolygon, 1.5);
                if (!place.projectedPolygons) {
                    place.projectedPolygons = [];
                }
                place.projectedPolygons[viewZoom] = projectedPolygon;
            }
        },

        getWikimapiaDataFromServer: async function(tileId) {
            console.log('getWikimapiaDataFromServer', tileId);
            let tile;

            try {
                tile = await wmUtils.fetchTile(tileId)
            } catch (e) {
                return {error: e.message};
            } finally {
                delete this._downloading[tileId];
            }
            try {
                tile = wmUtils.parseTile(tile)
            } catch (e) {
                console.log('Error parsing tile', e);
                return {'error': `Malformed wikimapia data for tile ${tileId}`}
            }

            this.putWikimapiaDataToCache(tile);
            return tile;
        },

        getWikimapiaDataForTile: function(coords) {
            console.log('getWikimapiaDataForTile', coords);
            coords = wmUtils.getWikimapiaTileCoords(coords, this.options.tileSize);
            const tileId = wmUtils.getTileId(coords);
            if (tileId in this._downloading) {
                console.log('Already downloading', coords, tileId);
                return this._downloading[tileId];
            }
            let data = this.getWikimapiaDataFromCache(tileId);
            if (data) {
                return Promise.resolve(data);
            }
            let dataPromise = this.getWikimapiaDataFromServer(tileId);
            this._downloading[tileId] = dataPromise;
            return dataPromise;
        },


        drawTile: function(coords, canvas, data) {
            if (!this._map) {
                return;
            }
            console.log('drawTile', coords, data);
            if (!data.places) {
                return;
            }
            const canvasCtx = canvas.getContext('2d');
            canvasCtx.strokeStyle = '#CFA600';
            canvasCtx.lineWidth = 1;
            this.projectPlacesForZoom(data, coords.z);
            const x0 = coords.x * this.options.tileSize,
                y0 = coords.y * this.options.tileSize;
            for (let place of data.places) {
                if (!place.projectedPolygons) {
                    continue;
                }
                let polygon = place.projectedPolygons[coords.z];
                canvasCtx.moveTo(polygon[0].x - x0, polygon[0].y - y0);
                let p;
                for (let i = 1; i < polygon.length; i++) {
                    p = polygon[i];
                    canvasCtx.lineTo(p.x - x0, p.y - y0);
                }
                canvasCtx.lineTo(polygon[0].x - x0, polygon[0].y - y0);
            }
            canvasCtx.stroke();

        },

        createTile: function(coords, done) {
            console.log('createTile', coords);
            const canvas = L.DomUtil.create('canvas', 'leaflet-tile');
            canvas.width = this.options.tileSize;
            canvas.height = this.options.tileSize;
            this.getWikimapiaDataForTile(coords)
                .then((data) => {
                        let t1 = Date.now();
                        this.drawTile(coords, canvas, data)
                        let t2 = Date.now();
                        console.log('Tile drawn', t2 - t1);
                    }
                )
                .then(() => {
                        done(null, canvas)
                    }
                );
            return canvas;
        },

        getTileAtLayerPoint: function(x, y, z) {
            for (let tileId of this._cachePriority) {
                let tile = this._cache[tileId];

            }
            // var i, tile;

            // for (i = 0; i < this.tileCache.length; i++) {
            //     tile = this.tileCache[i];
            //     if (x >= tile.x0 && x < tile.x0 + 1024 && y >= tile.y0 && y < tile.y0 + 1024) {
            //         return tile;
            //     }
            // }
        },

        getPlaceAtLayerPoint: function(x, y, places) {
            var j, bounds, place;
            for (j = places.length - 1; j >= 0; j--) {
                place = places[j];
                bounds = place.localBoundsWESN;
                if (x >= bounds[0] && x <= bounds[1] && y >= bounds[3] && y <= bounds[2] && isPointInPolygon(place.localPolygon, [x, y])) {
                    return place;
                }
            }
        }


    }
);
