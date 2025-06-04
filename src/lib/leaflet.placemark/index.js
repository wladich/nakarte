import L from 'leaflet';

import '~/lib/leaflet.hashState/leaflet.hashState';

import './style.css';

const Placemark = L.Marker.extend({
    initialize: function(latlng, title) {
        this.title = title;
        const icon = L.divIcon({
            html: '<div class="lealfet-placemark-title"></div>',
            className: 'leaflet-placemark',
        });
        L.Marker.prototype.initialize.call(this, latlng, {icon});
    },

    getTitle: function() {
        return this.title;
    },

    onAdd: function(map) {
        L.Marker.prototype.onAdd.call(this, map);
        this.getElement().children[0].innerHTML = this.title;
        this.on('click', this.onClick, this);
        map.on('click', this.onMapClick, this);
        map.suggestedPoint = {latlng: this.getLatLng(), title: this.title};
    },

    onRemove: function(map) {
        this._map.off('click', this.onMapClick, this);
        this._map.suggestedPoint = null;
        L.Marker.prototype.onRemove.call(this, map);
    },

    onClick: function() {
        this._map.fire('click', {latlng: this.getLatLng(), suggested: true});
        this._map.removeLayer(this);
    },

    onMapClick: function(e) {
        if (!e.suggested) {
            this._map.removeLayer(this);
        }
    },
});

L.Map.include({
    showPlacemark: function(latlng, title) {
        if (this._placemark) {
            this.removeLayer(this._placemark);
        }
        this._placemark = new Placemark(latlng, title);
        this.addLayer(this._placemark);
        this.fire('placemarkshow');
        this._placemark.on('remove', this.onPlacemarkRemove, this);
    },

    onPlacemarkRemove: function() {
        this._placemark = null;
        this.fire('placemarkhide');
    },
});

const PlacemarkHashStateInterface = L.Class.extend({
    includes: L.Mixin.HashState,

    stateChangeEvents: ['placemarkshow', 'placemarkhide'],

    initialize: function(map) {
        this.map = map;
        this.stateChangeEventsSource = 'map';
    },

    serializeState: function() {
        const placemark = this.map._placemark;
        if (!placemark) {
            return null;
        }
        const latlng = placemark.getLatLng();
        return [latlng.lat.toFixed(6), latlng.lng.toFixed(6), encodeURIComponent(placemark.getTitle())];
    },

    unserializeState: function(values) {
        if (!values) {
            return false;
        }
        const lat = parseFloat(values[0]);
        const lng = parseFloat(values[1]);
        const title = decodeURIComponent(values[2] ?? '');
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return false;
        }
        this.map.showPlacemark(L.latLng(lat, lng), title);
        return true;
    },
});

L.Map.include({
    getPlacemarkHashStateInterface: function() {
        return new PlacemarkHashStateInterface(this);
    },
});
