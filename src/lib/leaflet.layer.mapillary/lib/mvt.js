import Pbf from 'pbf';
import {Tile as TileProto} from './vector_tile_proto';

function simlifyTagValue(obj) {
    for (let v of Object.values(obj)) {
        if (v) {
            return v;
        }
    }
}

function decodeCoordinate(x) {
    return ((x >> 1) ^ (-(x & 1)));
}

function parseGeometry(geometryType, ints, coordinatesScale) {
    if (geometryType !== TileProto.GeomType.POINT && geometryType !== TileProto.GeomType.LINESTRING &&
        geometryType !== TileProto.GeomType.POLYGON) {
        throw new Error(`Unknown feature geometry type ${geometryType}`);
    }
    const len = ints.length;
    let pos = 0;
    const lineStrings = [];
    let line;
    let x = 0, y = 0;
    while (pos < len) {
        let i = ints[pos];
        let cmd = i & 0x7;
        let cmdRepeat = i >> 3;
        switch (cmd) {
            case 1: // MoveTo
                if (cmdRepeat !== 1) {
                    throw new Error(`repeat=${cmdRepeat} for command MoveTo`);
                }
                if (pos + 2 > len) {
                    throw new Error('Not enough elements for MoveTo arguments');
                }
                if (line) {
                    lineStrings.push(line);
                }
                x += decodeCoordinate(ints[pos + 1]);
                y += decodeCoordinate(ints[pos + 2]);
                line = [[x * coordinatesScale, y * coordinatesScale]];
                pos += 3;
                break;
            case 2: // LineTo
                if (cmdRepeat < 1) {
                    throw new Error(`repeat=${cmdRepeat} for command LineTo`);
                }
                if (!line) {
                    throw new Error('LineTo with empty linestring')
                }
                pos +=1;
                for (let cmdN = 0; cmdN < cmdRepeat; cmdN++){
                    if (pos + 2 > len) {
                        throw new Error('Not enough elements for LineTo arguments');
                    }
                    x += decodeCoordinate(ints[pos]);
                    y += decodeCoordinate(ints[pos + 1]);
                    line.push([x * coordinatesScale, y * coordinatesScale])
                    pos += 2;
                }
                break;
            case 7: // ClosePath
                if (geometryType !== TileProto.GeomType.POLYGON) {
                    throw new Error(`ClosePath command for non-polygon type ${geometryType}`);
                }
                if (!line) {
                    throw new Error('ClosePath with empty linestring')
                }
                if (cmdRepeat !== 1) {
                    throw new Error(`ClosePath repeats ${cmdRepeat} times`);
                }
                line.push(line[0]);
                pos += 1;
                break;
            default:
                throw new Error(`Unknown command ${i} & 0x7 = ${cmd}`);
        }
    }
    if (line) {
        lineStrings.push(line);
    }
    const geometry = {};
    switch (geometryType) {
        case TileProto.GeomType.POINT:
            if (lineStrings.length !== 1 || lineStrings[0].length !== 1) {
                console.log(lineStrings);
                throw new Error('Invalid coordinates number for point');
            }
            geometry.type = 'Point';
            geometry.coordinats = lineStrings[0][0];
            break;
        case TileProto.GeomType.LINESTRING:
            if (lineStrings.length !== 1) {
                throw new Error('Invalid linestrings number for line');
            }
            geometry.type = 'LineString';
            geometry.coordinats = lineStrings[0];
            break;
        case TileProto.GeomType.POLYGON:
            geometry.type = 'Polygon';
            geometry.coordinats = lineStrings;
            break;
    }
    return geometry;
}

function parseFeatureTags(tagsInts, layerKeys, layerValues) {
    const tags = {};
    if (tagsInts) {
        let i = 0;
        while (i < tagsInts.length) {
            let key = layerKeys[tagsInts[i]];
            let value = layerValues[tagsInts[i + 1]];
            tags[key] = value;
            i +=2;
        }
    }
    return tags;
}

function parseFeatures(layer, coordinatesScale) {
    const features = [];
    const tagValues = layer.values.map(simlifyTagValue);
    for (let feature of layer.features) {
        const properties = parseFeatureTags(feature.tags, layer.keys, tagValues);
        const geometry = parseGeometry(feature.type, feature.geometry, coordinatesScale);
        features.push({properties, geometry});
    }
    return features;
}

function decodeMvt(ar, tileExtent=256) {
    const
        pbf = new Pbf(new Uint8Array(ar)),
        tileData = TileProto.read(pbf);
    const layers = tileData.layers.map((layer) => {
        const scale = tileExtent / layer.extent;
        return {
            name: layer.name,
            features: parseFeatures(layer, scale)
        }
    });
    return layers;
}

export {decodeMvt};