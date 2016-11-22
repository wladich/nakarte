import L from 'leaflet';
import {prepareXMLHttpRequestPromise} from 'lib/xhr-promise/xhr-promise';

L.Layer.GeoJSONAjax = L.GeoJSON.extend({
        options: {
            requestTimeout: 30000
        },

        initialize: function(url, options) {
            L.GeoJSON.prototype.initialize.call(this, null, options);
            this.url = url;
            const {promise, send} = prepareXMLHttpRequestPromise(
                this.url, {responseType: 'json', timeout: this.options.requestTimeout});
            promise.then((xhr) => this.addData(xhr.response))
            this._loadData = send;
        },

        loadData: function() {
            if (this._loadStarted) {
                return;
            }
            this._loadStarted = true;
            this._loadData();
        },

        onAdd: function(map) {
            L.GeoJSON.prototype.onAdd.call(this, map);
            this.loadData();
        }
    }
);

