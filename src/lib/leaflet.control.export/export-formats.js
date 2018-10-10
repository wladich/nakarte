import {JnxWriter} from './jnx-encoder';
import {RmapsWriter} from './rmaps-encoder';

const formats = []

function addFormat(encoder, name, hint, extension) {
    formats.push({encoder: encoder, name: name, hint: hint, extension: extension});
}

addFormat(JnxWriter, "JNX", "Garmin", "jnx");
addFormat(RmapsWriter, "RMaps", "OsmAnd", "sqlitedb");

export {formats};
