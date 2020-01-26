import L from "leaflet";
import '~/lib/leaflet.layer.westraPasses';
import {WestraPassesMarkers} from '~/lib/leaflet.layer.westraPasses/westraPassesMarkers';
import '~/lib/leaflet.layer.canvasMarkers';
import './CanvasMarkers';

L.Layer.WestraPasses.addInitHook(function() {
    this.markers.options.print = this.options.print;
    this.options.print = false;
});

WestraPassesMarkers.include({
    waitDataReady: function() {
        if (this._dataLoaded) {
            return Promise.resolve();
        }
        return new Promise((resolve) => {
           this.on('data-loaded', resolve);
        });
    },

    cloneForPrint: function(options) {
        options = L.Util.extend({}, this.options, options);
        return new WestraPassesMarkers(this._baseUrl, options);
    },

    getTilesInfo: async function(printOptions) {
        await this.waitDataReady();
        return L.Layer.CanvasMarkers.prototype.getTilesInfo.call(this, printOptions);
    }
});
