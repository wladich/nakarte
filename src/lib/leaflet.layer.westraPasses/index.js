import L from 'leaflet';
import './westraPasses.css';
import '~/lib/leaflet.layer.geojson-ajax';
import {WestraPassesMarkers} from './westraPassesMarkers';

L.Layer.WestraPasses = L.Layer.extend({
        options: {
            fileCoverage: 'westra_coverage.json',
            fileLabels1: 'westra_regions_labels1.json',
            fileLabels2: 'westra_regions_labels2.json',
            scaleDependent: true,
            labels2Zoom: 6,
            markersZoom: 10,
            labels1Zoom: 2

        },

        initialize: function(baseUrl, options) {
            L.setOptions(this, options);
            this.markers = new WestraPassesMarkers(baseUrl, options.markersOptions);
            this.coverage = new L.Layer.GeoJSONAjax(baseUrl + this.options.fileCoverage, {
                className: 'westra-coverage-polygon',
                onEachFeature: this._setEventsForRegion.bind(this)
            });
            this.labels1 = new L.Layer.GeoJSONAjax(baseUrl + this.options.fileLabels1, {
                pointToLayer: this._makeMarker,
                onEachFeature: this._setEventsForRegion.bind(this)
            });
            this.labels2 = new L.Layer.GeoJSONAjax(baseUrl + this.options.fileLabels2, {
                pointToLayer: this._makeMarker,
                onEachFeature: this._setEventsForRegion.bind(this)
            });
        },

        _setEventsForRegion: function(feature, layer) {
            layer.on('click', this._onRegionClick, this);
        },

        _makeMarker: function(geojsonPoint, latlng) {
            const icon = L.divIcon({
                    className: 'westra-region-label',
                    html: '<span>' + geojsonPoint.properties.name + '</span>'
                }
            );
            const marker = L.marker(latlng, {icon: icon});
            return marker;
        },

        _onRegionClick: function(e) {
            const layer = e.target;
            const latlng = layer.getLatLng ? layer.getLatLng() : e.latlng;
            const zoom = this._map.getZoom();
            let newZoom;
            if (zoom < this.options.labels2Zoom) {
                newZoom = this.options.labels2Zoom;
            } else {
                newZoom = this.options.markersZoom;
            }
            this._map.setView(latlng, newZoom);
        },

        setLayersVisibility: function(e) {
            if (!this._map) {
                return;
            }
            var newZoom;
            var zoomFinished = e ? (e.type !== 'zoomanim') : true;
            if (e && e.zoom !== undefined) {
                newZoom = e.zoom;
            } else {
                newZoom = this._map.getZoom();
            }
            if (newZoom < this.options.labels1Zoom) {
                this._map.removeLayer(this.markers);
                this._map.addLayer(this.coverage);
                this._map.removeLayer(this.labels1);
                this._map.removeLayer(this.labels2);
            } else if (newZoom < this.options.labels2Zoom) {
                this._map.removeLayer(this.markers);
                this._map.addLayer(this.coverage);
                this._map.addLayer(this.labels1);
                this._map.removeLayer(this.labels2);
            } else if (newZoom < this.options.markersZoom) {
                this._map.removeLayer(this.markers);
                this._map.addLayer(this.coverage);
                this._map.removeLayer(this.labels1);
                this._map.addLayer(this.labels2);
            } else {
                if (zoomFinished) {
                    this._map.addLayer(this.markers);
                }
                this._map.removeLayer(this.coverage);
                this._map.removeLayer(this.labels1);
                this._map.removeLayer(this.labels2);
            }
        },

        onAdd: function(map) {
            this._map = map;
            this.markers.loadData();
            this.coverage.loadData();
            this.labels1.loadData();
            this.labels2.loadData();
            this.setLayersVisibility();
            map.on('zoomend', this.setLayersVisibility, this);
            map.on('zoomanim', this.setLayersVisibility, this);
        },

        onRemove: function() {
            this._map.removeLayer(this.markers);
            this._map.removeLayer(this.coverage);
            this._map.removeLayer(this.labels1);
            this._map.removeLayer(this.labels2);
            this._map.off('zoomend', this.setLayersVisibility, this);
            this._map.off('zoomanim', this.setLayersVisibility, this);
            this._map = null;
        }
    }
);

