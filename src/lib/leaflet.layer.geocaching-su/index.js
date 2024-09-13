import L from 'leaflet';
import {fetch} from '~/lib/xhr-promise';
import '~/lib/leaflet.layer.canvasMarkers';
import * as logging from '~/lib/logging';
import {notify} from '~/lib/notifications';
import {openPopupWindow} from '~/lib/popup-window';
import icon from './tr.png';

const markerIcon = {url: icon, center: [10, 10]};

const GeocachingSu = L.Layer.CanvasMarkers.extend({
    options: {
        scaleDependent: true
    },

    initialize: function(url, options) {
        this.dataUrl = url;
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
                    logging.captureException(e, 'failed to get geocaching kml');
                    notify('Failed to get geocaching data');
                }
            );
    },

    cloneMarker: function(marker) {
        return {
            latlng: {lat: marker.latlng.lat, lng: marker.latlng.lng},
            label: marker.label,
            icon: marker.icon,
            _label: marker._label
        };
    },

    _loadMarkers: function(data) {
        function getLabel(marker, zoom) {
            return zoom >= 10 ? marker._label : null;
        }

        const markers = data.map(([label, cacheId, lat, lng]) => ({
                latlng: {lat, lng},
                _label: label,
                label: getLabel,
                icon: markerIcon,
                cacheId
        }));
        this.addMarkers(markers);
        this._dataLoaded = true;
        this.fire('data-loaded');
    },

    openCachePage: function(e) {
        const url = `https://geocaching.su/?pn=101&cid=${e.marker.cacheId}`;
        openPopupWindow(url, 900, 'geocaching_su');
    }
});

export {GeocachingSu};
