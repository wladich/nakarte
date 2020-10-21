import L from 'leaflet';
import {getTempMap, disposeMap} from '~/lib/leaflet.layer.rasterize';
import {XHRQueue} from '~/lib/xhr-promise';

function getLayersForPrint(map, xhrQueue) {
    function getZIndex(el) {
        return parseInt(window.getComputedStyle(el).zIndex, 10) || 0;
    }

    function compare(i1, i2) {
        if (i1 < i2) {
            return -1;
        } else if (i1 > i2) {
            return 1;
        }
        return 0;
    }

    function getLayerZOrder(layer) {
        let el = layer._container || layer._path;
        if (!el) {
            throw new TypeError('Unsupported layer type');
        }
        const order = [];
        while (el !== layer._map._container) {
            order.push(getZIndex(el));
            el = el.parentNode;
        }
        return order.reverse();
    }

    function compareArrays(ar1, ar2) {
        const len = Math.min(ar1.length, ar2.length);
        for (let i = 0; i < len; i++) {
            let c = compare(ar1[i], ar2[i]);
            if (c) {
                return c;
            }
        }
        return compare(ar1.length, ar2.length);
    }

    function compareLayersOrder(layer1, layer2) {
        return compareArrays(getLayerZOrder(layer1), getLayerZOrder(layer2));
    }

    let layers = [];
    map.eachLayer((layer) => {
            if (layer.options.print) {
                layers.push(layer);
            } else {
                if (layer.meta && layer.options.isOverlay === false) {
                    throw new Error(`Print disabled for layer ${layer.meta.title}`);
                }
            }
        }
    );
    layers.sort(compareLayersOrder);
    layers = layers.map((l) => l.cloneForPrint({xhrQueue}));
    return layers;
}

function blendMultiplyCanvas(src, dest) {
    if (src.width !== dest.width || src.height !== dest.height) {
        throw new Error('Canvas size mismatch');
    }
    var s_data = src.getContext('2d').getImageData(0, 0, src.width, src.height).data;
    src.width = 0;
    src.height = 0;
    var d_image_data = dest.getContext('2d').getImageData(0, 0, dest.width, dest.height);
    var d_data = d_image_data.data;
    var data_length = s_data.length,
        sr, sg, sb, sa, sa1,
        dr, dg, db,
        l;
    for (var i = 0; i < data_length; i += 4) {
        sa = s_data[i + 3] / 255;
        if (sa) {
            sr = s_data[i];
            sg = s_data[i + 1];
            sb = s_data[i + 2];
            dr = d_data[i];
            dg = d_data[i + 1];
            db = d_data[i + 2];

            l = (dr + dg + db) / 3;
            l = l / 255 * 0.5 + 0.5;
            sa1 = 1 - sa;
            dr = sr * l * sa + sa1 * dr;
            dg = sg * l * sa + sa1 * dg;
            db = sb * l * sa + sa1 * db;

            d_data[i] = dr;
            d_data[i + 1] = dg;
            d_data[i + 2] = db;
        }
    }
    s_data = null;
    dest.getContext('2d').putImageData(d_image_data, 0, 0);
}

class PageComposer {
    constructor(destSize, pixelBoundsAtZoom24) {
        this.destSize = destSize;
        this.projectedBounds = pixelBoundsAtZoom24;
        this.currentCanvas = null;
        this.currentZoom = null;
        this.currentTileScale = null;
        this.targetCanvas = this.createCanvas(destSize);
    }

    createCanvas(size) {
        const canvas = L.DomUtil.create('canvas');
        canvas.width = size.x;
        canvas.height = size.y;
        return canvas;
    }

    putTile(tileInfo) {
        if (!tileInfo.isOverlay && !tileInfo.image) {
            return;
        }
        let zoom;
        if (tileInfo.isOverlay) {
            zoom = tileInfo.overlaySolid ? 'solidOverlay' : 'overlay';
        } else {
            zoom = tileInfo.zoom;
        }
        if (zoom !== this.currentZoom || tileInfo.tileScale !== this.currentTileScale) {
            this.mergeCurrentCanvas();
            this.setupCurrentCanvas(zoom, tileInfo.tileScale);
        }
        if (tileInfo.isOverlay) {
            tileInfo.draw(this.currentCanvas);
        } else {
            const ctx = this.currentCanvas.getContext('2d');
            const {tilePos, tileSize} = tileInfo;
            ctx.drawImage(
                tileInfo.image,
                tilePos.x * tileInfo.tileScale,
                tilePos.y * tileInfo.tileScale,
                tileSize.x * tileInfo.tileScale,
                tileSize.y * tileInfo.tileScale
            );
        }
    }

    setupCurrentCanvas(zoom, tileScale) {
        let size;
        if (zoom === 'overlay' || zoom === 'solidOverlay') {
            size = this.destSize;
        } else {
            const q = 1 << (24 - zoom);
            const
                topLeft = this.projectedBounds.min.divideBy(q).round(),
                bottomRight = this.projectedBounds.max.divideBy(q).round();
            size = bottomRight.subtract(topLeft).multiplyBy(tileScale);
        }
        this.currentCanvas = this.createCanvas(size);
        this.currentZoom = zoom;
        this.currentTileScale = tileScale;
    }

    mergeCurrentCanvas() {
        if (!this.currentCanvas) {
            return;
        }
        if (this.currentZoom === 'overlay') {
            blendMultiplyCanvas(this.currentCanvas, this.targetCanvas);
        } else {
            this.targetCanvas.getContext('2d').drawImage(this.currentCanvas, 0, 0,
                this.destSize.x, this.destSize.y
            );
        }
        this.currentCanvas.width = 0;
        this.currentCanvas.height = 0;
        this.currentCanvas = null;
    }

    getDataUrl() {
        this.mergeCurrentCanvas();
        const dataUrl = this.targetCanvas.toDataURL("image/jpeg");
        this.targetCanvas.width = 0;
        this.targetCanvas.height = 0;
        this.targetCanvas = null;
        return dataUrl;
    }
}

async function* iterateLayersTiles(
    layers,
    latLngBounds,
    destPixelSize,
    resolution,
    scale,
    zooms,
    pageLabel,
    pagesCount
) {
    const defaultXHROptions = {
        responseType: 'blob',
        timeout: 20000,
        isResponseSuccess: (xhr) => xhr.status === 200 || xhr.status === 404
    };
    let doStop;
    for (let layer of layers) {
        let zoom;
        if (layer.options && layer.options.scaleDependent) {
            zoom = zooms.mapZoom;
        } else {
            zoom = zooms.satZoom;
        }
        let pixelBounds = L.bounds(
            L.CRS.EPSG3857.latLngToPoint(latLngBounds.getNorthWest(), zoom).round(),
            L.CRS.EPSG3857.latLngToPoint(latLngBounds.getSouthEast(), zoom).round()
        );
        let map;
        if (!layer._layerDummy) {
            map = getTempMap(zoom, layer._rasterizeNeedsFullSizeMap, pixelBounds);
            map.addLayer(layer);
        }
        let {iterateTilePromises, count, tileScale = 1} = await layer.getTilesInfo({
                xhrOptions: defaultXHROptions,
                pixelBounds,
                latLngBounds,
                destPixelSize,
                resolution,
                scale,
                zoom,
                pageLabel,
                pagesCount
            }
        );
        let layerPromises = [];
        for (let tilePromise of iterateTilePromises()) {
            layerPromises.push(tilePromise.tilePromise);
            let progressInc = (layer._printProgressWeight || 1) / count;
            tilePromise.tilePromise = tilePromise.tilePromise.then((tileInfo) => ({
                zoom,
                progressInc,
                layer,
                tileScale,
                ...tileInfo,
            }));
            doStop = yield tilePromise;
            if (doStop) {
                tilePromise.abortLoading();
                break;
            }
        }
        if (!layer._layerDummy) {
            if (doStop) {
                disposeMap(map);
                break;
            } else {
                Promise.all(layerPromises).then(() => disposeMap(map));
            }
        }
    }
}

async function* promiseQueueBuffer(source, maxActive) {
    const queue = [];
    while (queue.length < maxActive) {
        let {value, done} = await source.next();
        if (done) {
            break;
        }
        queue.push(value);
    }

    while (queue.length) {
        let doStop = yield queue.shift();
        if (doStop) {
            let {value, done} = await source.next(true);
            if (!done) {
                queue.push(value);
            }
            for (let {abortLoading} of queue) {
                abortLoading();
            }

            return;
        }
        let {value, done} = await source.next();
        if (!done) {
            queue.push(value);
        }
    }
}

async function renderPages({map, pages, zooms, resolution, scale, progressCallback, decorationLayers}) {
    const xhrQueue = new XHRQueue();
    const layers = getLayersForPrint(map, xhrQueue);
    layers.push(...decorationLayers);
    let progressRange = 0;
    for (let layer of layers) {
        progressRange += layer._printProgressWeight || 1;
    }
    progressRange *= pages.length;
    const pageImagesInfo = [];
    const renderedLayers = new Set();
    for (let page of pages) {
        let destPixelSize = page.printSize.multiplyBy(resolution / 25.4).round();
        let pixelBounds = L.bounds(
            map.project(page.latLngBounds.getNorthWest(), 24).round(),
            map.project(page.latLngBounds.getSouthEast(), 24).round()
        );

        const composer = new PageComposer(destPixelSize, pixelBounds);
        let tilesIterator = await iterateLayersTiles(layers, page.latLngBounds, destPixelSize, resolution, scale, zooms,
            page.label, pages.length);
        let queuedTilesIterator = promiseQueueBuffer(tilesIterator, 20);
        while (true) {
            let {value: tilePromise, done} = await queuedTilesIterator.next();
            if (done) {
                break;
            }
            let tileInfo;
            try {
                tileInfo = await tilePromise.tilePromise;
            } catch (e) {
                queuedTilesIterator.next(true);
                throw e;
            }
            progressCallback(tileInfo.progressInc, progressRange);
            composer.putTile(tileInfo);
            const {image, draw, layer} = tileInfo;
            if ((image || draw) && !layer._layerDummy) {
                renderedLayers.add(layer);
            }
        }
        const dataUrl = composer.getDataUrl();
        let data = dataUrl.substring(dataUrl.indexOf(',') + 1);
        data = atob(data);
        pageImagesInfo.push({
                data,
                width: destPixelSize.x,
                height: destPixelSize.y
            }
        );
    }
    return {images: pageImagesInfo, renderedLayers};
}

export {renderPages};
