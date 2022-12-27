import L from 'leaflet';

// (1233,130,5) -> "032203"
function getTileId({x, y, z}) {
    let id = [];
    y = (1 << z) - y - 1;
    z += 1;
    while (z) {
        id.push((x & 1) + (y & 1) * 2);
        x >>= 1;
        y >>= 1;
        z -= 1;
    }
    return id.reverse().join('');
}

function makeTilePath(coords) {
    const
        tileId = getTileId(coords),
        urlPath = tileId.replace(/(\d{3})(?!$)/gu, '$1/'); // "033331022" -> "033/331/022"
    return `z1/itiles/${urlPath}.xy?342342`;
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

function tileCoordsEqual(tile1, tile2) {
    return (
        tile1.x === tile2.x &&
        tile1.y === tile2.y &&
        tile1.z === tile2.z
    );
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
    return "";
}

function decodePolygon(s) {
    var i = 0,
        coords = [],
        lat = 0,
        lng = 0;
    while (i < s.length) {
        var p,
            l = 0,
            c = 0;
        do {
            p = s.charCodeAt(i++) - 63; // eslint-disable-line no-plusplus
            c |= (p & 31) << l;
            l += 5;
        } while (p >= 32);
        lng += c & 1 ? ~(c >> 1) : c >> 1;
        l = 0;
        c = 0;
        do {
            p = s.charCodeAt(i++) - 63; // eslint-disable-line no-plusplus
            c |= (p & 31) << l;
            l += 5;
        } while (p >= 32);
        lat += c & 1 ? ~(c >> 1) : c >> 1;
        coords.push([lat / 1e6, lng / 1e6]);
    }
    return coords;
}

function makeCoordsLocal(line, tileCoords, projectObj) {
    const {x: tileX, y: tileY, z: tileZ} = tileCoords,
        x0 = tileX * 1024,
        y0 = tileY * 1024,
        localCoords = [];
    let latlon, p;
    for (let i = 0; i < line.length; i++) {
        latlon = line[i];
        p = projectObj.project(latlon, tileZ + 2);
        p.x -= x0;
        p.y -= y0;
        localCoords.push(p);
    }
    return localCoords;
}

function asap() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

function simplifyPolygon(latlngs, tileCoords, tileHasChildren, projectObj) {
    const
        x = tileCoords.x * 1024,
        y = tileCoords.y * 1024,
        p0 = projectObj.unproject([x, y], tileCoords.z + 2),
        p1 = projectObj.unproject([x + 1, y + 1], tileCoords.z + 2);
    let pixelDegSize = p0.lat - p1.lat;
    if (!tileHasChildren && tileCoords.z < 15) {
        pixelDegSize /= (1 << (15 - tileCoords.z));
    }
    let points = [];
    for (let i = 0; i < latlngs.length; i++) {
        let ll = latlngs[i];
        points.push({x: ll[0], y: ll[1]});
    }
    points = L.LineUtil.simplify(points, pixelDegSize * 2);
    latlngs = [];
    for (let i = 0; i < points.length; i++) {
        let p = points[i];
        latlngs.push([p.x, p.y]);
    }
    return latlngs;
}

async function parseTile(s, projectObj, requestedCoords) {
    const tile = {};
    const places = tile.places = [];
    const lines = s.split('\n');
    if (lines.length < 1) {
        throw new Error('No data in tile');
    }
    const fields = lines[0].split('|');
    const tileId = fields[0];
    if (!tileId || !tileId.match(/^[0-3]+$/u)) {
        throw new Error('Invalid tile header');
    }
    tile.tileId = tileId;
    tile.coords = tileIdToCoords(tileId);
    tile.hasChildren = tileCoordsEqual(requestedCoords, tile.coords);

    // FIXME: ignore some errors
    let prevTime = Date.now();
    for (let line of lines.slice(2)) {
        let curTime = Date.now();
        if (curTime - prevTime > 20) {
            await asap();
            prevTime = Date.now();
        }
        const place = {};
        const fields = line.split('|');
        if (fields.length < 6) {
            continue;
        }
        let placeId = fields[0];
        if (!placeId.match(/^\d+$/u)) {
            // throw new Error('Invalid place id');
            continue;
        }
        place.id = parseInt(placeId, 10);
        place.title = chooseTitle(decodeTitles(fields[5]));
        if (fields[6] !== '1') {
            throw new Error(`Unknown wikimapia polygon encoding type: "${fields[6]}"`);
        }

        let bounds = fields[2].match(/^([-\d]+),([-\d]+),([-\d]+),([-\d]+)$/u);
        if (!bounds) {
            throw new Error('Invalid place bounds');
        }
        place.boundsWESN = bounds.slice(1).map((x) => parseInt(x, 10) / 1e7);

        let coords = fields.slice(7).join('|');

        coords = decodePolygon(coords);
        if (coords.length < 3) {
            throw new Error(`Polygon has ${coords.length} points`);
        }
        let polygon = simplifyPolygon(coords, tile.coords, tile.hasChildren, projectObj);
        place.polygon = polygon;
        place.localPolygon = makeCoordsLocal(polygon, tile.coords, projectObj);
        places.push(place);
    }
    return tile;
}

// быстрое проектирование полигонов
// TODO: каждые 50-100 мс отдавать управление
// projectPlacesForZoom: function(tile, viewZoom) {
//     if (viewZoom < tile.coords.z) {
//         throw new Error('viewZoom < tile.zoom');
//     }
//     if (tile.places && tile.places[0] && tile.places[0].projectedPolygons &&
//         tile.places[0].projectedPolygons[viewZoom]) {
//         return;
//     }
//     const virtualTileSize = 256 * (2 ** (viewZoom - tile.coords.z));
//     const p1 = L.point([tile.coords.x * virtualTileSize, tile.coords.y * virtualTileSize]),
//         p2 = L.point([(tile.coords.x + 1) * virtualTileSize, (tile.coords.y + 1) * virtualTileSize]),
//         latlng1 = this._map.unproject(p1, viewZoom),
//         latlng2 = this._map.unproject(p2, viewZoom),
//         lat0 = latlng1.lat,
//         lng0 = latlng1.lng;
//     const qx = (p2.x - p1.x) / (latlng2.lng - latlng1.lng),
//         qy = (p2.y - p1.y) / (latlng2.lat - latlng1.lat);
//
//     const offsets = [],
//         offsetsStep = virtualTileSize / 64;
//     const y0 = p1.y;
//     for (let y = -virtualTileSize; y <= 2 * virtualTileSize; y += offsetsStep) {
//         let lat = y / qy + lat0;
//         let offset = this._map.project([lat, lng0], viewZoom).y - y0 - y;
//         offsets.push(offset);
//     }
//
//     let ll, offset, offsetPos, offsetIndex, offsetIndexDelta, x, y;
//     const x0 = p1.x;
//     for (let place of tile.places) {
//         let polygon = place.polygon;
//         if (polygon.length < 3) {
//             continue;
//         }
//         let projectedPolygon = [];
//         for (let i = 0; i < polygon.length; i++) {
//             ll = polygon[i];
//             x = (ll[1] - lng0) * qx;
//             y = (ll[0] - lat0) * qy;
//             offsetPos = (y + virtualTileSize) / offsetsStep;
//             offsetIndex = Math.floor(offsetPos);
//             offsetIndexDelta = offsetPos - offsetIndex;
//             offset = offsets[offsetIndex] * (1 - offsetIndexDelta) + offsets[offsetIndex + 1] * offsetIndexDelta;
//             projectedPolygon.push([x + x0, y + offset + y0]);
//         }
//         projectedPolygon = projectedPolygon.map(L.point);
//         projectedPolygon = L.LineUtil.simplify(projectedPolygon, 1.5);
//         if (!place.projectedPolygons) {
//             place.projectedPolygons = [];
//         }
//         place.projectedPolygons[viewZoom] = projectedPolygon;
//     }
// },

export {getTileId, getWikimapiaTileCoords, parseTile, makeTilePath};
