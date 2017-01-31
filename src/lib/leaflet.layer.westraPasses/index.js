import L from 'leaflet';
import './westraPasses.css';
import 'lib/leaflet.layer.geojson-ajax';
import {WestraPassesMarkers} from './westraPassesMarkers';

L.Layer.WestraPasses = L.Layer.extend({
        options: {
            fileRegions1: 'westra_regions_geo1.json',
            fileRegions2: 'westra_regions_geo2.json',
            scaleDependent: true
        },

        initialize: function(baseUrl, options) {
            L.setOptions(this, options);
            this.markers = new WestraPassesMarkers(baseUrl);
            this.regions1 = new L.Layer.GeoJSONAjax(baseUrl + this.options.fileRegions1, {
                    className: 'westra-region-polygon',
                    onEachFeature: this._setRegionLabel.bind(this, 'regions1')
                }
            );
            this.regions2 = new L.Layer.GeoJSONAjax(baseUrl + this.options.fileRegions2, {
                    className: 'westra-region-polygon',
                    onEachFeature: this._setRegionLabel.bind(this, 'regions2')
                }
            );
        },
        _setRegionLabel: function(layerName, feature, layer) {
            var latlon = layer.getBounds().getCenter();
            var icon = L.divIcon({
                    className: 'westra-region-label',
                    html: '<span>' + feature.properties.name + '</span>'
                }
            );
            var labelMarker = L.marker(latlon, {icon: icon});
            this[layerName].addLayer(labelMarker);
            function zoomToRegion() {
                this._map.fitBounds(layer.getBounds());
            }

            layer.on('click', zoomToRegion, this);
            labelMarker.on('click', zoomToRegion, this);
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
            if (newZoom < 2) {
                this._map.removeLayer(this.markers);
                this._map.removeLayer(this.regions1);
                this._map.removeLayer(this.regions2);
            } else if (newZoom < 7) {
                this._map.removeLayer(this.markers);
                this._map.addLayer(this.regions1);
                this._map.removeLayer(this.regions2);
            }
            else if (newZoom < 10) {
                this._map.removeLayer(this.regions1);
                this._map.addLayer(this.regions2);
                this._map.removeLayer(this.markers);
            } else {
                if (zoomFinished) {
                    this._map.addLayer(this.markers);
                }
                this._map.removeLayer(this.regions1);
                this._map.removeLayer(this.regions2);
            }
        },

        onAdd: function(map) {
            this._map = map;
            this.markers.loadData();
            this.regions1.loadData();
            this.regions2.loadData();
            this.setLayersVisibility();
            map.on('zoomend', this.setLayersVisibility, this);
            map.on('zoomanim', this.setLayersVisibility, this);
        },

        onRemove: function() {
            this._map.removeLayer(this.markers);
            this._map.removeLayer(this.regions1);
            this._map.removeLayer(this.regions2);
            this._map.off('zoomend', this.setLayersVisibility, this);
            this._map.off('zoomanim', this.setLayersVisibility, this);
            this._map = null;
        }
    }
);



