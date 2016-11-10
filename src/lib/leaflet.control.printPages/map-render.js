
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

function compareLayersOrder(layer1, layer2) {
    return compareArrays(getLayerZOrder(layer1), getLayerZOrder(layer2));
}

function getLayersForPrint(map) {
    let layers = [];
    map.eachLayer((layer) => {
            if (layer.options.print) {
                layers.push(layer);
            }
        }
    );
    layers.sort(compareLayersOrder);
    layers = layers.map((l) => {l.clone()});
    return layers;
}

function renderPage(layers, bounds, zoom, resolution) {
    // const canvas =
}

function savePageJpg(map, bounds, zoom, resolution) {
    const layers = getLayersForPrint(map);
}

function savePagesPdf(map, boundsList, zoom, resolution) {
    const layers = getLayersForPrint(map);
}

export {savePageJpg, savePagesPdf};