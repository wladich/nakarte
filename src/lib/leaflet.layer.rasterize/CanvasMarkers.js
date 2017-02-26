import L from "leaflet";
import 'lib/leaflet.layer.canvasMarkers'
import {CanvasLayerGrabMixin} from './TileLayer';

L.Layer.CanvasMarkers.include(CanvasLayerGrabMixin);
L.Layer.CanvasMarkers.include({
        _printProgressWeight: 0.1,

        cloneMarkers: function() {
            const markers = this.rtree.all();

            function cloneMarker(marker) {
                return {
                    latlng: {lat: marker.latlng.lat, lng: marker.latlng.lng},
                    label: marker.label,
                    icon: marker.icon
                };
            }

            const markersCopy = markers.map(cloneMarker);
            return markersCopy;
        },

        cloneForPrint: function(options) {
            options = L.Util.extend({}, this.options, {iconScale: 1, labelFontSize: 12});
            return new L.Layer.CanvasMarkers(this.cloneMarkers(), options);

        }
    }
);
