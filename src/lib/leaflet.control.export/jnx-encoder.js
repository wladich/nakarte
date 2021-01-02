import L from 'leaflet';
import {BinStream} from './binary-stream';

function jnxCoordinates(extents) {
    function toJnx(x) {
        return Math.round(x / 180.0 * 0x7fffffff);
    }

    return [toJnx(extents.north), toJnx(extents.east), toJnx(extents.south), toJnx(extents.west)];
}

const JnxWriter = L.Class.extend({
        initialize: function(productName, productId, zOrder) {
            this.tiles = {};
            this.productName = productName || 'Raster map';
            this.productId = productId || 0;
            this.zOrder = zOrder;
        },

        addTile: function(tileData, level, latLngBounds) {
            this.tiles[level] = this.tiles[level] || [];
            tileData = new Blob([tileData]).slice(2);
            const extents = {
                west: latLngBounds.getWest(),
                north: latLngBounds.getNorth(),
                south: latLngBounds.getSouth(),
                east: latLngBounds.getEast(),

            };
            this.tiles[level].push({data: tileData, extents: extents});
        },

        getJnx: function() {
            const HEADER_SIZE = 52,
                LEVEL_INFO_SIZE = 17,
                TILE_INFO_SIZE = 28;

            let totalTilesCount = 0;
            for (let levelTiles of Object.values(this.tiles)) {
                totalTilesCount += levelTiles.length;
            }
            if (totalTilesCount === 0) {
                throw new Error('No tiles collected, JNX is empty');
            }
            if (totalTilesCount > 50000) {
                throw new Error('Too many tiles found (more then 50000)');
            }

            let west = 1e10,
                east = -1e10,
                north = -1e10,
                south = 1e10,
                levels_n = Object.keys(this.tiles).length,
                level, tiles, extents,
                i, tile;
            for (let levelTiles of Object.values(this.tiles)) {
                for (let tile of levelTiles) {
                    west = (west < tile.extents.west) ? west : tile.extents.west;
                    east = (east > tile.extents.east) ? east : tile.extents.east;
                    north = (north > tile.extents.north) ? north : tile.extents.north;
                    south = (south < tile.extents.south) ? south : tile.extents.south;
                }
            }
            const stream = new BinStream(1024, true);
            // header
            stream.writeInt32(4); // version
            stream.writeInt32(0); // device id
            extents = jnxCoordinates({south: south, north: north, west: west, east: east});
            stream.writeInt32(extents[0]); // north
            stream.writeInt32(extents[1]); // west
            stream.writeInt32(extents[2]); // south
            stream.writeInt32(extents[3]); // east
            stream.writeInt32(levels_n); // number of zoom levels
            stream.writeInt32(0); // expiration date
            stream.writeInt32(this.productId);
            stream.writeInt32(0); // tiles CRC32
            stream.writeInt32(0); // signature version
            stream.writeUint32(0); // signature offset
            stream.writeInt32(this.zOrder);
            stream.seek(HEADER_SIZE + LEVEL_INFO_SIZE * levels_n);
            // map description
            stream.writeInt32(9); // section version
            stream.writeString('12345678-1234-1234-1234-123456789ABC', true); // GUID
            stream.writeString(this.productName, true);
            stream.writeString('', true);
            stream.writeInt16(this.productId);
            stream.writeString(this.productName, true);
            stream.writeInt32(levels_n);
            // levels descriptions
            for (level of Object.keys(this.tiles)) {
                stream.writeString('', true);
                stream.writeString('', true);
                stream.writeString('', true);
                stream.writeInt32(level);
            }
            let tileDescriptorOffset = stream.tell();
            // level info
            let jnxScale;
            stream.seek(HEADER_SIZE);
            for (level of Object.keys(this.tiles)) {
                level = parseInt(level, 10);
                stream.writeInt32(this.tiles[level].length);
                stream.writeUint32(tileDescriptorOffset);
                // jnxScale = JnxScales[level + 3];
                jnxScale = 34115555 / (2 ** level) * Math.cos((north + south) / 2 / 180 * Math.PI) / 1.1;
                stream.writeInt32(jnxScale);
                stream.writeInt32(2);
                stream.writeUint8(0);
                tileDescriptorOffset += TILE_INFO_SIZE * this.tiles[level].length;
            }
            // tiles descriptors
            stream.seek(stream.size);
            let tileDataOffset = tileDescriptorOffset;
            for (level of Object.keys(this.tiles)) {
                tiles = this.tiles[level];
                for (i = 0; i < tiles.length; i++) {
                    tile = tiles[i];
                    extents = jnxCoordinates(tile.extents);
                    stream.writeInt32(extents[0]); // north
                    stream.writeInt32(extents[1]); // west
                    stream.writeInt32(extents[2]); // south
                    stream.writeInt32(extents[3]); // east
                    stream.writeInt16(256); // width
                    stream.writeInt16(256); // height
                    stream.writeInt32(tile.data.size);
                    stream.writeUint32(tileDataOffset);
                    tileDataOffset += tile.data.size;
                }
            }

            const blob = [];
            blob.push(stream.getBuffer());
            for (level of Object.keys(this.tiles)) {
                tiles = this.tiles[level];
                for (i = 0; i < tiles.length; i++) {
                    tile = tiles[i];
                    blob.push(tile.data);
                }
            }

            blob.push('BirdsEye');
            return new Blob(blob);
        }
    }
);

export {JnxWriter};
