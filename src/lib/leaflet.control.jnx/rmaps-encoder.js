import L from 'leaflet';
import SQL from 'vendored/github.com/kripken/sql.js';

function rmapsTileInfo(latLngBounds, zoom) { // https://stackoverflow.com/a/23058284
    function toRad(x) {
        return x * Math.PI / 180;
    }
    var lat = (latLngBounds._southWest.lat + latLngBounds._northEast.lat) / 2
    var lon = (latLngBounds._southWest.lng + latLngBounds._northEast.lng) / 2
    var xtile = parseInt(Math.floor( (lon + 180) / 360 * (1<<zoom) ));
    var ytile = parseInt(Math.floor( (1 - Math.log(Math.tan(toRad(lat)) + 1 / Math.cos(toRad(lat))) / Math.PI) / 2 * (1<<zoom) ));
    return {z: (17-zoom), x: xtile, y: ytile};
}

const RmapsWriter = L.Class.extend({
        initialize: function(productName, productId, zOrder) {
            this.db = new SQL.Database();
            this.db.run("CREATE TABLE tiles (x int, y int, z int, s int, image blob, PRIMARY KEY (x,y,z,s))")
            this.db.run("CREATE TABLE info (maxzoom Int, minzoom Int)")
        },

        addTile: function(tileData, level, latLngBounds) {
            let tileInfo = rmapsTileInfo(latLngBounds, level);
            this.db.prepare("insert into tiles (x,y,z,s,image) VALUES (?,?,?,?,?)").run([tileInfo.x, tileInfo.y, tileInfo.z, 0, new Uint8Array(tileData)]);
        },

        getJnx: function() {
            this.db.run("INSERT INTO info (maxzoom, minzoom) SELECT max(z), min(z) from tiles");
            let blob = new Blob([this.db.export()]);
            this.db.close();
            return blob;
        }
    }
);

export {RmapsWriter};
