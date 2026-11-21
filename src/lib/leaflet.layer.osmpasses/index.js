import L from 'leaflet';
import {fetch} from 'lib/xhr-promise';
import 'lib/leaflet.layer.canvasMarkers';
import logging from 'lib/logging';
import {notify} from 'lib/notifications';
import iconFromBackgroundImage from 'lib/iconFromBackgroundImage';

// Possible Improvements:
// - tooltips
// - means to download GPX/KML of a pass

const OSMPasses = L.Layer.CanvasMarkers.extend({
    options: {
        minZoom: 10, // to be kind on the overpassTurbo guys
        scaleDependent: true,
		attribution: "© OpenStreetMap",
    },

    _query: "data=%5Bout%3Ajson%5D%5Btimeout%3A25%5D%3B%0A%28node%5B%22mountain_pass%22%5D%28{bbox}%29%3B%29%3B%0Aout%20body%3B%0A%3E%3B%0Aout%20skel%20qt%3B",

    // initialize: API hook from Layer
    // `url` is given in the Layer constructor
    // and it is a choice of a suitable overpassTurbo server
    initialize: function(url, options) {
        this.dataUrl = url;
        L.Layer.CanvasMarkers.prototype.initialize.call(this, null, options);
    },

    // drawTile: API hook from GridLayer called upon tile creation
    // we intercept the hook and load passes within the tile
    // before passing the control back to CanvasMarkers
    // FIXME: this actually results in ugly blinks when loading the passes
    drawTile: async function(canvas, coords) {
        const
            bounds = this._tileBounds(coords),
            url = this._queryUrl(bounds);
        if (!this._seenTile(coords)) {
            await this._memoized((url) => this._loadData(url), url, "_loadDataUrls")
        }
        return L.Layer.CanvasMarkers.prototype.drawTile.call(this, canvas, coords);
    },

    // _tileBounds: convert tile `coords` to lat/lon `L.latLngBounds`
    // FIXME: this function is probably already implemented in GridLayer
    _tileBounds: function(coords) {
        const
            zoom = coords.z,
            tileSize = this.options.tileSize,
            tileN = coords.y * tileSize,
            tileW = coords.x * tileSize,
            tileS = tileN + tileSize,
            tileE = tileW + tileSize;
        return L.latLngBounds(
            this._map.unproject(L.point(tileW, tileS), zoom),
            this._map.unproject(L.point(tileE, tileN), zoom)
        );
    },

    // _queryUrl: given `bounds` in lat/lon coordinates, generate
    // an overpassTurbo query URL from template
    _queryUrl: function(bounds) {
        const
            bbox = L.Util.template('{south},{west},{north},{east}', {
                west: bounds.getWest(),
                east: bounds.getEast(),
                north: bounds.getNorth(),
                south: bounds.getSouth(),
            }),
            query = L.Util.template(this._query, { bbox: bbox });
        return this.dataUrl + '?' + query;
    },

    // _loadData: Load, parse and add markers from a given URL
    // FIXME: the function sees too dumb, consider merging with another
    _loadData: async function(url) {
        return fetch(url, {responseType: 'json'})
            .then(response => this._loadMarkers(response.response))
            .catch(e => this._downloadError(e, url));
    },

    // Log download error and present it to the User
    _downloadError: function(e, url) {
        if (e) {
            logging.captureException(e, {
                    extra: {
                        description: 'Failed to get OSM passes',
                        url: url,
                        status: e.xhr && e.xhr.status
                    }
                }
            )
        }
        notify('Failed to get OSM passes data');
    },

    // _notSimultaneously: run asynchronous `fun`ction of no arguments
    // unless function was already started (and not finished)
    // with the same `semaphore` value
    _notSimultaneously: function(fun, semaphore) {
        const _this = this;
        if (!_this[semaphore]) {
            _this[semaphore] = true;
            return fun()
                .finally(() => { _this[semaphore] = false; });
        }
    },

    // _memoized: run a `fun`ction of one `arg` with memoization:
    // do not rerun it if it was called already
    // cached function replies are stored in `this[storage]`
    _memoized: function(fun, arg, storage) {
        this[storage] = this[storage] || {}
        if (typeof this[storage][arg] === "undefined") {
            this[storage][arg] = fun(arg);
        }
        return this[storage][arg]
    },

    // _loadMarkers: convert response data to markers and load them
    _loadMarkers: function(data) {
        const fixScale = scale =>
            (scale || "")
                .toLowerCase()
                .replace(/а/, "a").replace(/б/, "b")
                .replace(/н.?к/, "nograde")
                .match(/([1-3][ab]|nograde)?/)[0]
                || "unknown";
        const getIcon = scale =>
            iconFromBackgroundImage('westra-pass-marker-' + fixScale(scale));

        const markers = data.elements
            .map(item => ({
                latlng: {lat: item.lat, lng: item.lon},
                label: item.tags.name,
                icon: getIcon(item.tags.rtsa_scale),
                id: item.id
            }))
        this.addMarkers(this._removeKnownMarkers(markers));
    },

    // _removeKnownMarkers: given a list of markers with id attribute,
    // return a list with only markers not given to _removeKnownMarkers earlier
    _known_markers: [],
    _removeKnownMarkers: function(markers){
        return markers
            .filter(item => {
                const seen = this._known_markers[item.id];
                this._known_markers[item.id] = true;
                return !seen
            });
    },

    // Unfortunately, GridLayer does not expose a way to get child/parent tiles
    // The code below is reverse-engineered from GridLayer._retainParent and co
    // It works but depends on the internals of Leaflet...
    // Presently, _parentTile is not used, but left here for the documentation purposes

    // _parentTile: return coordinates of the z-1 level tile containing the given one
    _parentTile: function(coords) {
        const
            x = Math.floor(coords.x / 2),
            y = Math.floor(coords.y / 2);
        var parentTile = L.Point(+x, +y);
        parentTile.z = +coords.z - 1;
        return parentTile;
    },

    // _seenTile: return true if a tile was covered by a previous download
    // subsequent calls with the same tile or it's children will return false
    _seenTileZ: {},
    _seenTile: function(coords) {
        for (var anti_z of Array(coords.z).keys()) {
            // This could've used this._parentTile but the code would look uglier
            const x = Math.floor(coords.x / 2 ** anti_z);
            const y = Math.floor(coords.y / 2 ** anti_z);
            const z = coords.z - anti_z;
            const center = [x, y]
            if (this._seenTileZ[center] <= z) {
                return true;
            }
        }
        const center = [coords.x, coords.y]
        this._seenTileZ[center] = coords.z
        return false;
    }
});


export {OSMPasses}
