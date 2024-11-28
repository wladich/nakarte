import L from "leaflet";
import '~/lib/leaflet.layer.mountainPasses';
import {MountainPassesMarkers} from '~/lib/leaflet.layer.mountainPasses/mountainPassesMarkers';
import '~/lib/leaflet.layer.canvasMarkers';
import './CanvasMarkers';

L.Layer.MountainPasses.addInitHook(function() {
    this.markers.options.print = this.options.print;
    this.options.print = false;
});

MountainPassesMarkers.include({
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
        return new this.constructor(this.url, options);
    },

    getTilesInfo: async function(printOptions) {
        await this.waitDataReady();
        return L.Layer.CanvasMarkers.prototype.getTilesInfo.call(this, printOptions);
    }
});
