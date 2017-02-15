import L from "leaflet";
import 'lib/leaflet.layer.westraPasses';
import {WestraPassesMarkers} from 'lib/leaflet.layer.westraPasses/westraPassesMarkers';
import {CanvasLayerGrabMixin} from './TileLayer';
import 'lib/leaflet.layer.canvasMarkers'

const WestraPrint = L.Layer.CanvasMarkers.extend({
    includes: CanvasLayerGrabMixin,

    initialize: function(srcLayer, options) {
        this.srcLayer = srcLayer;
        L.Layer.CanvasMarkers.prototype.initialize.call(this, null, options);
    },

    waitTilesReadyToGrab: function() {
        let promise;
        if (this.srcLayer._dataLoaded) {
            promise = Promise.resolve(null);
        } else {
            // FIXME: handle data load errors
            promise = new Promise((resolve) => {
                this.srcLayer.once('data-loaded', resolve);
            })
        }
        return promise.then(() => {
            this.addMarkers(this.srcLayer.rtree.all());
        })
    },
});

L.Layer.WestraPasses.addInitHook(function() {
    this.markers.options.print = this.options.print;
    this.options.print = false;
});

WestraPassesMarkers.include({
    cloneForPrint: function (options) {
        return new WestraPrint(this, L.Util.extend(
            {}, this.options, {iconScale: 1.5, labelFontSize: 14}, options));
    }
});
