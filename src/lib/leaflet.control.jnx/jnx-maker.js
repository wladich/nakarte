import L from 'leaflet';
import {JnxWriter} from './jnx-encoder';
import {getTempMap, disposeMap} from '~/lib/leaflet.layer.rasterize';
import {XHRQueue} from '~/lib/xhr-promise';
import {arrayBufferToString, stringToArrayBuffer} from '~/lib/binary-strings';

const defaultXHROptions = {
    responseType: 'arraybuffer',
    timeout: 20000,
    isResponseSuccess: (xhr) => xhr.status === 200 || xhr.status === 404
};

function minZoom(maxZoom) {
    return Math.max(maxZoom - 4, 0);
}

function imageFromarrayBuffer(arr) {
    const dataUrl = 'data:image/png;base64,' + btoa(arrayBufferToString(arr));
    const image = new Image();
    return new Promise(function(resolve, reject) {
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('Tile image corrupt'));
            image.src = dataUrl;
        }
    );
}

async function convertToJpeg(image) {
    try {
        image = await imageFromarrayBuffer(image);
    } catch (e) {
        return null;
    }
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const dataURL = canvas.toDataURL("image/jpeg");
    const s = atob(dataURL.replace(/^data:image\/jpeg;base64,/u, ""));
    return stringToArrayBuffer(s);
}

function ensureImageJpg(image) {
    if (!image) {
        return null;
    }
    if (arrayBufferToString(image.slice(0, 4)) === '\x89PNG' &&
        arrayBufferToString(image.slice(-8)) === 'IEND\xae\x42\x60\x82') {
        return convertToJpeg(image);
    } else if (arrayBufferToString(image.slice(0, 2)) === '\xff\xd8' &&
        arrayBufferToString(image.slice(-2)) === '\xff\xd9') {
        return Promise.resolve(image);
    }
    return null;
}

async function makeJnxFromLayer(srcLayer, layerName, maxZoomLevel, latLngBounds, progress) {
    const jnxProductId = L.stamp(srcLayer);
    const jnxZOrder = Math.min(jnxProductId, 100);
    const writer = new JnxWriter(layerName, jnxProductId, jnxZOrder);
    const xhrQueue = new XHRQueue();
    let doStop = false;
    let error;
    const minZoomLevel = minZoom(maxZoomLevel);
    let progressWeight = 1;
    for (let zoom = maxZoomLevel; zoom >= minZoomLevel; zoom--) {
        let pixelBounds = L.bounds(
            L.CRS.EPSG3857.latLngToPoint(latLngBounds.getNorthWest(), zoom).round(),
            L.CRS.EPSG3857.latLngToPoint(latLngBounds.getSouthEast(), zoom).round()
        );

        let promises = [];
        let layer = srcLayer.cloneForPrint({xhrQueue});
        let tempMap = getTempMap(zoom, layer._rasterizeNeedsFullSizeMap, pixelBounds);
        tempMap.addLayer(layer);
        let {iterateTilePromises, count: tilesCount} = await layer.getTilesInfo({
                xhrOptions: defaultXHROptions,
                pixelBounds,
                rawData: true
            }
        );
        for (let tilePromiseRec of iterateTilePromises()) {
            promises.push(tilePromiseRec);
        }
        for (let {tilePromise} of promises) {
            let imageRec;
            try {
                imageRec = await tilePromise;
            } catch (e) {
                error = e;
                doStop = true;
                break;
            }
            let xhr = imageRec.image;

            if (xhr === null || xhr.status !== 200 || !xhr.response || !xhr.response.byteLength) {
                continue;
            }
            let image = await ensureImageJpg(xhr.response);
            if (!image) {
                error = new Error('Tile image invalid');
                doStop = true;
                break;
            }
            writer.addTile(image, zoom, imageRec.latLngBounds);
            progress(progressWeight / tilesCount, 4 / 3);
        }
        disposeMap(tempMap);
        if (doStop) {
            promises.forEach((promiseRec) => promiseRec.abortLoading());
            throw error;
        }
        progressWeight /= 4;
    }

    return writer.getJnx();
}

export {makeJnxFromLayer, minZoom};
