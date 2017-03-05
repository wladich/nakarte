import L from 'leaflet';
import {fetch} from 'lib/xhr-promise';
import {notify} from 'lib/notifications';
import logging from 'lib/logging';

L.Layer.GeoJSONAjax = L.GeoJSON.extend({
        options: {
            requestTimeout: 30000
        },

        initialize: function(url, options) {
            L.GeoJSON.prototype.initialize.call(this, null, options);
            this.url = url;
        },

        loadData: function() {
            if (this._loadStarted) {
                return;
            }
            this._loadStarted = true;
            fetch(this.url, {responseType: 'json', timeout: this.options.requestTimeout})
                .then(
                    (xhr) => this.addData(xhr.response),
                    (e) => {
                        logging.captureException(e, {extra: {
                            description: 'failed to get geojson',
                            url: this.url,
                            status: e.xhr.status
                        }});
                        notify(`Failed to get GeoJSON data from ${this.url}: ${e.message}`);
                    }
                )
        },

        onAdd: function(map) {
            L.GeoJSON.prototype.onAdd.call(this, map);
            this.loadData();
        }
    }
);

