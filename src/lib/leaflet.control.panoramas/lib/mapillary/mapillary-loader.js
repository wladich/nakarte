import L from 'leaflet';
import {TiledDataLoader} from 'lib/tiled-data-loader';
import {decodeMvt} from './mvt';


class MapillaryLoader extends TiledDataLoader {
    url = 'https://d25uarhxywzl1j.cloudfront.net/v0.1/{z}/{x}/{y}.mvt';
    maxZoom = 14;

    getTileUrl(coords) {
        const data = {
            x: coords.x,
            z: coords.z,
            y: coords.y
        };
        return L.Util.template(this.url, data);
    }

    layerTileToDataTileCoords(layerTileCoords) {
        let z = layerTileCoords.z - 2;
        let z2 = null;
        if (z > 6 && z <= 10) {
            z2 = 6;
        } else if (z >= 11 && z < 14) {
            z2 = z - 4;
        } else if (z < 0) {
            z2 = 0;
        } else if (z > this.maxZoom) {
            z2 = this.maxZoom
        } else {
            return {z, x: layerTileCoords.x, y: layerTileCoords.y}
        }

        let multiplier = 1 << (z - z2);
        return {
            x: Math.floor(layerTileCoords.x / multiplier),
            y: Math.floor(layerTileCoords.y / multiplier),
            z: z2
        }
    }


    makeRequestData(dataTileCoords) {
        return {
            url: this.getTileUrl(dataTileCoords),
            options: {
                responseType: 'arraybuffer',
                timeout: 10000,
                isResponseSuccess: (xhr) => xhr.status === 200 || xhr.status === 403
            }
        }
    }

    calcAdjustment(layerTileCoords, dataTileCoords) {
        let adjustment = super.calcAdjustment(
            {x: layerTileCoords.x, y: layerTileCoords.y, z: layerTileCoords.z - 2},
            dataTileCoords
        );
        if (adjustment) {
            adjustment.offsetX *= 1024;
            adjustment.offsetY *= 1024;
        }
        return adjustment;
    }

    async processResponse(xhr, originalDataTileCoords) {
        return this._processResponse(xhr, originalDataTileCoords);
    }

    async _processResponse(xhr, originalDataTileCoords) {
        let tileData;
        if (xhr.status === 200 && xhr.response) {
            const layers = decodeMvt(xhr.response, 1024);
            tileData = {};
            for (let layer of layers) {
                tileData[layer.name] = layer.features;
            }
        } else {
            tileData = null;
        }

        return {
            tileData,
            coords: originalDataTileCoords
        }
    }
}

export {MapillaryLoader};