import L from 'leaflet';
import './style.css';

function zeroPad(num, size) {
    var s = num + "";
    while (s.length < size) {
        s = "0" + s;
    }
    return s;
}

var Nomenclature = {
    getQuadName1m: function(column, row, join) {
        var name = '';
        if (row < 0) {
            row = -row - 1;
            name = name + 'x';
        }
        column = column + 31;
        name += 'ABCDEFGHIJKLMNOPQRSTUV'[row] + ' &ndash; ' + zeroPad(column, 2);
        for (var n = 1; n <= join - 1; n++) {
            name += ',' + zeroPad(column + n, 2);
        }
        return name;
    },

    getQuadName500k: function(column, row, join) {
        var name = this.getQuadName1m(Math.floor(column / 2), Math.floor(row / 2), 1);
        var subquad = 2 - (row & 1) * 2 + (column & 1) + 1;
        name = name + ' &ndash; ' + subquad;
        if (join > 1) {
            name += ',' + (subquad + 1);
        }
        if (join == 4) {
            name +=
                ',' + this.getQuadName1m(Math.floor((column + 2) / 2), Math.floor(row / 2), 1) + ' &ndash; ' + subquad +
                ',' + (subquad + 1);
        }
        return name;
    },

    getQuadName100k: function(column, row, join) {
        var name = this.getQuadName1m(Math.floor(column / 12), Math.floor(row / 12), 1);
        var subquad = 132 - (row % 12) * 12 + (column % 12) + 1;
        name = name + ' &ndash; ' + zeroPad(subquad, 3);
        if (join > 1) {
            name += ',' + zeroPad(subquad + 1, 3);
        }
        if (join == 4) {
            name += ',' + zeroPad(subquad + 2, 3) + ',' + zeroPad(subquad + 3, 3);
        }

        return name;
    },

    getQuadName050k: function(column, row, join) {
        var name = this.getQuadName100k(Math.floor(column / 2), Math.floor(row / 2), 1);
        var subquad = 2 - (row & 1) * 2 + (column & 1) + 1;
        name = name + ' &ndash; ' + subquad;
        if (join > 1) {
            name += ',' + (subquad + 1);
        }
        if (join == 4) {
            name += ',' + this.getQuadName100k(Math.floor((column + 2) / 2), Math.floor(row / 2), 1) + ' &ndash; ' +
                subquad + ',' + (subquad + 1);
        }
        return name;
    },

    _getQuads: function(bounds, row_height, column_width, name_factory) {
        bounds = L.latLngBounds(bounds);
        var quads = [];
        var min_lat = Math.max(bounds.getSouth(), -84);
        var max_lat = Math.min(bounds.getNorth(), 84);
        var min_row = Math.floor(min_lat / row_height);
        for (var row = min_row; row * row_height < max_lat; row++) {
            var row_south = row * row_height;
            var row_north = row_south + row_height;
            var joined_quads;
            if (row_south >= 76 || row_north <= -76) {
                joined_quads = 4;
            } else if (row_south >= 60 || row_north <= -60) {
                joined_quads = 2;
            } else {
                joined_quads = 1;
            }
            var min_lon = Math.max(bounds.getWest(), -180);
            var max_lon = Math.min(bounds.getEast(), 180);
            var min_column = Math.floor((min_lon + 180) / column_width / joined_quads) * joined_quads -
                Math.round(180 / column_width);
            for (var column = min_column; column * column_width < max_lon; column += joined_quads) {
                var column_west = column * column_width;
                var column_east = column_west + column_width * joined_quads;
                var quad_bounds = L.latLngBounds([[row_south, column_west], [row_north, column_east]]);
                var name = name_factory(column, row, joined_quads);
                quads.push({'name': name, 'bounds': quad_bounds});
            }
        }
        return quads;
    },

    getQuads1m: function(bounds) {
        return this._getQuads(bounds, 4, 6, this.getQuadName1m);
    },

    getQuads500k: function(bounds) {
        return this._getQuads(bounds, 2, 3, this.getQuadName500k.bind(this));
    },

    getQuads100k: function(bounds) {
        return this._getQuads(bounds, 4 / 12, 6 / 12, this.getQuadName100k.bind(this));
    },

    getQuads050k: function(bounds) {
        return this._getQuads(bounds, 4 / 12 / 2, 6 / 12 / 2, this.getQuadName050k.bind(this));
    }


};

L.Layer.SovietTopoGrid = L.LayerGroup.extend({
        options: {},

        initialize: function(options) {
            L.LayerGroup.prototype.initialize.call(this);
            L.Util.setOptions(this, options);
            this._updatePathViewport = L.Util.throttle(this.__updatePathViewport, 100, this);
            this._quads = {};
        },

        onAdd: function(map) {
            this._map = map;
            map.on('zoomend', this._reset, this);
            map.on('move', this._update, this);
            this._update();
        },

        onRemove: function(map) {
            map.off('zoomend', this._reset, this);
            map.off('move', this._update, this);
            this._cleanupQuads(true);
        },

        _addQuad: function(bounds, id, title, color, layer) {
            if (id in this._quads) {
                return;
            }
            var rect_options = {
                smoothFactor: 0,
                noClip: true,
                clickable: false,
                fill: false,
                opacity: {1: 0.7, 2: 0.4}[layer],
                color: color,
                weight: {1: 1, 2: 3}[layer]
            };
            var rect = L.rectangle(bounds, rect_options);
            this.addLayer(rect);
            if (layer == 1) {
                rect.bringToBack();
            }
            var objects = [rect];
            var html = L.Util.template('<span style="color:{color}">{title}</span>', {color: color, title: title});
            var icon = L.divIcon({html: html, className: 'leaflet-sovietgrid-quadtitle-' + layer, iconSize: null});
            var marker = L.marker(L.latLngBounds(bounds).getCenter(), {icon: icon});
            this.addLayer(marker);
            objects.push(marker);
            this._quads[id] = objects;
        },

        _removeQuad: function(id) {
            var objects = this._quads[id];
            for (var i = 0; i < objects.length; i++) {
                this.removeLayer(objects[i]);
            }
            delete this._quads[id];
        },


        _addQuads: function(quads, id_prefix, color, layer) {
            quads.forEach(function(quad) {
                    var id = id_prefix + quad.name;
                    this._addQuad(quad.bounds, id, quad.name, color, layer);
                }.bind(this)
            );
        },

        _addGrid: function() {
            var quads;
            var layer;
            var map_bbox = this._map.getBounds();
            var zoom = this._map.getZoom();

            if (zoom >= 10) {
                quads = Nomenclature.getQuads050k(map_bbox);
                layer = (zoom >= 12) ? 2 : 1;
                this._addQuads(quads, '050k', '#50d', layer);
            }

            if (zoom >= 8 && zoom < 12) {
                quads = Nomenclature.getQuads100k(map_bbox);
                layer = (zoom >= 10) ? 2 : 1;
                this._addQuads(quads, '100k', '#d50', layer);
            }


            if (zoom >= 6 && zoom < 10) {
                quads = Nomenclature.getQuads500k(map_bbox);
                layer = (zoom >= 8) ? 2 : 1;
                this._addQuads(quads, '500k', '#099', layer);
            }

            if (zoom >= 4 && zoom < 8) {
                layer = (zoom >= 6) ? 2 : 1;
                quads = Nomenclature.getQuads1m(map_bbox);
                this._addQuads(quads, '1m', 'blue', layer);
            }
        },

        __updatePathViewport: function() {
            try {
                this._map._updateSvgViewport();
            } catch (e) {
            }
        },

        _reset: function() {
            this._update(true);
        },

        _cleanupQuads: function(reset) {
            if (reset === true) {
                this.clearLayers();
                this._quads = {};
            } else {
                var map_bbox = this._map.getBounds();
                for (var quad_id in this._quads) {
                    var rect = this._quads[quad_id][0];
                    if (!map_bbox.intersects(rect.getBounds())) {
                        this._removeQuad(quad_id);
                    }
                }
            }
        },

        _update: function(reset) {
            var t = new Date().getTime();
            this._cleanupQuads(reset);
            this._updatePathViewport();
            this._addGrid();
            t = new Date().getTime() - t;
        }
    }
);
