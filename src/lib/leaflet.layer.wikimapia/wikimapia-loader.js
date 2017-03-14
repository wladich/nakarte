import {TiledDataLoader} from 'lib/tiled-data-loader';
import wmUtils from './wm-utils'
import urlViaCorsProxy from 'lib/CORSProxy';

class WikimapiaLoader extends TiledDataLoader {
    maxZoom = 15;
    tileSize = 1024;

    constructor(projectObj) {
        super();
        this._projectObj = projectObj;

    }

    getFromCache(dataTileCoords) {
        dataTileCoords = Object.assign({}, dataTileCoords);
        let exactMatch = true;
        while (dataTileCoords.z >= 0) {
            let key = this.makeTileKey(dataTileCoords);
            let res = this._cache.get(key);
            if (res.found) {
                if (exactMatch || !res.value.hasChildren) {
                    res['coords'] = dataTileCoords;
                    return res;
                }
                break;
            }
            dataTileCoords.z -= 1;
            dataTileCoords.x = Math.floor(dataTileCoords.x / 2);
            dataTileCoords.y = Math.floor(dataTileCoords.y / 2);
            exactMatch = false;
        }
        return {found: false};
    }

    layerTileToDataTileCoords(layerTileCoords) {
        let z = layerTileCoords.z - 2;
        if (z > this.maxZoom) {
            let z2 = this.maxZoom,
                multiplier = 1 << (z - z2);
            return {
                x: Math.floor(layerTileCoords.x / multiplier),
                y: Math.floor(layerTileCoords.y / multiplier),
                z: z2
            }
        }
        else {
            if (z < 0) {
                return {z: 0, x: 0, y: 0};
            }
            return {z, x: layerTileCoords.x, y: layerTileCoords.y}
        }
    }

    makeRequestData(dataTileCoords) {
        let url = wmUtils.makeTileUrl(dataTileCoords);
        url = urlViaCorsProxy(url);
        return {
            url,
            options: {timeout: 20000}
        }
    }

    processResponse(xhr) {
        return wmUtils.parseTile(xhr.response, this._projectObj)
            .then((tileData) => {
                    return {
                        tileData,
                        coords: tileData.coords
                    }
                }
            );

    }

    calcAdjustment(layerTileCoords, dataTileCoords) {
        const adjustment = super.calcAdjustment(
            {x: layerTileCoords.x, y: layerTileCoords.y, z: layerTileCoords.z - 2},
            dataTileCoords
        );
        if (adjustment) {
            adjustment.offsetX *= 1024;
            adjustment.offsetY *= 1024;
        }
        return adjustment;
    }
}

export {WikimapiaLoader};