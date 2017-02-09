import L from 'leaflet';
import urlViaCorsProxy from 'lib/CORSProxy';
import {imgFromDataString} from './imgFromDataString';

L.TileLayer.include({
        cloneForPrint: function(options) {
            return L.tileLayer(this._url, L.Util.extend({}, this.options, options));
        },

        getTilesInfo: function(printOptions) {
            const {pixelBounds, xhrOptions} = printOptions;
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

                        let url = this.getTileUrl(coords);
                        if (this.options.noCors) {
                            url = urlViaCorsProxy(url);
                        }
                        let tilePos = this._getTilePos(coords);
                        const coordsPlusOne = coords.add(L.point(1, 1));
                        coordsPlusOne.z = coords.z;
                        const tileSize = this._getTilePos(coordsPlusOne).subtract(tilePos);
                        tilePos = tilePos.add(this._level.origin).subtract(topLeft);
                        let promise = this.options.xhrQueue.put(url, xhrOptions);
                        yield {
                            tilePromise: promise.then(imgFromDataString).then((image) => {
                                    return {image, tilePos, tileSize};
                                }
                            ),
                            abortLoading: () => promise.abort()
                        };
                    }
                }
            }).bind(this);
            return Promise.resolve({
                    iterateTilePromises: tilePromiseIterator,
                    count: (tileRange.max.x - tileRange.min.x + 1) * (tileRange.max.y - tileRange.min.y + 1)
                }
            );
        }
    }
);

