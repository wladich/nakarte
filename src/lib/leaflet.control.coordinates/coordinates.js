import L from 'leaflet'
import './coordinates.css';
import copyToClipboard from 'lib/clipboardCopy/clipboardCopy';
import Contextmenu from 'lib/contextmenu/contextmenu';

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

L.Control.Coordinates = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        onAdd: function(map) {
            this._map = map;
            var container = this._container = L.DomUtil.create('div', 'leaflet-control leaflet-contol-button leaflet-control-coordinates');
            L.DomEvent.disableClickPropagation(container);
            if (!L.Browser.touch) {
                L.DomEvent.disableScrollPropagation(container);
            }
            this._field_lat = L.DomUtil.create('div', 'leaflet-control-coordinates-text', container);
            this._field_lon = L.DomUtil.create('div', 'leaflet-control-coordinates-text', container);
            L.DomEvent
                .on(container, {
                        'dblclick': L.DomEvent.stop,
                        'click': this.onClick
                    }, this);
            map.on('mousemove', this.onMouseMove, this);
            this.menu = new Contextmenu([
                    {text: 'Click to copy to clipboard', callback: this.prepareForClickOnMap.bind(this)},
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
            if (window.Storage && window.localStorage) {
                active = localStorage.leafletCoordinatesActive === '1';
                fmt = localStorage.leafletCoordinatesFmt || fmt;
            }
            this.setEnabled(active);
            this.setFormat(fmt);
        },

        saveStateToStorage: function() {
            if (!(window.Storage && window.localStorage)) {
                return;
            }
            localStorage.leafletCoordinatesActive = this.isEnabled() ? '1' : '0';
            localStorage.leafletCoordinatesFmt = this.fmt;
        },

        formatCoodinate: function(value, isLat) {
            if (value === undefined) {
                return '-------';
            }

            var h, d, m, s;
            if (isLat) {
                h = (value < 0) ? 'S' : 'N';
            } else {
                h = (value < 0) ? 'W' : 'E';
            }
            if (this.fmt === 'd') {
                d = value.toFixed(5);
                d = pad(d, isLat ? 2 : 3);
                return d;
            }

            value = Math.abs(value);
            if (this.fmt === 'D') {
                d = value.toFixed(5);
                d = pad(d, isLat ? 2 : 3);
                return `${h} ${d}&deg;`;
            }
            if (this.fmt === 'DM') {
                d = Math.floor(value).toString();
                d = pad(d, isLat ? 2 : 3);
                m = ((value - d) * 60).toFixed(3);
                m = pad(m, 2);
                return `${h} ${d}&deg;${m}'`
            }
            if (this.fmt === 'DMS') {
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
            if (!this.isEnabled()) {
                return;
            }
            var lat, lng;
            if (e) {
                ({lat, lng} = e.latlng);
            }
            this._field_lat.innerHTML = this.formatCoodinate(lat, true);
            this._field_lon.innerHTML = this.formatCoodinate(lng, false);
        },

        setEnabled: function(enabled) {
            if (enabled) {
                L.DomUtil.addClass(this._container, 'expanded');
                L.DomUtil.addClass(this._map._container, 'coordinates-control-active');
            } else {
                L.DomUtil.removeClass(this._container, 'expanded');
                L.DomUtil.removeClass(this._map._container, 'coordinates-control-active');
            }
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

