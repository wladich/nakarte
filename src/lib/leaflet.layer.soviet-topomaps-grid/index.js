import L from 'leaflet';
import './style.css';
import Contextmenu from '~/lib/contextmenu';
import copyToClipboard from '~/lib/clipboardCopy';

function zeroPad(num, size) {
    var s = String(num);
    while (s.length < size) {
        s = "0" + s;
    }
    return s;
}

const bigLetterReplacers = [
    /* eslint-disable quote-props */
    {
        '1': 'А',
        '2': 'Б',
        '3': 'В',
        '4': 'Г'
    },
    {
        '1': 'A',
        '2': 'B',
        '3': 'C',
        '4': 'D'
    }
    /* eslint-enable quote-props */
];

var Nomenclature = {
    getQuadName1m: function(column, row, join) {
        var name = '';
        if (row < 0) {
            row = -row - 1;
            name += 'x';
        }
        column += 31;
        name += 'ABCDEFGHIJKLMNOPQRSTUV'[row] + '-' + zeroPad(column, 2);
        for (var n = 1; n <= join - 1; n++) {
            name += ',' + zeroPad(column + n, 2);
        }
        return [name];
    },

    getQuadName500k: function(column, row, join) {
        var name1 = this.getQuadName1m(Math.floor(column / 2), Math.floor(row / 2), 1)[0];
        var subquad = 2 - (row & 1) * 2 + (column & 1) + 1;
        let name2 = '-' + subquad;
        if (join > 1) {
            name2 += ',' + (subquad + 1);
        }
        if (join === 4) {
            name2 +=
                ',' + this.getQuadName1m(Math.floor((column + 2) / 2), Math.floor(row / 2), 1) + '-' + subquad +
                ',' + (subquad + 1);
        }
        const names = [name1 + name2];
        for (let replacer of bigLetterReplacers) {
            let name3 = name2.replace(/\b[1-4]\b/gu, (s) => replacer[s]);
            names.push(name1 + name3);
        }
        return names;
    },

    getQuadName100k: function(column, row, join) {
        var name = this.getQuadName1m(Math.floor(column / 12), Math.floor(row / 12), 1);
        const subRow = row - Math.floor(row / 12) * 12;
        const subColumn = column - Math.floor(column / 12) * 12;
        var subquad = 132 - subRow * 12 + subColumn + 1;
        name = name + '-' + zeroPad(subquad, 3);
        if (join > 1) {
            name += ',' + zeroPad(subquad + 1, 3);
        }
        if (join === 4) {
            name += ',' + zeroPad(subquad + 2, 3) + ',' + zeroPad(subquad + 3, 3);
        }

        return [name];
    },

    getQuadName050k: function(column, row, join) {
        var name1 = this.getQuadName100k(Math.floor(column / 2), Math.floor(row / 2), 1);
        var subquad = 2 - (row & 1) * 2 + (column & 1) + 1;
        let name2 = '-' + subquad;
        if (join > 1) {
            name2 += ',' + (subquad + 1);
        }
        if (join === 4) {
            name2 += ',' + this.getQuadName100k(Math.floor((column + 2) / 2), Math.floor(row / 2), 1) + '-' +
                subquad + ',' + (subquad + 1);
        }
        const names = [name1 + name2];
        for (let replacer of bigLetterReplacers) {
            let name3 = name2.replace(/\b[1-4]\b/gu, (s) => replacer[s]);
            names.push(name1 + name3);
        }
        return names;
    },

    _getQuads: function(bounds, row_height, column_width, name_factory) {
        bounds = L.latLngBounds(bounds);
        var quads = [];
        var min_lat = Math.max(bounds.getSouth(), -84);
        var max_lat = Math.min(bounds.getNorth(), 84);
        var min_row = Math.floor(min_lat / row_height);
        const maxCols = 360 / column_width;
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
            var min_lon = bounds.getWest();
            var max_lon = bounds.getEast();
            var min_column = Math.floor((min_lon + 180) / column_width / joined_quads) * joined_quads -
                Math.round(180 / column_width);
            for (var column = min_column; column * column_width < max_lon; column += joined_quads) {
                var column_west = column * column_width;
                var column_east = column_west + column_width * joined_quads;
                var quad_bounds = L.latLngBounds([[row_south, column_west], [row_north, column_east]]);
                // shift column to positive numbers, calc modulo, shift back
                const wrappedColumn = ((column + maxCols / 2) % maxCols + maxCols) % maxCols - maxCols / 2;
                var names = name_factory(wrappedColumn, row, joined_quads);
                quads.push({names: names, bounds: quad_bounds});
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
            this.renderer = L.svg({padding: 0.5});
            this._quads = {};
            this._updateRenderer = L.Util.throttle(this._updateRenderer, 100, this);
        },

        onAdd: function(map) {
            this._map = map;
            map.on('zoomend', this._reset, this);
            map.on('move', this._update, this);
            map.on('move', this._updateRenderer, this);
            this._update();
        },

        onRemove: function(map) {
            map.off('zoomend', this._reset, this);
            map.off('move', this._update, this);
            this._cleanupQuads(true);
        },

        _addQuad: function(bounds, id, titles, color, layer, scale) {
            if (id in this._quads) {
                return;
            }
            var rect_options = {
                smoothFactor: 0,
                noClip: true,
                interactive: false,
                fill: false,
                opacity: {1: 0.7, 2: 0.4}[layer],
                color: color,
                weight: {1: 1, 2: 3}[layer],
                renderer: this.renderer
            };

            var rect = L.rectangle(bounds, rect_options);
            this.addLayer(rect);
            if (layer === 1) {
                rect.bringToBack();
            }
            var objects = [rect];
            const title = titles[0].replace(/-/gu, ' &ndash; ');
            var html = L.Util.template(`<span style="color:{color}">{title}</span>`, {color: color, title: title});
            var icon = L.divIcon({html: html, className: 'leaflet-sovietgrid-quadtitle-' + layer, iconSize: null});
            var marker = L.marker(L.latLngBounds(bounds).getCenter(), {icon: icon});
            this.addLayer(marker);
            objects.push(marker);
            this._quads[id] = objects;
            marker.on('click contextmenu', this._showContextMenu.bind(this, scale, titles));
        },

        _showContextMenu: function(scale, titles, e) {
            const scaleString = {
                '1m': '1:1 000 000',
                '500k': '1:500 000',
                '100k': '1:100 000',
                '050k': '1:50 000'
            }[scale];
            const items = [
                {text: scaleString, header: true},
                {text: 'Click name to copy to clibpoard', header: true},
                {
                    text: titles[0],
                    callback: () => {
                        copyToClipboard(titles[0], e.originalEvent);
                    }
                }
            ];
            if (titles.length > 1) {
                items.push({
                        text: titles[1] + ' <span class="leaflet-sovietgrid-lang">RUS</span>',
                        callback: () => {
                            copyToClipboard(titles[1], e.originalEvent);
                        }
                    }
                );
                items.push({
                        text: titles[2] + ' <span class="leaflet-sovietgrid-lang">LAT</span>',
                        callback: () => {
                            copyToClipboard(titles[2], e.originalEvent);
                        }
                    }
                );
            }
            const menu = new Contextmenu(items);
            menu.show(e);
        },

        _removeQuad: function(id) {
            this._quads[id].forEach(this.removeLayer.bind(this));
            delete this._quads[id];
        },

        _addQuads: function(quads, scale, color, layer) {
            quads.forEach(function(quad) {
                    var id = scale + quad.names[0];
                    this._addQuad(quad.bounds, id, quad.names, color, layer, scale);
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

        _reset: function() {
            this._update(true);
        },

        _cleanupQuads: function(reset) {
            if (reset === true) {
                this.clearLayers();
                this._quads = {};
            } else {
                var map_bbox = this._map.getBounds();
                for (var quad_id of Object.keys(this._quads)) {
                    var rect = this._quads[quad_id][0];
                    if (!map_bbox.intersects(rect.getBounds())) {
                        this._removeQuad(quad_id);
                    }
                }
            }
        },

        _updateRenderer: function() {
            if (this.renderer._map) {
                this.renderer._update();
            }
        },

        _update: function(reset) {
            this._cleanupQuads(reset);
            this._addGrid();
        }
    }
);
