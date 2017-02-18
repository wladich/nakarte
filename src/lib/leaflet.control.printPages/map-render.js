import L from 'leaflet';
import 'lib/leaflet.layer.rasterize';
import {XHRQueue} from 'lib/xhr-promise';


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

    function compareLayersOrder(layer1, layer2) {
        return compareArrays(getLayerZOrder(layer1), getLayerZOrder(layer2));
    }

    function getLayerZOrder(layer) {
        let el = layer._container || layer._path;
        if (!el) {
            throw TypeError('Unsupported layer type');
        }
        const order = [];
        while (el !== layer._map._container) {
            order.push(getZIndex(el));
            el = el.parentElement;
        }
        return order.reverse()
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

    let layers = [];
    map.eachLayer((layer) => {
            if (layer.options.print) {
                layers.push(layer);
            }
        }
    );
    layers.sort(compareLayersOrder);
    layers = layers.map((l) => l.cloneForPrint({xhrQueue}));
    return layers;
}

class PageComposer {
    constructor(destSize, pixelBoundsAtZoom24) {
        this.destSize = destSize;
        this.projectedBounds = pixelBoundsAtZoom24;
        this.currentCanvas = null;
        this.currentZoom = null;
        this.targetCanvas = this.createCanvas(destSize);
    }

    createCanvas(size) {
        const canvas = L.DomUtil.create('canvas');
        canvas.width = size.x;
        canvas.height = size.y;
        return canvas;
    }

    putTile({image, tilePos, tileSize, zoom}) {
        if (image === null) {
            return;
        }
        if (zoom !== this.currentZoom) {
            this.mergeCurrentCanvas();
            this.setupCurrentCanvas(zoom);
        }
        this.currentCanvas.getContext('2d').drawImage(image, tilePos.x, tilePos.y, tileSize.x, tileSize.y);
    }

    setupCurrentCanvas(zoom) {
        const q = 1 << (24 - zoom);
        const
            topLeft = this.projectedBounds.min.divideBy(q).round(),
            bottomRight = this.projectedBounds.max.divideBy(q).round(),
            size = bottomRight.subtract(topLeft);
        this.currentCanvas = this.createCanvas(size);
        this.currentZoom = zoom;
        // this.currentOffset = topLeft;
    }

    mergeCurrentCanvas() {
        if (!this.currentCanvas) {
            return;
        }
        this.targetCanvas.getContext('2d').drawImage(this.currentCanvas, 0, 0,
            this.destSize.x, this.destSize.y
        );
        this.currentCanvas = null;
    }

    getDataUrl() {
        this.mergeCurrentCanvas();
        const dataUrl = this.targetCanvas.toDataURL("image/jpeg");
        this.targetCanvas = null;
        return dataUrl;
    }
}

function getTempMap(zoom, fullSize, pixelBounds) {
    const container = L.DomUtil.create('div', '', document.body);
    let width, height, center;
    if (fullSize) {
        const size = pixelBounds.getSize();
        width = size.x;
        height = size.y;
        center = pixelBounds.min.add(size.divideBy(2));
        center = L.CRS.EPSG3857.pointToLatLng(center, zoom);
    } else {
        width = 100;
        height = 100;
        center = L.latLng(0, 0);
    }

    Object.assign(container.style, {
            width: `${width}px`,
            height: `${height}px`,
            position: 'absolute',
            left: '0',
            top: '0',
            visibility: 'hidden'
        }
    );

    const map = L.map(container, {fadeAnimation: false, zoomAnimation: false, inertia: false});
    map.setView(center, zoom);
    return map;
}

function disposeMap(map) {
    const container = map._container;
    map.remove();
    L.DomUtil.remove(container);
}

async function* iterateLayersTiles(layers, latLngBounds, zooms) {
    const defaultXHROptions = {
        responseType: 'blob',
        timeout: 10000,
        isResponseSuccess: (xhr) => xhr.status === 200 || xhr.status === 404
    };
    let doStop;
    for (let layer of layers) {
        let zoom;
        if (layer.options.scaleDependent) {
            zoom = zooms.mapZoom;
        } else {
            zoom = zooms.satZoom;
        }
        let pixelBounds = L.bounds(
            L.CRS.EPSG3857.latLngToPoint(latLngBounds.getNorthWest(), zoom).round(),
            L.CRS.EPSG3857.latLngToPoint(latLngBounds.getSouthEast(), zoom).round()
        );
        let map = getTempMap(zoom, layer._rasterizeNeedsFullSizeMap, pixelBounds);
        map.addLayer(layer);
        let {iterateTilePromises, count} = await layer.getTilesInfo({xhrOptions: defaultXHROptions, pixelBounds});
        let lastPromise;
        for (let tilePromise of iterateTilePromises()) {
            lastPromise = tilePromise.tilePromise;
            tilePromise.tilePromise =
                tilePromise.tilePromise.then((tileInfo) => Object.assign(tileInfo, {zoom, progressInc: 1 / count}));
            doStop = yield tilePromise;
            if (doStop) {
                tilePromise.abortLoading();
                break;
            }
        }
        if (doStop) {
            disposeMap(map);
            break;
        } else {
            if (lastPromise) {
                lastPromise.then(() => disposeMap(map));
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


async function renderPages({map, pages, zooms, resolution, progressCallback}) {
    const xhrQueue = new XHRQueue();
    const layers = getLayersForPrint(map, xhrQueue);
    const progressRange = pages.length * layers.length;
    const pageImagesInfo = [];
    for (let page of pages) {
        let destPixelSize = page.printSize.multiplyBy(resolution / 25.4).round();
        let pixelBounds = L.bounds(
            map.project(page.latLngBounds.getNorthWest(), 24).round(),
            map.project(page.latLngBounds.getSouthEast(), 24).round()
        );

        const composer = new PageComposer(destPixelSize, pixelBounds);
        let tilesIterator = await iterateLayersTiles(layers, page.latLngBounds, zooms);
        let queuedTilesIterator = promiseQueueBuffer(tilesIterator, 20);
        while (true) {
            let {value: tilePromise, done} = await queuedTilesIterator.next();
            iterateLayersTiles(layers, page.latLngBounds, zooms);
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
    return pageImagesInfo;
}


export {renderPages};