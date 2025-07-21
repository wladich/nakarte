import L from 'leaflet';
import {BingBaseLayerWithDynamicUrl} from '~/lib/leaflet.layer.bing';

BingBaseLayerWithDynamicUrl.include({
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
            return new this.constructor(L.Util.extend({}, this.options, options));
        },
    }
);
