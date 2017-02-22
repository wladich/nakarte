import L from 'leaflet';
import urlViaCorsProxy from 'lib/CORSProxy';
import {imgFromDataString} from './imgFromDataString';

const GridLayerGrabMixin = {
    tileImagePromiseFromCoords: function(coords) {
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
                    const tileSize = this._getTilePos(coordsPlusOne).subtract(tilePos);
                    tilePos = tilePos.add(this._level.origin).subtract(topLeft);
                    let {tilePromise, abortLoading} = this.tileImagePromiseFromCoords(this._wrapCoords(coords), printOptions);
                    yield {
                        tilePromise: tilePromise.then((image) => {
                                return {image, tilePos, tileSize};
                            }
                        ),
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
            if (this.options.noCors) {
                url = urlViaCorsProxy(url);
            }
            let promise = this.options.xhrQueue.put(url, xhrOptions);
            return {
                tilePromise: promise.then(imgFromDataString),
                abortLoading: () => promise.abort()
            }
        }
    }
);

function noop() {

}

const CanvasLayerGrabMixin = L.Util.extend({}, GridLayerGrabMixin, {
    getCanvasFromTile: function(tile) {
        return tile;
    },

    tileImagePromiseFromCoords: function(coords) {
        let tilePromise;
        if (this.createTile.length < 2) {
            let tile = this.createTile(coords);
            tilePromise = Promise.resolve(tile);
        } else {
            tilePromise = new Promise((resolve) => {
                this.createTile(coords, (_, canvas) => resolve(canvas));
            });
        }

        return {
            tilePromise: tilePromise.then(this.getCanvasFromTile),
            abortLoading: noop
        }
    }
});

L.TileLayer.include(TileLayerGrabMixin);

export {TileLayerGrabMixin, GridLayerGrabMixin, CanvasLayerGrabMixin};