import L from 'leaflet';
import openPopup from 'lib/popupWindow/popupWindow';
import './westraPasses.css';
import 'lib/leaflet.layer.canvasMarkers/canvasMarkers'
import escapeHtml from 'escape-html';
import {saveAs} from 'browser-filesaver';

L.Util.AjaxLoader = L.Class.extend({
        initialize: function(url, callback, xhrOptions) {
            this.isLoading = false;
            this.hasLoaded = false;
            this.url = url;
            this.callback = callback;
            this.options = xhrOptions;
        },

        tryLoad: function() {
            if (this.isLoading || this.hasLoaded) {
                return;
            }
            this.isLoading = true;
            var xhr = new XMLHttpRequest();
            xhr.open('GET', this.url);
            L.extend(xhr, this.options);
            var self = this;
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    if (xhr.status == 200 && xhr.response) {
                        self.callback(xhr);
                        self.hasLoaded = true;
                    } else {
                        console.log('Failed getting data for geojson layer from url', self.url)
                    }
                    self.isLoading = false;
                }
            };
            xhr.send();
        }
    }
);

L.Util.ajaxLoader = function(url, callback, options) {
    return new L.Util.AjaxLoader(url, callback, options);
};


L.GeoJSONAjax = L.GeoJSON.extend({
        options: {
            requestTimeout: 10000
        },

        initialize: function(url, options) {
            L.GeoJSON.prototype.initialize.call(this, null, options);
            this.url = url;
            this.loader = L.Util.ajaxLoader(url, this.onDataLoaded.bind(this), {
                    responseType: 'json', timeout: this.options.requestTimeout
                }
            );
        },

        onAdd: function(map) {
            L.GeoJSON.prototype.onAdd.call(this, map);
            this.loadData;
        },

        loadData: function() {
            this.loader.tryLoad();
        },

        onDataLoaded: function(xhr) {
            this.addData(xhr.response);
            this.fireEvent('loaded');
        }
    }
);


L.Layer.WestraPasses = L.Layer.extend({
        options: {
            fileRegions1: 'westra_regions_geo1.json',
            fileRegions2: 'westra_regions_geo2.json',
            scaleDependent: true
        },

        initialize: function(baseUrl, options) {
            L.setOptions(this, options);
            this.markers = new westraPasesMarkers(baseUrl);
            this.regions1 = new L.GeoJSONAjax(baseUrl + this.options.fileRegions1, {
                    className: 'westra-region-polygon',
                    onEachFeature: this._setRegionLabel.bind(this, 'regions1')
                }
            );
            this.regions2 = new L.GeoJSONAjax(baseUrl + this.options.fileRegions2, {
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

        // setZIndex: function(z) {
        //     this.markers.setZIndex(z + this.options.zIndexOffset || 0);
        // },

        setLayersVisibility: function(e) {
            if (!this._map) {
                return;
            }
            var newZoom;
            var zoomFinished = e ? (e.type != 'zoomanim') : true;
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
            this.regions1.loadData();
            this.regions2.loadData();
            this.markers.loadData();
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
        },

        clone: function() {
            return this.markers.clone();
        }

    }
);

var westraPasesMarkers = L.Layer.CanvasMarkers.extend({
        options: {
            filePasses: 'westra_passes.json',
            scaleDependent: true
        },

        readyEvent: 'rendered',

        initialize: function(baseUrl, options) {
            L.Layer.CanvasMarkers.prototype.initialize.call(this, null, options);
            this._baseUrl = baseUrl;
            this.on('markerclick', this.showPassDescription, this);
            this.on('load', this._onLoad, this);
            this.loader = L.Util.ajaxLoader(baseUrl + this.options.filePasses,
                this._loadMarkers.bind(this),
                {responseType: 'json', timeout: 30000}
            );
        },

        clone: function() {
            var options = {};
            L.extend(options, this.options, {iconScale: 1.2, labelFontSize: 12});
            return new westraPasesMarkers(this._baseUrl, options);
        },

        loadData: function() {
            this.loader.tryLoad();
        },

        onAdd: function(map) {
            L.Layer.CanvasMarkers.prototype.onAdd.call(this, map);
            this.loadData();
        },

        _onLoad: function() {
            if (this._loaded) {
                this.fire('rendered');
            }
        },

        _makeTooltip: function(marker) {
            var properties = marker.properties,
                toolTip = properties.grade || '';
            if (toolTip && properties.elevation) {
                toolTip += ', '
            }
            toolTip += properties.elevation || '';
            if (toolTip) {
                toolTip = ' (' + toolTip + ')';
            }
            toolTip = (properties.name || 'без названия') + toolTip;
            toolTip = (properties.is_summit ? 'Вершина ' : 'Перевал ') + toolTip;
            return toolTip;
        },

        _passToGpx: function(marker) {
            var gpx = [],
                label = marker.tooltip;
            if (typeof label === 'function') {
                label = label(marker);
            }
            label = escapeHtml(label);
            gpx.push('<?xml version="1.0" encoding="UTF-8" standalone="no" ?>');
            gpx.push(
                '<gpx xmlns="http://www.topografix.com/GPX/1/1" creator="http://nakarte.tk" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">'
            );
            gpx.push('<wpt lat="' + marker.latlng.lat.toFixed(6) + '" lon="' + marker.latlng.lng.toFixed(6) + '">');
            gpx.push('<name>');
            gpx.push(label);
            gpx.push('</name>');
            gpx.push('</wpt>');
            gpx.push('</gpx>');
            gpx = gpx.join('');
            var filename = marker.properties.name || 'Без названия';
            saveAs(new Blob([gpx], {type: 'application/gpx+xml'}), filename + '.gpx');
        },

        _passToKml: function(marker) {
            var kml = [],
                label = marker.tooltip;
            if (typeof label === 'function') {
                label = label(marker);
            }
            label = escapeHtml(label);
            kml.push('<?xml version="1.0" encoding="UTF-8"?>');
            kml.push('<kml xmlns="http://www.opengis.net/kml/2.2">');
            kml.push('<Placemark>');
            kml.push('<name>');
            kml.push(label);
            kml.push('</name>');
            kml.push('<Point>');
            kml.push('<coordinates>');
            kml.push(marker.latlng.lng.toFixed(6) + ',' + marker.latlng.lat.toFixed(6) + ',0');
            kml.push('</coordinates>');
            kml.push('</Point>');
            kml.push('</Placemark>');
            kml.push('</kml>');
            kml = kml.join('');
            var filename = marker.properties.name || 'Без названия';
            saveAs(new Blob([kml], {type: 'application/vnd.google-earth.kml+xml'}), filename + '.kml');
        },

        _makeIcon: function(marker) {
            var className;
            className = 'westra-pass-marker ';
            if (marker.properties.is_summit) {
                className += 'westra-pass-marker-summit';
            } else {
                className += 'westra-pass-marker-' + marker.properties.grade_eng;
            }
            return L.Util.iconFromBackgroundUrl(className);
        },

        _loadMarkers: function(xhr) {
            var markers = [],
                features = xhr.response,
                feature, i, marker, className;
            for (i = 0; i < features.length; i++) {
                feature = features[i];
                marker = {
                    latlng: {
                        lat: feature.latlon[0],
                        lng: feature.latlon[1],
                    },
                    label: feature.name || "",
                    icon: this._makeIcon,
                    tooltip: this._makeTooltip.bind(this),
                    properties: feature
                };
                markers.push(marker);
            }
            this.addMarkers(markers);
            this._loaded = true;
        },


        showPassDescription: function(e) {
            if (!this._map) {
                return
            }
            var properties = e.marker.properties,
                latLng = e.marker.latlng,
                url, i, comment;
            var description = ['<table class="pass-details">'];
            description.push('<tr><td>');
            description.push(properties.is_summit ? 'Вершина ' : 'Перевал ');
            description.push('</td><td>');
            description.push(properties.name || "название неизвестно");
            description.push('</td></tr>');
            if (properties.altnames) {
                description.push('<tr><td>');
                description.push('Другие названия');
                description.push('</td><td>');
                description.push(properties.altnames);
                description.push('</td></tr>');
            }
            description.push('<tr><td>');
            description.push('Категория');
            description.push('</td><td>');
            description.push(properties.grade || "неизвестная");
            description.push('</td></tr><tr><td>');
            description.push('Высота');
            description.push('</td><td>');
            description.push(properties.elevation ? (properties.elevation + " м") : "неизвестная");
            description.push('</td></tr>');
            if (!properties.is_summit) {
                description.push('<tr><td>');
                description.push('Соединяет');
                description.push('</td><td>');
                description.push(properties.connects || "неизвестнo");
                description.push('</td></tr>');
            }
            description.push('<tr><td>');
            description.push('Характеристика склонов');
            description.push('</td><td>');
            description.push(properties.slopes || "неизвестная");
            description.push('</td></tr>');

            description.push('<tr><td>');
            description.push('Координаты');
            description.push('</td><td>');
            description.push('<table class="westra-passes-description-coords">' +
                '<tr><td>Широта</td><td>Долгота</td></tr>' +
                '<tr><td>' + latLng.lat.toFixed(5) + '</td><td>' + latLng.lng.toFixed(5) + '</td>' +
                '<td><a id="westra-pass-gpx" title="Сохранить">gpx</a></td>' +
                '<td><a id="westra-pass-kml" title="Сохранить">kml</a></td></tr></table>'
            );
            description.push('</td></tr>');

            description.push('<tr><td>');
            description.push('На сайте Вестры');
            description.push('</td><td>');
            url = 'http://westra.ru/passes/Passes/' + properties.id;
            description.push(
                '<a id="westra-pass-link" href="' + url + '">' + url + '</a>'
            );
            description.push('</td></tr>');

            description.push('<tr><td>');
            description.push('Добавил');
            description.push('</td><td>');
            description.push(properties.author || "неизвестно");
            description.push('</td></tr>');

            if (properties.comments) {
                description.push('<tr><td>');
                description.push('Комментарии');
                description.push('</td><td>');
                for (i = 0; i < properties.comments.length; i++) {
                    comment = properties.comments[i];
                    description.push('<p class="westra-passes-description-comment">');
                    if (comment.user) {
                        description.push(
                            '<span class="westra-passes-description-comment-author">' + comment.user + ':</span>'
                        );
                    }
                    description.push(comment.content + '</p>');
                }
                description.push('</td></tr>');
            }
            description.push('</table>');
            var popUp = this._map.openPopup(description.join(''), latLng, {maxWidth: 500});
            document.getElementById('westra-pass-link').onclick = function() {
                openPopup(url, 650);
                return false;
            };
            document.getElementById('westra-pass-gpx').onclick = function() {
                this._passToGpx(e.marker);
                return false;
            }.bind(this);
            document.getElementById('westra-pass-kml').onclick = function() {
                this._passToKml(e.marker);
                return false;
            }.bind(this);
        }
    }
);


