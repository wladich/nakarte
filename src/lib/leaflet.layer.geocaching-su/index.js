import L from 'leaflet';
import {fetch} from 'lib/xhr-promise';
import 'lib/leaflet.layer.canvasMarkers';
import logging from 'lib/logging';
import {notify} from 'lib/notifications';
import './style.css';
import iconFromBackgroundImage from 'lib/iconFromBackgroundImage';
import {openPopupWindow} from 'lib/popup-window';


const GeocachingSu = L.Layer.CanvasMarkers.extend({
    options: {
        scaleDependent: true
    },

    dataUrl: 'https://nakarte.tk/geocachingSu/geocaching_su.json',

    initialize: function(options) {
        L.Layer.CanvasMarkers.prototype.initialize.call(this, null, options);
        this.on('markerclick', this.openCachePage, this);
    },

    onAdd: function(map) {
        L.Layer.CanvasMarkers.prototype.onAdd.call(this, map);
        this._loadData();
    },

    _loadData: function() {
        if (this._downloadStarted) {
            return;
        }
        this._downloadStarted = true;
        fetch(this.dataUrl, {responseType: 'json'})
            .then(
                (xhr) => this._loadMarkers(xhr.response),
                (e) => {
                    this._downloadStarted = false;
                    logging.captureException(e, {
                            extra: {
                                description: 'failed to get geocaching kml',
                                url: this.url,
                                status: e.xhr.status
                            }
                        }
                    );
                    notify('Failed to get Westra passes data');
                }
            );
    },

    cloneMarker: function(marker) {
        return {
            latlng: {lat: marker.latlng.lat, lng: marker.latlng.lng},
            label: marker.label,
            icon: marker.icon,
            _label: marker._label
        }
    },

    _loadMarkers: function(data) {
        const icon = iconFromBackgroundImage('geocaching-icon');

        const getLabel = function(marker, zoom) {
            return zoom >= 10 ? marker._label : null;
        };

        const markers = data.map(([label, url, lat, lng]) => {
            return {
                latlng: {lat, lng},
                _label: label,
                label: getLabel,
                icon, url
            }
        });
        this.addMarkers(markers);
        this._dataLoaded = true;
        this.fire('data-loaded');
    },

    openCachePage: function(e) {
        openPopupWindow(e.marker.url, 900, 'geocaching_su');
    }
});


export {GeocachingSu}