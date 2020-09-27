'use strict';

const topLevelFiles = ['src/index.js'];
const filesMissingExport = [
    'src/lib/knockout.component.progress/progress.js',
    'src/lib/leaflet.control.azimuth/index.js',
    'src/lib/leaflet.control.caption/index.js',
    'src/lib/leaflet.control.coordinates/index.js',
    'src/lib/leaflet.control.jnx/hash-state.js',
    'src/lib/leaflet.control.jnx/index.js',
    'src/lib/leaflet.control.layers.configure/customLayer.js',
    'src/lib/leaflet.control.layers.events/index.js',
    'src/lib/leaflet.control.panoramas/index.js',
    'src/lib/leaflet.control.printPages/control.js',
    'src/lib/leaflet.control.track-list/control-ruler.js',
    'src/lib/leaflet.control.track-list/track-list.hash-state.js',
    'src/lib/leaflet.control.track-list/track-list.localstorage.js',
    'src/lib/leaflet.hashState/Leaflet.Control.Layers.js',
    'src/lib/leaflet.hashState/Leaflet.Map.js',
    'src/lib/leaflet.hashState/leaflet.hashState.js',
    'src/lib/leaflet.layer.canvasMarkers/index.js',
    'src/lib/leaflet.layer.google/index.js',
    'src/lib/leaflet.layer.rasterize/Bing.js',
    'src/lib/leaflet.layer.rasterize/CanvasMarkers.js',
    'src/lib/leaflet.layer.rasterize/Google.js',
    'src/lib/leaflet.layer.rasterize/MeasuredLine.js',
    'src/lib/leaflet.layer.rasterize/TileLayer.js',
    'src/lib/leaflet.layer.rasterize/WestraPasses.js',
    'src/lib/leaflet.layer.rasterize/Yandex.js',
    'src/lib/leaflet.layer.soviet-topomaps-grid/index.js',
    'src/lib/leaflet.layer.westraPasses/index.js',
    'src/lib/leaflet.layer.wikimapia/index.js',
    'src/lib/leaflet.layer.yandex/index.js',
    'src/lib/leaflet.lineutil.simplifyLatLngs/index.js',
    'src/lib/leaflet.placemark/index.js',
    'src/lib/leaflet.polyline-edit/index.js',
    'src/lib/leaflet.polyline-measure/index.js',
];

const filesWithExportAndSideEffects = [
    'src/lib/leaflet.control.track-list/track-list',
    'src/lib/leaflet.control.commons',
];

const filesMissingExportForUnassigned = [
    ...filesMissingExport.map((s) => s.replace(/(\/index)?\.js$/u, '').replace(/^src\//u, '~/')),
    ...filesMissingExport.map((s) => s.replace(/(\/index)?\.js$/u, '')),
    ...filesWithExportAndSideEffects,
    ...filesWithExportAndSideEffects.map((s) => s.replace(/^src\//u, '~/')),
];
module.exports = {
    rules: {
        'import/no-cycle': 'off',
        'import/no-unused-modules': [
            'error',
            {missingExports: true, unusedExports: true, ignoreExports: [...topLevelFiles, ...filesMissingExport]},
        ],
        'import/no-unassigned-import': ['error', {allow: ['**/*.css', ...filesMissingExportForUnassigned]}],
        'import/order': 'off',
    },
};