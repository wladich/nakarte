import L from 'leaflet';
import urlViaCorsProxy from '~/lib/CORSProxy';
import {imgFromDataString} from './imgFromDataString';

function noop() {
    // dummy function
}

const GridLayerGrabMixin = {
    tileImagePromiseFromCoords: function(_unused_coords) {
        throw new Error('Method not implemented');
    },

    waitTilesReadyToGrab: function() {
        return Promise.resolve(null);
    },

    getTilesInfo: async function(printOptions) {
        await this.waitTilesReadyToGrab();
        const {pixelBounds} = printOptions;
        const tileRange = this._pxBoundsToTileRange(pixelBounds);
        const topLeft = pixelBounds.min;
        const tilePromiseIterator = (function*() {
            for (let j = tileRange.min.y; j <= tileRange.max.y; j++) {
                for (let i = tileRange.min.x; i <= tileRange.max.x; i++) {
                    let coords = new L.Point(i, j);
                    coords.z = this._tileZoom;
                    if (!this._isValidTile(coords)) {
                        continue;
                    }
                    let tilePos = this._getTilePos(coords);
                    const coordsPlusOne = coords.add(L.point(1, 1));
                    coordsPlusOne.z = coords.z;
                    const tilePlusOne = this._getTilePos(coordsPlusOne);
                    const tileSize = tilePlusOne.subtract(tilePos);
                    const latLngBounds = L.latLngBounds(
                        this._map.unproject(tilePos.add(this._level.origin)),
                        this._map.unproject(tilePlusOne.add(this._level.origin)));
                    tilePos = tilePos.add(this._level.origin).subtract(topLeft);
                    let {tilePromise, abortLoading} = this.tileImagePromiseFromCoords(
                        this._wrapCoords(coords), printOptions);
                    yield {
                        tilePromise: tilePromise.then((image) => ({image, tilePos, tileSize, latLngBounds})),
                        abortLoading
                    };
                }
            }
        }).bind(this);
        return {
            iterateTilePromises: tilePromiseIterator,
            count: (tileRange.max.x - tileRange.min.x + 1) * (tileRange.max.y - tileRange.min.y + 1)
        };
    }
};

const TileLayerGrabMixin = L.Util.extend({}, GridLayerGrabMixin, {
        cloneForPrint: function(options) {
            return L.tileLayer(this._url, L.Util.extend({}, this.options, options));
        },

        tileImagePromiseFromCoords: function(coords, printOptions) {
            let {xhrOptions} = printOptions;
            let url = this.getTileUrl(coords);
            if (!url) {
                return {tilePromise: Promise.resolve(null), abortLoading: noop};
            }
            if (this.options.noCors) {
                url = urlViaCorsProxy(url);
            }
            let promise = this.options.xhrQueue.put(url, xhrOptions);

            return {
                tilePromise: printOptions.rawData ? promise : promise.then(imgFromDataString),
                abortLoading: () => promise.abort()
            };
        }
    }
);

// CanvasLayerGrabMixin has been deleted

const TileLayerWithCutlineGrabMixin = L.Util.extend({}, TileLayerGrabMixin, {
    waitTilesReadyToGrab: function() {
        return TileLayerGrabMixin.waitTilesReadyToGrab.call(this).then(() => this._cutlinePromise);
    },

    tileImagePromiseFromCoords: function(coords, printOptions) {
        const result = TileLayerGrabMixin.tileImagePromiseFromCoords.call(this, coords, printOptions);
        if (!printOptions.rawData && this._cutlinePromise && this.isCutlineIntersectingTile(coords, true)) {
            result.tilePromise = result.tilePromise.then((img) => {
                if (!img) {
                    return img;
                }
                const clipped = document.createElement('canvas');
                return new Promise((resolve) => {
                    this._drawTileClippedByCutline(coords, img, clipped, () => resolve(clipped));
                });
            });
        }
        return result;
    }
});

L.TileLayer.include(TileLayerWithCutlineGrabMixin);
