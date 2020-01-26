import declination from './declination.json';
import {stringToArrayBuffer} from '~/lib/binary-strings';

let data;

function mod(x, n) {
    return ((x % n) + n) % n;
}

function loadData() {
    const ar1 = new Uint8Array(stringToArrayBuffer(atob(declination.array)));
    const ar2 = new Float32Array(ar1.length);
    const scale = declination.valueScale;
    const offset = declination.valueOffset;
    for (let i = 0; i < ar1.length; i++) {
        ar2[i] = ar1[i] / scale - offset;
    }
    return ar2;
}

function getArrayValue(row, col) {
    if (row < 0 || col < 0 || col >= declination.colsCount || row >= declination.rowsCount) {
        throw new Error(`Invalid col/row value col=${col} row=${row}`);
    }
    const ind = row * declination.colsCount + col;
    if (ind >= data.length) {
        throw new Error('Index value out of range');
    }
    return data[ind];
}

function getDeclination(lat, lon) {
    if (lat < declination.minLat || lat > declination.maxLat) {
        return null;
    }
    lon = mod(lon + 180, 360) - 180;
    const row1 = Math.floor((lat - declination.minLat) / declination.step);
    const row2 = row1 + 1;
    const dlat = (lat - (row1 * declination.step + declination.minLat)) / declination.step;
    let col1 = Math.floor((lon + 180) / declination.step);
    let col2 = col1 + 1;
    const dlon = (lon - (col1 * declination.step - 180)) / declination.step;
    col1 %= declination.colsCount;
    col2 %= declination.colsCount;
    let a1 = getArrayValue(row1, col1);
    let a2 = getArrayValue(row1, col2);
    const v1 = a1 * (1 - dlon) + a2 * dlon;
    if (row2 >= declination.rowsCount) {
        return v1;
    }
    a1 = getArrayValue(row2, col1);
    a2 = getArrayValue(row2, col2);
    const v2 = a1 * (1 - dlon) + a2 * dlon;
    const v = v1 * (1 - dlat) + v2 * dlat;
    return v;
}

data = loadData();

export {getDeclination};
