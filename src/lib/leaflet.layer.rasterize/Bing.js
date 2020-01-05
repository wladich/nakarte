import L from 'leaflet';
import {BingLayer} from '~/lib/leaflet.layer.bing';

BingLayer.include({
        waitTilesReadyToGrab: function() {
            if (this._url) {
                return Promise.resolve();
            }
            return new Promise((resolve) => {
                    let i = setInterval(() => {
                            if (this._url) {
                                clearInterval(i);
                                resolve();
                            }
                        }, 50
                    );
                }
            );
        },

        cloneForPrint: function(options) {
            return new BingLayer(this._key, L.Util.extend({}, this.options, options));
        },
    }
);
