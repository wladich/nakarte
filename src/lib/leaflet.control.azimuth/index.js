import L from 'leaflet';
import ko from 'knockout';
import 'lib/leaflet.control.commons';
import layout from './control.html';
import 'lib/controls-styles/controls-styles.css';
import './style.css';
import {getDeclination} from 'lib/magnetic-declination';
//FIXME: replace with vendored version
import 'leaflet-rotatedmarker';
import iconPointerStart from './pointer.svg';
import iconPointerEnd from './pointer-end.svg';
import 'lib/leaflet.control.elevation-profile';

function radians(x) {
    return x / 180 * Math.PI;
}

function degrees(x) {
    return x / Math.PI * 180;
}

function calcAzimuth(latlng1, latlng2) {
    const lat1 = radians(latlng1.lat);
    const lat2 = radians(latlng2.lat);
    const lng1 = radians(latlng1.lng);
    const lng2 = radians(latlng2.lng);

    const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat2) * Math.cos(lat2) * Math.cos(lng2 - lng1);
    let brng = Math.atan2(y, x);
    brng = degrees(brng);
    return brng;
}


function calcAngle(latlng1, latlng2) {
    const p1 = L.Projection.SphericalMercator.project(latlng1);
    const p2 = L.Projection.SphericalMercator.project(latlng2);
    const delta = p2.subtract(p1);
    const angle = Math.atan2(delta.x, delta.y);
    return degrees(angle);
}

function roundAzimuth(a) {
    return (Math.round(a) + 360) % 360
}

L.Control.Azimuth = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        initialize: function(options) {
            L.Control.prototype.initialize.call(this, options);
            this.trueAzimuth = ko.observable(null);
            this.magneticAzimuth = ko.observable(null);
            this.distance = ko.observable(null);
            this.points = {
                start: null,
                end: null
            };
            const iconStart = L.icon({iconUrl: iconPointerStart, iconSize: [30, 30]});
            const iconEnd = L.icon({iconUrl: iconPointerEnd, iconSize: [30, 30]});
            this.markers = {
                start: L.marker([0, 0], {icon: iconStart, draggable: true, which: 'start', rotationOrigin: 'center center'})
                    .on('drag', this.onMarkerDrag, this)
                    .on('click', L.DomEvent.stopPropagation),
                end: L.marker([0, 0], {icon: iconEnd, draggable: true, which: 'end', rotationOrigin: 'center center'})
                    .on('drag', this.onMarkerDrag, this)
                    .on('click', L.DomEvent.stopPropagation)
            };
            this.azimuthLine = L.polyline([], {interactive: false, weight: 1.5});
        },

        onAdd: function(map) {
            this._map = map;
            const container = this._container =
                L.DomUtil.create('div', 'leaflet-control leaflet-control-button leaflet-control-azimuth');
            this._stopContainerEvents();
            container.innerHTML = layout;
            container.title = "Measure bearing, display line of sight";
            ko.applyBindings(this, container);
            L.DomEvent.on(container, 'click', this.onClick, this);
            return container;
        },

        onClick: function() {
            this.setEnabled(true);
        },

        onMinimizeButonClick: function(e) {
            setTimeout(() => this.setEnabled(false), 0);
        },

        onMarkerDrag: function(e) {
            const marker = e.target;
            this.setPoints({[marker.options.which]: marker.getLatLng()});
        },

        setEnabled: function(enabled) {
            if (!!enabled === this.isEnabled()) {
                return;
            }
            if (enabled) {
                L.DomUtil.addClass(this._container, 'expanded');
                L.DomUtil.addClass(this._map._container, 'azimuth-control-active');
                this._map.on('click', this.onMapClick, this);
            } else {
                L.DomUtil.removeClass(this._container, 'expanded');
                L.DomUtil.removeClass(this._map._container, 'azimuth-control-active');
                this._map.off('click', this.onMapClick, this);
                this.setPoints({start: null, end: null});
            }

        },

        isEnabled: function() {
            return L.DomUtil.hasClass(this._container, 'expanded');
        },

        setPoints: function(points) {
            Object.assign(this.points, points);
            points = this.points;
            if (points.start) {
                this.markers.start
                    .setLatLng(points.start)
                    .addTo(this._map);
            } else {
                this.markers.start.removeFrom(this._map);
            }
            if (points.end) {
                this.markers.end
                    .setLatLng(points.end)
                    .addTo(this._map);
            } else {
                this.markers.end.removeFrom(this._map);
            }
            if (points.start && points.end) {
                const angle = calcAngle(points.start, points.end);
                this.markers.start
                    .setRotationAngle(angle);
                this.markers.end
                    .setRotationAngle(angle);
                this.azimuthLine
                    .setLatLngs([[points.start, points.end]])
                    .addTo(this._map);
            } else {
                this.markers.start.setRotationAngle(0);
                this.azimuthLine.removeFrom(this._map);
            }
            this.updateValuesDisplay();
        },

        updateValuesDisplay: function() {
            if (this.points.start && this.points.end) {
                const points = this.points;
                const azimuth = calcAzimuth(points.start, points.end);
                this.trueAzimuth(roundAzimuth(azimuth));
                const declination = getDeclination(points.start.lat, points.start.lng);
                if (declination !== null) {
                    this.magneticAzimuth(roundAzimuth(azimuth - declination));
                } else {
                    this.magneticAzimuth(null);
                }
                this.distance(points.start.distanceTo(points.end));

            } else {
                this.distance(null);
                this.trueAzimuth(null);
                this.magneticAzimuth(null);
            }
        },

        onMapClick: function(e) {
            if (!this.points.start && !this.points.end) {
                this.setPoints({start: e.latlng})
            } else if (this.points.start && !this.points.end) {
                this.setPoints({end: e.latlng})
            } else if (this.points.start && this.points.end) {
                this.setPoints({start: e.latlng, end: null})
            }
        },

        onProfileButtonClick: function() {
            if (this.elevationControl) {
                this.elevationControl.removeFrom(this._map);
            }

            this.elevationControl = new L.Control.ElevationProfile(this._map, [this.points.start, this.points.end ], {
                    samplingInterval: 100
                }
            );
        }

    }
);

