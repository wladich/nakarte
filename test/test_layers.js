import {layersDefs, groupsDefs, titlesByOrder} from '~/layers';

suite('layers definitions');

function checkLayer(layerDef, isWrapper, parentLayer) {
    const isSublayer = Boolean(parentLayer);
    const options = layerDef.layer.options;
    assert.isObject(layerDef.layer.options, 'options');
    if (isSublayer) {
        assert.notExists(options.code, 'options.code');
    } else {
        assert.isString(options.code, 'options.code');
        assert.isNotEmpty(options.code, 'options.code');
    }
    assert.oneOf(options.isOverlay, [true, false], 'isOverlay');
    if (isSublayer) {
        assert.equal(options.isOverlay, parentLayer.options.isOverlay);
    }
    if (options.isOverlay && options.print) {
        assert.oneOf(options.isOverlayTransparent, [true, false], 'isOverlayTransparent');
    }
    if (isWrapper) {
        assert.notExists(options.print, 'print');
        assert.notExists(options.scaleDependent, 'scaleDependent');
        assert.notExists(options.shortName, 'shortName');
        assert.notExists(options.jnx, 'jnx');
        assert.notExists(options.noCors, 'noCors');
    } else {
        assert.oneOf(options.print, [true, false], 'print');
        if (options.print) {
            assert.oneOf(options.scaleDependent, [true, false], 'scaleDependent');
            assert.isString(options.shortName, 'shortName');
            assert.isNotEmpty(options.shortName, 'shortName');
        }
        assert.oneOf(options.jnx, [true, false], 'jnx');
        assert.oneOf(options.noCors, [true, false, undefined], 'noCors');
    }
    if ('hotkey' in options) {
        assert.match(options.hotkey, /^[A-Z]$/u);
    }
}

layersDefs.forEach(function (layerDef) {
    test(`layer properties ${layerDef.title}`, function () {
        assert.isString(layerDef.title, 'title defined');
        assert.isNotEmpty(layerDef.title, 'title not empty');
        assert.oneOf(typeof layerDef.description, ['undefined', 'string'], 'description undefined or string');
        if (typeof layerDef.description === 'string') {
            assert.isNotEmpty(layerDef.description);
        }
        assert.oneOf(layerDef.isDefault, [true, false], 'isDefault');
        assert.isObject(layerDef.layer, 'layer');

        checkLayer(layerDef, layerDef.layer.options?.isWrapper);
        if (layerDef.options?.isWrapper) {
            layerDef.getLayers().forEach((subLayer) => checkLayer(subLayer, false, layerDef.layer));
        }
    });
});

test('Layers titles unique', function () {
    const seen = new Set();
    const duplicates = new Set();
    for (const layerDef of layersDefs) {
        const title = layerDef.title;
        if (seen.has(title)) {
            duplicates.add(title);
        }
        seen.add(title);
    }
    assert.isEmpty(Array.from(duplicates), 'duplicate layers');
});

test('Layers codes unique', function () {
    const seen = new Set();
    const duplicates = new Set();
    for (const layerDef of layersDefs) {
        const code = layerDef.layer.options.code;
        if (seen.has(code)) {
            duplicates.add(code);
        }
        seen.add(code);
    }
    assert.isEmpty(Array.from(duplicates), 'duplicate codes');
});

test('Layers short names unique', function () {
    const seen = new Set();
    const duplicates = new Set();
    function processLayer(layer) {
        if (!layer.options.print) {
            return;
        }
        const shortName = layer.options.shortName;
        if (seen.has(shortName)) {
            duplicates.add(shortName);
        }
        seen.add(shortName);
    }
    for (const layerDef of layersDefs) {
        const layer = layerDef.layer;
        processLayer(layer);
        if (layer.options.isWrapper) {
            layer.getLayers().forEach(processLayer);
        }
    }
    assert.isEmpty(Array.from(duplicates), 'duplicate short names');
});

test('Layers hotkeys unique', function () {
    const seen = new Set();
    const duplicates = new Set();
    for (const layerDef of layersDefs) {
        let hotkey = layerDef.layer.options.hotkey;
        if (!hotkey) {
            hotkey = layerDef.layer.options.code;
            if (hotkey.length !== 1) {
                continue;
            }
        }

        if (seen.has(hotkey)) {
            duplicates.add(hotkey);
        }
        seen.add(hotkey);
    }
    assert.isEmpty(Array.from(duplicates), 'duplicate hotkeys');
});

suite('Layers groups definitions');

test('Groups valid', function () {
    for (const groupDef of groupsDefs) {
        assert.isString(groupDef.title);
        assert.isNotEmpty(groupDef.title);
        assert.isNotEmpty(groupDef.layers);
    }
});

test('groupsDefs contains same layers as layersDefs', function () {
    const layersInLayersDefs = layersDefs.map((layerDef) => layerDef.title);
    const layersInGroupsDefs = groupsDefs.map((groupDef) => groupDef.layers).flat();
    assert.deepEqual(layersInGroupsDefs.sort(), layersInLayersDefs.sort());
});

suite('Layers order definitions');

test('titlesByOrder has same layers as layersDef', function () {
    const layersInLayersDefs = layersDefs.map((layerDef) => layerDef.title);
    const layersInTitlesByOrder = titlesByOrder.filter((layerName) => layerName[0] !== '#');
    assert.deepEqual(layersInLayersDefs.sort(), layersInTitlesByOrder.sort());
});

test('All baselayers ordered before overlays', function () {
    let seenOverlay = false;
    const outOfOrder = [];
    for (const layerName of titlesByOrder) {
        if (layerName[0] === '#') {
            continue;
        }
        const layerDef = layersDefs.filter((item) => item.title === layerName)[0];
        const isOverlay = layerDef.layer.options.isOverlay;
        if (seenOverlay && !isOverlay) {
            outOfOrder.push(layerName);
        }
        seenOverlay |= isOverlay;
    }
    assert.isEmpty(outOfOrder);
});

test('Order contains markers for custom layers in right order', function () {
    assert.include(titlesByOrder, '#custom-top');
    assert.include(titlesByOrder, '#custom-bottom');
    const customTopOrder = titlesByOrder.indexOf('#custom-top');
    const customBottomOrder = titlesByOrder.indexOf('#custom-bottom');
    assert.isAbove(customTopOrder, customBottomOrder);
});
