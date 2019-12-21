import {layersDefs, groupsDefs, titlesByOrder} from '~/layers';

suite('layers definitions');

layersDefs.forEach(function(layerDef) {
    test(`layer properties ${layerDef.title}`, function() {
        assert.isString(layerDef.title, 'title defined');
        assert.isNotEmpty(layerDef.title, 'title not empty');
        assert.oneOf(typeof layerDef.description, ['undefined', 'string'], 'description undefined or string');
        if (typeof layerDef.description == 'string') {
            assert.isNotEmpty(layerDef.description);
        }
        assert.oneOf(layerDef.isDefault, [true, false], 'isDefault');
        assert.isObject(layerDef.layer, 'layer');

        const options = layerDef.layer.options;
        assert.isObject(layerDef.layer.options, 'options');
        assert.isString(options.code, 'options.code');
        assert.isNotEmpty(options.code, 'options.code');
        assert.oneOf(options.isOverlay, [true, false], 'isOverlay');
        if (options.isOverlay && options.print) {
            assert.oneOf(options.isOverlayTransparent, [true, false], 'isOverlayTransparent');
        }
        assert.oneOf(options.print, [true, false], 'print');
        if (options.print) {
            assert.oneOf(options.scaleDependent, [true, false], 'scaleDependent');
            assert.isString(options.shortName, 'shortName');
            assert.isNotEmpty(options.shortName, 'shortName');
        }
        assert.oneOf(options.jnx, [true, false], 'jnx');
        assert.oneOf(options.noCors, [true, false, undefined], 'noCors');
    });
});

test('Layers titles unique', function() {
    const seen = new Set();
    const duplicates = new Set();
    for (let layerDef of layersDefs) {
        const name = layerDef.title;
        if (seen.has(name)) {
            duplicates.add(name);
        }
        seen.add(name);
    }
    assert.isEmpty(Array.from(duplicates), 'duplicate layers');
});

test('Layers codes unique', function() {
    const seen = new Set();
    const duplicates = new Set();
    for (let layerDef of layersDefs) {
        const code = layerDef.layer.options.code;
        if (seen.has(code)) {
            duplicates.add(code);
        }
        seen.add(code);
    }
    assert.isEmpty(Array.from(duplicates), 'duplicate codes');
});

test('Layers short names unique', function() {
    const seen = new Set();
    const duplicates = new Set();
    for (let layerDef of layersDefs) {
        if (!layerDef.layer.options.print) {
            continue;
        }
        const shortName = layerDef.layer.options.shortName;
        if (seen.has(shortName)) {
            duplicates.add(shortName);
        }
        seen.add(shortName);
    }
    assert.isEmpty(Array.from(duplicates), 'duplicate short names');
});

suite('Layers groups definitions');

test('Groups valid', function() {
    for (let groupDef of groupsDefs) {
        assert.isString(groupDef.title);
        assert.isNotEmpty(groupDef.title);
        assert.isNotEmpty(groupDef.layers);
    }
});

test('groupsDefs contains same layers as layersDefs', function() {
    const layersInLayersDefs = layersDefs.map((layerDef) => layerDef.title);
    const layersInGroupsDefs = groupsDefs.map((groupDef) => groupDef.layers).flat();
    assert.deepEqual(layersInGroupsDefs.sort(), layersInLayersDefs.sort());
});

suite('Layers order definitions');

test('titlesByOrder has same layers as layersDef', function() {
    const layersInLayersDefs = layersDefs.map((layerDef) => layerDef.title);
    const layersInTitlesByOrder = titlesByOrder.filter((layerName) => layerName[0] !== '#');
    assert.deepEqual(layersInLayersDefs.sort(), layersInTitlesByOrder.sort());
});

test('All baselayers ordered before overlays', function() {
    let seenOverlay = false;
    let outOfOrder = [];
    for (let layerName of titlesByOrder) {
        if (layerName[0] === '#') {
            continue;
        }
        let layerDef = layersDefs.filter((layerDef) => layerDef.title === layerName)[0];
        let isOverlay = layerDef.layer.options.isOverlay;
        if (seenOverlay && !isOverlay) {
            outOfOrder.push(layerName);
        }
        seenOverlay |= isOverlay;
    }
    assert.isEmpty(outOfOrder);
});

test('Order contains markers for custom layers in right order', function() {
    assert.include(titlesByOrder, '#custom-top');
    assert.include(titlesByOrder, '#custom-bottom');
    const customTopOrder = titlesByOrder.indexOf('#custom-top');
    const customBottomOrder = titlesByOrder.indexOf('#custom-bottom');
    assert.isAbove(customTopOrder, customBottomOrder);

});
