import L from 'leaflet';
import {WikimapiaLoader} from './wikimapia-loader';
import './style.css';
import {openPopupWindow} from '~/lib/popup-window';

function isPointInPolygon(polygon, p) {
    var inside = false;
    var prevNode = polygon[polygon.length - 1],
        node, i;
    for (i = 0; i < polygon.length; i++) {
        node = polygon[i];
        if (
            ((node[0] <= p[0] && p[0] < prevNode[0]) || (prevNode[0] <= p[0] && p[0] < node[0])) &&
            p[1] < (prevNode[1] - node[1]) * (p[0] - node[0]) / (prevNode[0] - node[0]) + node[1]
        ) {
            inside = !inside;
        }
        prevNode = node;
    }
    return inside;
}

L.Wikimapia = L.GridLayer.extend({
        options: {
            tileSize: 1024,
            updateWhenIdle: true,
            tilesBaseUrl: 'http://wikimapia.org/',
        },

        initialize: function(options) {
            L.GridLayer.prototype.initialize.call(this, options);
            this.loader = null;
        },

        onAdd: function(map) {
            if (!this.loader) {
                this.loader = new WikimapiaLoader(this.options.tilesBaseUrl, map);
            }
            L.GridLayer.prototype.onAdd.call(this, map);
            this.on('tileunload', this.onTileUnload, this);
            map.on('mousemove', this.onMouseMove, this);
            map.on('click', this.onClick, this);
        },

        onRemove: function(map) {
            map.off('mousemove', this.onMouseMove, this);
            map.off('click', this.onClick, this);
            if (this.highlightedPlace) {
                this._map.removeLayer(this.highlightedPlace.polygon);
                this._map.removeLayer(this.highlightedPlace.label);
                this.highlightedPlace = null;
            }
            L.TileLayer.prototype.onRemove.call(this, map);
            this.off('tileunload', this.onTileUnload, this);
        },

        drawTile: function(canvas) {
            if (!this._map) {
                return;
            }
            const
                tileData = canvas._tileData,
                adjustment = canvas._adjustment;
            if (!tileData) {
                return;
            }

            const canvasCtx = canvas.getContext('2d');
            canvasCtx.beginPath();
            canvasCtx.strokeStyle = '#CFA600';
            canvasCtx.lineWidth = 1;
            for (let place of tileData.places) {
                let polygon = place.localPolygon;
                if (!polygon) {
                    continue;
                }
                if (adjustment) {
                    let {multiplier, offsetX, offsetY} = adjustment,
                        polygon2 = [];
                    for (let i = 0; i < polygon.length; i++) {
                        let p = polygon[i];
                        polygon2.push({
                                x: p.x * multiplier - offsetX,
                                y: p.y * multiplier - offsetY
                            }
                        );
                    }
                    polygon = polygon2;
                }
                canvasCtx.moveTo(polygon[0].x, polygon[0].y);
                let p;
                for (let i = 1; i < polygon.length; i++) {
                    p = polygon[i];
                    canvasCtx.lineTo(p.x, p.y);
                }
                canvasCtx.lineTo(polygon[0].x, polygon[0].y);
            }
            canvasCtx.stroke();
        },

        createTile: function(coords, done) {
            const canvas = L.DomUtil.create('canvas', 'leaflet-tile');
            canvas.width = this.options.tileSize;
            canvas.height = this.options.tileSize;
            let {dataPromise, abortLoading} = this.loader.requestTileData(coords);
            dataPromise.then((data) => {
                if (!data.error) {
                    canvas._tileData = data.tileData;
                    canvas._adjustment = data.adjustment;
                    this.drawTile(canvas);
                    this._tileOnLoad(done, canvas);
                }
            });

            canvas._abortLoading = abortLoading;
            return canvas;
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
            delete tile._tileData;
            delete tile._adjustment;
        },

        _tileCoordsFromEvent: function(e) {
            const layerPoint = this._map.getPixelOrigin().add(e.layerPoint);
            const tileSize = this.options.tileSize;
            let coords = {
                x: Math.floor(layerPoint.x / tileSize),
                y: Math.floor(layerPoint.y / tileSize),
                z: this._map.getZoom()
            };

            return coords;
        },

        getPlaceAtMousePos: function(e) {
            const tileCoords = this._tileCoordsFromEvent(e);
            let tile = this._tiles[this._tileCoordsToKey(tileCoords)];
            if (!tile) {
                return null;
            }
            const tileData = tile.el._tileData;
            if (!tileData) {
                return null;
            }
            return this.getPlaceAtLatlng(e.latlng.wrap(), tileData.places);
        },

        onMouseMove: function(e) {
            const place = this.getPlaceAtMousePos(e);
            if (this.highlightedPlace && (!place || this.highlightedPlace.id !== place.id)) {
                this._map.removeLayer(this.highlightedPlace.polygon);
                this._map.removeLayer(this.highlightedPlace.label);
                this.highlightedPlace = null;
            }

            if (place && !this.highlightedPlace) {
                this.highlightedPlace = {
                    id: place.id,
                    polygon: L.polygon(place.polygon, {
                            weight: 0,
                            color: '#E6B800'
                        }
                    ),
                    label: L.tooltip({className: 'wikimapia-tooltip-wrapper'}, null)
                };
                this.highlightedPlace.label.setLatLng(e.latlng);
                this.highlightedPlace.polygon.addTo(this._map).bringToBack();
                this.highlightedPlace.label.setContent(`<div class="wikimapia-tooltip">${place.title}</div>`);
                this._map.addLayer(this.highlightedPlace.label);
            }
            if (this.highlightedPlace) {
                this.highlightedPlace.label.setLatLng(e.latlng);
            }
        },

        onClick: function(e) {
            if (this._map.clickLocked) {
                return;
            }
            const place = this.getPlaceAtMousePos(e);
            if (place) {
                const url = `http://wikimapia.org/${place.id}/ru/`;
                openPopupWindow(url, 564, 'wikimapia-details');
            }
        },

        getPlaceAtLatlng: function(latlng, places) {
            let {lat, lng} = latlng,
                bounds, place;
            for (let i = places.length - 1; i >= 0; i--) {
                place = places[i];
                bounds = place.boundsWESN;
                if (lng >= bounds[0] && lng <= bounds[1] && lat >= bounds[2] && lat <= bounds[3] &&
                    isPointInPolygon(place.polygon, [lat, lng])) {
                    return place;
                }
            }
            return null;
        }

    }
);
