import {Cache} from '~/lib/cache';
import {XHRQueue} from '~/lib/xhr-promise';

class TiledDataLoader {
    constructor(cacheSize = 50) {
        this._cache = new Cache(cacheSize);
        this._pendingRequests = {};
        this._xhrQueue = new XHRQueue();
    }

    makeTileKey(coords) {
        return `${coords.x}:${coords.y}:${coords.z}`;
    }

    getFromCache(dataTileCoords) {
        const key = this.makeTileKey(dataTileCoords);
        const res = this._cache.get(key);
        res['coords'] = dataTileCoords;
        return res;
    }

    layerTileToDataTileCoords(layerTileCoords) {
        return {...layerTileCoords};
    }

    makeRequestData(_unused_dataTileCoords) {
        throw new Error('Not implemented');
        // return {
        //     url,
        //     options
        // }
    }

    processResponse(_unused_xhr, _unused_originalDataTileCoords) {
        throw new Error('Not implemented');
        // return {
        //     tileData,
        //     coords
        // }
    }

    calcAdjustment(layerTileCoords, dataTileCoords) {
        if (layerTileCoords.x === dataTileCoords.x &&
            layerTileCoords.y === dataTileCoords.y &&
            layerTileCoords.z === dataTileCoords.z) {
            return null;
        }
        if (dataTileCoords.z > layerTileCoords.z) {
            const multiplier = 1 << (dataTileCoords.z - layerTileCoords.z);
            return {multiplier: 1 / multiplier, offsetX: 0, offsetY: 0};
        }
        const multiplier = 1 << (layerTileCoords.z - dataTileCoords.z);
        return {
            multiplier,
            offsetX: (layerTileCoords.x - dataTileCoords.x * multiplier),
            offsetY: (layerTileCoords.y - dataTileCoords.y * multiplier)
        };
    }

    requestTileData(layerTileCoords) {
        const dataTileCoords = this.layerTileToDataTileCoords(layerTileCoords);
        let res = this.getFromCache(dataTileCoords);
        if (res.found) {
            return {
                dataPromise: Promise.resolve({
                        coords: res.coords,
                        tileData: res.value,
                        adjustment: this.calcAdjustment(layerTileCoords, res.coords)
                    }
                ),
                abortLoading: () => {
                    // no need to abort Promise which is resolved immediately
                }
            };
        }

        const dataTileKey = this.makeTileKey(dataTileCoords);
        if (!(dataTileKey in this._pendingRequests)) {
            const {url, options} = this.makeRequestData(dataTileCoords);
            const fetchPromise = this._xhrQueue.put(url, options);
            const dataPromise = (async() => {
                let xhr;
                try {
                    xhr = await fetchPromise;
                } catch (e) {
                    return {error: e};
                } finally {
                    delete this._pendingRequests[dataTileKey];
                }
                const {tileData, coords} = await this.processResponse(xhr, dataTileCoords);
                this._cache.put(this.makeTileKey(coords), tileData);
                return {tileData, coords};
            })();
            const pendingRequest = this._pendingRequests[dataTileKey] = {
                dataPromise,
                refCount: 0
            };
            pendingRequest.abortLoading = () => {
                pendingRequest.refCount -= 1;
                if (pendingRequest.refCount < 1) {
                    fetchPromise.abort();
                    delete this._pendingRequests[dataTileKey];
                }
            };
        }

        let pendingRequest = this._pendingRequests[dataTileKey];
        pendingRequest.refCount += 1;

        return {
            dataPromise: pendingRequest.dataPromise.then((data) => {
                    if (data.error) {
                        return data;
                    }
                    return {
                        coords: data.coords,
                        tileData: data.tileData,
                        adjustment: this.calcAdjustment(layerTileCoords, data.coords)
                    };
            }),
            abortLoading: () => pendingRequest.abortLoading()
        };
    }
}

export {TiledDataLoader};
