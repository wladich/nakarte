import L from 'leaflet';
import getGoogle from 'lib/googleMapsApi';

L.Layer.Google = L.GridLayer.extend({
        options: {},

        // Possible types: SATELLITE, ROADMAP, HYBRID, TERRAIN
        initialize: function(mapType, options) {
            L.GridLayer.prototype.initialize.call(this, options);
            this.mapType = mapType;
        },

        onAdd: function(map) {
            this._clearTiles();
            L.GridLayer.prototype.onAdd.call(this, map);
            this._googleMapContainer = L.DomUtil.create('div', '', map.getContainer());
            this._googleMapContainer.style.width = '100%';
            this._googleMapContainer.style.height = '100%';
            // this._googleMapContainer.style.opacity = 0;
            this._googleMapContainer.style.visibility = 'hidden';
            this._googleMapContainer.style.pointerEvents = 'none';
            getGoogle().then((google) => {
                    this.google = google;
                    this._googleMap = new google.maps.Map(this._googleMapContainer, {
                            center: new google.maps.LatLng(0, 0),
                            zoom: 0,
                            tilt: 0,
                            mapTypeId: google.maps.MapTypeId[this.mapType],
                            disableDefaultUI: true,
                            keyboardShortcuts: false,
                            draggable: false,
                            disableDoubleClickZoom: true,
                            scrollwheel: false,
                            streetViewControl: false,
                            clickableIcons: false
                        }
                    );
                    google.maps.event.addListener(this._googleMap, 'tilesloaded', this._onTilesLoaded.bind(this));
                    setTimeout(this._syncPosition.bind(this), 0);
                }
            );
            map.on({
                    viewreset: this._clearTiles,
                    resize: this._onResize,
                    move: this._syncPosition,
                    zoomanim: this._onZoom
                }, this
            );
        },

        onRemove: function(map) {
            if (this.google) {
                this.google.maps.event.clearInstanceListeners(this._googleMap);
            }
            this._googleMap = null;
            this._clearTiles();
            L.DomUtil.remove(this._googleMapContainer);
            map.off({
                    viewreset: this._clearTiles,
                    resize: this._onResize,
                    move: this._syncPosition,
                    zoomanim: this._onZoom
                }, this
            );
            L.GridLayer.prototype.onRemove.call(this, map);
        },

        _clearTiles: function() {
            this._pendingTiles = {};
            this._readyTiles = {};
        },

        _onResize: function() {
            if (!this.google) {
                return;
            }
            this.google.maps.event.trigger(this._googleMap, 'resize');
        },

        _syncPosition: function() {
            if (!this.google) {
                return;
            }
            let center = this._map.getCenter();
            let googleCenter = new this.google.maps.LatLng(center.lat, center.lng);
            setTimeout(() => {
                    if (!this._googleMap) {
                        return;
                    }
                    this._googleMap.setCenter(googleCenter);
                    this._googleMap.setZoom(this._map.getZoom());
                }, 0
            );
        },

        _onZoom: function(e) {
            if (!this.google) {
                return;
            }
            let center = e.center;
            let googleCenter = new this.google.maps.LatLng(center.lat, center.lng);
            setTimeout(() => {
                    if (!this._googleMap) {
                        return;
                    }
                    this._googleMap.setCenter(googleCenter);
                    this._googleMap.setZoom(Math.round(e.zoom));
                }, 0
            );
        },

        _roadRegexp: /!1i(\d+)!2i(\d+)!3i(\d+)!/,
        _satRegexp: /x=(\d+)&y=(\d+)&z=(\d+)/,

        _onTilesLoaded: function() {
            this._readyTiles = this._collectMapImageElements();
            this._fullfillPendingTiles();
        },

        _collectMapImageElements: function() {
            const images = this._googleMapContainer.getElementsByTagName('img');
            const tiles = {};
            for (let image of [...images]) {
                let url = image.src;
                let match, coords;
                match = url.match(this._roadRegexp);

                if (match) {
                    coords = {z: match[1], x: match[2], y: match[3]}
                } else {
                    match = url.match(this._satRegexp);
                    if (match) {
                        coords = {x: match[1], y: match[2], z: match[3]}
                    }
                }
                if (coords) {
                    tiles[this._tileCoordsToKey(coords)] = url;
                }
            }
            return tiles;
        },

        _fullfillPendingTiles: function() {
            for (let key of Object.keys(this._readyTiles)) {
                if (key in this._pendingTiles) {
                    for (let [img, cb] of this._pendingTiles[key]) {
                        L.DomEvent.on(img, 'load', L.bind(this._tileOnLoad, this, cb, img));
                        L.DomEvent.on(img, 'error', L.bind(this._tileOnError, this, cb, img));
                        img.alt = '';
                        img.src = this._readyTiles[key];
                    }
                    delete this._pendingTiles[key];
                }
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

        _tileOnError: function(done, tile, e) {
            done(e, tile);
        },

        createTile: function(coords, done) {
            const tile = L.DomUtil.create('img');
            const key = this._tileCoordsToKey(coords);
            if (!(key in this._pendingTiles)) {
                this._pendingTiles[key] = [];
            }
            this._pendingTiles[key].push([tile, done]);
            setTimeout(this._fullfillPendingTiles.bind(this), 0);
            return tile;
        }
    }
);
