import {JnxWriter} from './jnx-encoder';
import {RmapsWriter} from './rmaps-encoder';

const formats = [];

function createBaseExportOption(params) {
    const {format, layer, layerName, zoom, metersPerPixel, tilesCount, fileSizeMb} = params;
    let resolutionString = metersPerPixel.toFixed(2);
    let sizeString = fileSizeMb.toFixed(fileSizeMb > 1 ? 0 : 1);

    params.label = `Zoom ${zoom} (${resolutionString} m/pixel) &mdash; ${tilesCount} tiles (~${sizeString} Mb)`;
    params.itemClass = '';
    params.tooltip = '';
    return params;
}

function addFormat(encoder, name, nameWithHint, fileExtension, exportOptionFactory) {
    formats.push({encoder, name, nameWithHint, fileExtension, exportOptionFactory});
}

addFormat(JnxWriter, "JNX", "JNX", "jnx", function(params) {
    const option = createBaseExportOption(params);
    option.itemClass = option.tilesCount > 50000 ? 'warning' : '';
    option.tooltip = option.tilesCount > 50000 ? '> 50000 tiles' : '';
    return option;
});

addFormat(RmapsWriter, "RMaps", "RMaps (OsmAnd)", "sqlitedb", createBaseExportOption);

export {formats};
