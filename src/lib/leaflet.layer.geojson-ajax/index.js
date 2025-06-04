import L from 'leaflet';
import {fetch} from '~/lib/xhr-promise';
import {notify} from '~/lib/notifications';
import * as logging from '~/lib/logging';

L.Layer.GeoJSONAjax = L.GeoJSON.extend({
        options: {
            requestTimeout: 30000
        },

        initialize: function(url, options) {
            L.GeoJSON.prototype.initialize.call(this, null, options);
            this.url = url;
        },

        // Promise can be rejected if json invalid or addData fails
        loadData: function() {
            if (this._loadStarted) {
                return;
            }
            this._loadStarted = true;
            fetch(this.url, {timeout: this.options.requestTimeout})
                .then(
                    (xhr) => {
                        this.addData(JSON.parse(xhr.response));
                    },
                    (e) => {
                        logging.captureException(e, 'failed to get geojson');
                        notify(`Failed to get GeoJSON data from ${this.url}: ${e.message}`);
                    }
                );
        },

        onAdd: function(map) {
            L.GeoJSON.prototype.onAdd.call(this, map);
            this.loadData();
        }
    }
);

