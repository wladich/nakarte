import L from 'leaflet'
import './coordinates.css';
import copyToClipboard from 'lib/clipboardCopy';
import Contextmenu from 'lib/contextmenu';
import 'lib/leaflet.control.commons';
import safeLocalStorage from 'lib/safe-localstorage';
import 'lib/controls-styles/controls-styles.css';

function pad(s, n) {
    var j = s.indexOf('.');
    if (j === -1) {
        j = s.length;
    }
    var zeroes = (n - j);
    if (zeroes > 0) {
        s = Array(zeroes + 1).join('0') + s;
    }
    return s;
}

function mod(n, m) {
    return ((n % m) + m) % m;
}

function normalizeLongitude(lng) {
    return mod(lng + 180, 360) - 180;
}

L.Control.Coordinates = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        formatNames: {
            'd': 'ddd.ddddd',
            'D': 'ddd.ddddd&deg',
            'DM': 'ddd&deg;mm.mmm\'',
            'DMS': 'ddd&deg;mm\'ss.s"'
        },

        onAdd: function(map) {
            this._map = map;
            var container = this._container =
                L.DomUtil.create('div', 'leaflet-control leaflet-control-button leaflet-control-coordinates');
            container.title = "Show coordinates at cursor";
            this._stopContainerEvents();
            this._field_lat = L.DomUtil.create('div', 'leaflet-control-coordinates-text', container);
            this._field_lon = L.DomUtil.create('div', 'leaflet-control-coordinates-text', container);
            L.DomEvent
                .on(container, {
                        'click': this.onClick
                    }, this
                );
            this.menu = new Contextmenu([
                    {text: 'Click map to copy coordinates to clipboard', callback: this.prepareForClickOnMap.bind(this)},
                    '-',
                    {text: '&plusmn;ddd.ddddd', callback: this.onMenuSelect.bind(this, 'd')},
                    {text: 'ddd.ddddd&deg;', callback: this.onMenuSelect.bind(this, 'D')},
                    {text: 'ddd&deg;mm.mmm\'', callback: this.onMenuSelect.bind(this, 'DM')},
                    {text: 'ddd&deg;mm\'ss.s"', callback: this.onMenuSelect.bind(this, 'DMS')}
                ]
            );
            this.loadStateFromStorage();
            this.onMouseMove();
            L.DomEvent.on(container, 'contextmenu', this.onRightClick, this);
            return container;
        },

        loadStateFromStorage: function() {
            var active = false,
                fmt = 'D';
            active = safeLocalStorage.leafletCoordinatesActive === '1';
            fmt = safeLocalStorage.leafletCoordinatesFmt || fmt;
            this.setEnabled(active);
            this.setFormat(fmt);
        },

        saveStateToStorage: function() {
            safeLocalStorage.leafletCoordinatesActive = this.isEnabled() ? '1' : '0';
            safeLocalStorage.leafletCoordinatesFmt = this.fmt;
        },

        formatCoodinate: function(value, isLat, fmt) {
            if (value === undefined || isNaN(value)) {
                return '-------';
            }
            fmt = fmt || this.fmt;
            var h, d, m, s;
            if (isLat) {
                h = (value < 0) ? 'S' : 'N';
            } else {
                h = (value < 0) ? 'W' : 'E';
            }
            if (fmt === 'd') {
                d = value.toFixed(5);
                d = pad(d, isLat ? 2 : 3);
                return d;
            }

            value = Math.abs(value);
            if (fmt === 'D') {
                d = value.toFixed(5);
                d = pad(d, isLat ? 2 : 3);
                return `${h} ${d}&deg;`;
            }
            if (fmt === 'DM') {
                d = Math.floor(value).toString();
                d = pad(d, isLat ? 2 : 3);
                m = ((value - d) * 60).toFixed(3);
                m = pad(m, 2);
                return `${h} ${d}&deg;${m}'`
            }
            if (fmt === 'DMS') {
                d = Math.floor(value).toString();
                d = pad(d, isLat ? 2 : 3);
                m = Math.floor((value - d) * 60).toString();
                m = pad(m, 2);
                s = ((value - d - m / 60) * 3600).toFixed(2);
                s = pad(s, 2);
                return `${h} ${d}&deg;${m}'${s}"`;
            }
        },

        onMenuSelect: function(fmt) {
            this.setFormat(fmt);
            this.saveStateToStorage();
        },

        setFormat: function(fmt) {
            this.fmt = fmt;
            this.onMouseMove();
        },

        onMouseMove: function(e) {
            var lat, lng;
            if (e) {
                ({lat, lng} = e.latlng);
            }
            lng = normalizeLongitude(lng);
            this._field_lat.innerHTML = this.formatCoodinate(lat, true);
            this._field_lon.innerHTML = this.formatCoodinate(lng, false);
        },

        setEnabled: function(enabled) {
            if (!!enabled === this.isEnabled()) {
                return;
            }
            if (enabled) {
                L.DomUtil.addClass(this._container, 'expanded');
                L.DomUtil.addClass(this._map._container, 'coordinates-control-active');
                this._map.on('mousemove', this.onMouseMove, this);
                this._map.on('contextmenu', this.onMapRightClick, this);
            } else {
                L.DomUtil.removeClass(this._container, 'expanded');
                L.DomUtil.removeClass(this._map._container, 'coordinates-control-active');
                this._map.off('contextmenu', this.onMapRightClick, this);
                this._map.off('mousemove', this.onMouseMove, this);
            }
        },

        onMapRightClick: function(e) {
            const items = [{text: '<b>Copy coordinates to clipboard</b>', header: true}, '-'];

            const lat = e.latlng.lat,
                lng = normalizeLongitude(e.latlng.lng);

            for (let fmt of ['d', 'D', 'DM', 'DMS']) {
                let strLat = this.formatCoodinate(lat, true, fmt);
                let strLng = this.formatCoodinate(lng, false, fmt);
                let s = `${strLat} ${strLng}`;
                items.push({
                        text: `${s} <span class="leaflet-coordinates-menu-fmt">${this.formatNames[fmt]}</span>`,
                        callback: () => {
                            copyToClipboard(s.replace(/&deg;/g, '°'), e.originalEvent);
                        }
                    }
                )
            }
            const menu = new Contextmenu(items);
            menu.show(e);
        },

        isEnabled: function() {
            return L.DomUtil.hasClass(this._container, 'expanded');
        },

        onClick: function(e) {
            this.setEnabled(!this.isEnabled());
            this.saveStateToStorage();
            this.onMouseMove();
        },

        onRightClick: function(e) {
            this.menu.show(e);
        },

        onMapClick: function(e) {
            var s = this.formatCoodinate(e.latlng.lat, true) + ' ' + this.formatCoodinate(e.latlng.lng, false);
            s = s.replace(/&deg;/g, '°');
            copyToClipboard(s, e.originalEvent);
        },

        prepareForClickOnMap: function() {
            this._map.once('click', this.onMapClick, this);
        }



        // TODO: onRemove

    }
);

