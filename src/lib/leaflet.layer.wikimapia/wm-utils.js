import urlViaCorsProxy from 'lib/CORSProxy';
import 'lib/xhr-promise';


// (1233,130,5) -> "032203"
function getTileId({x, y, z}) {
    let id = [];
    y = (1 << z) - y - 1;
    z += 1;
    while (z) {
        id.push((x & 1) + (y & 1) * 2);
        x >>= 1;
        y >>= 1;
        z--;
    }
    return id.reverse().join('');
}


function tileIdToCoords(tileId) {
    const z = tileId.length - 1;
    let x = 0,
        y = 0;
    for (let i = 0; i < tileId.length; i++) {
        let c = parseInt(tileId[i], 10);
        x <<= 1;
        y <<= 1;
        x += c & 1;
        y += c >> 1;
    }
    y = (1 << z) - y - 1;
    return {x, y, z};
}

function getWikimapiaTileCoords(coords, viewTileSize) {
    let z = coords.z - 2;
    if (z < 0) {
        z = 0;
    }
    if (z > 15) {
        z = 15;
    }
    const q = 2 ** (z - coords.z + Math.log2(viewTileSize / 256));
    let x = Math.floor(coords.x * q),
        y = Math.floor(coords.y * q);
    return {x, y, z};
}

function fetchTile(tileId) {
    let url = tileId.replace(/(\d{3})(?!$)/g, '$1/'); // "033331022" -> "033/331/022"
    url = 'http://wikimapia.org/z1/itiles/' + url + '.xy?342342';

    url = urlViaCorsProxy(url);
    let {promise, requestId} = window.xmlHttpRequestQueue.put(url, {timeout: 30000});
    promise = promise.then((xhr) => {
            if (xhr.status === 0) {
                throw new Error(`Network error while fetching wikimapia data, request "${url}"`);
            }
            if (xhr.status !== 200) {
                throw new Error(`Wikimapia server responded with status ${xhr.status}, request "${url}"`);
            }
            return xhr.response;
        }
    );
    const abort = () => {
        window.xmlHttpRequestQueue.remove(requestId);
    };
    // return {promise, abort};
    return promise;

}

function decodeTitles(s) {
    const titles = {};
    for (let title of s.split('\x1f')) {
        if (title.length > 2) {
            let langCode = title.charCodeAt(0) - 32;
            titles[langCode.toString()] = title.substring(1);
        }
    }
    return titles;
}

function chooseTitle(titles) {
    var popularLanguages = ['1', '0', '3', '2', '5', '4', '9', '28', '17', '27'];
    for (let langCode of popularLanguages) {
        if (langCode in titles) {
            return titles[langCode];
        }
    }
    for (let langCode of Object.keys(titles)) {
        return titles[langCode];
    }
}

function decodePolygon(s) {
    var i = 0,
        coords = [],
        lat = 0,
        lng = 0;
    while (i < s.length) {
        var p, l = 0,
            c = 0;
        do {
            p = s.charCodeAt(i++) - 63;
            c |= (p & 31) << l;
            l += 5;
        } while (p >= 32);
        lng += c & 1 ? ~(c >> 1) : c >> 1;
        l = 0;
        c = 0;
        do {
            p = s.charCodeAt(i++) - 63;
            c |= (p & 31) << l;
            l += 5;
        } while (p >= 32);
        lat += c & 1 ? ~(c >> 1) : c >> 1;
        coords.push([lat / 1e6, lng / 1e6]);
    }
    return coords;
}

function parseTile(s) {
    const tile = {};
    const places = tile.places = [];
    const lines = s.split('\n');
    if (lines.length < 1) {
        throw new Error('No data in tile');
    }
    const fields = lines[0].split('|');
    const tileId = fields[0];
    if (!tileId || !tileId.match(/^[0-3]+$/)) {
        throw new Error('Invalid tile header');
    }
    tile.tileId = tileId;
    tile.coords = tileIdToCoords(tileId);
    tile.hasChildren = fields[1] === '1';

    //FIXME: ignore some errors
    for (let line of lines.slice(2)) {
        const place = {};
        const fields = line.split('|');
        if (fields.length < 6) {
            continue;
        }
        let placeId = fields[0];
        if (!placeId.match(/^\d+$/)) {
            // throw new Error('Invalid place id');
            continue;
        }
        place.id = parseInt(placeId, 10);
        place.title = chooseTitle(decodeTitles(fields[5]));
        if (fields[6] !== '1') {
            throw new Error(`Unknown wikimapia polygon encoding type: "${fields[6]}"`);
        }

        let bounds = fields[2].match(/^([-\d]+),([-\d]+),([-\d]+),([-\d]+)$/);
        if (!bounds) {
            throw new Error('Invalid place bounds');
        }
        place.boundsWESN = bounds.slice(1).map((x) => {
                return parseInt(x, 10) / 1e7
            }
        );

        let coords = fields.slice(7).join('|');

        coords = decodePolygon(coords);
        if (coords.length < 3) {
            throw new Error(`Polygon has ${coords.length} points`);
        }
        place.polygon = coords;
        places.push(place);
    }
    return tile;
}

export default {getTileId, getWikimapiaTileCoords, fetchTile, parseTile}