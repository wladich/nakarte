import L from 'leaflet';
import {fetch} from 'lib/xhr-promise';
import {notify} from 'lib/notifications';
import logging from 'lib/logging';
import safeLocalStorage from 'lib/safe-localstorage';

function parseResponse(s) {
    let data;
    data = JSON.parse(s);
    if (!data.token) {
        throw new Error('no token in response');
    }
    return data.token;
}

function getToken() {
    return fetch('https://www.ut.no/kart/HentBaatToken/', {timeout: 10000})
        .then(function(xhr) {
                try {
                    return {token: parseResponse(xhr.responseText)}
                } catch (e) {
                    logging.captureException(e, {extra: {
                        description: 'Invalid baat token',
                        response: xhr.responseText.toString().slice(0, 100)}});
                    return {error: 'Server returned invalid token for Norway map'}
                }
            },
            function(e) {
                logging.captureException(e, {extra: {description: 'failed to download baat token'}});
                return {error: `Failed to token for Norway map: ${e.message}`};
            }
        );
}

L.TileLayer.Nordeskart = L.TileLayer.extend({
        options: {
            tokenUpdateInterval: 5 * 60 * 1000
        },

        initialize: function(url, options) {
            this.__url = url;
            L.TileLayer.prototype.initialize.call(this, '', options);
        },

        baatTokenUpToDate: function() {
            let nextUpdate = 0;
            nextUpdate = parseInt(safeLocalStorage.getItem('baatTokenNextUpdate'), 10) || 0;
            return Date.now() < nextUpdate && safeLocalStorage.getItem('baatToken');
        },

        storeBaatToken: function(token) {
            safeLocalStorage.setItem('baatToken', token);
            safeLocalStorage.setItem('baatTokenNextUpdate', Date.now().toString() + this.options.tokenUpdateInterval);
        },

        periodicTokenUpdate: function() {
            if (!this._map) {
                return;
            }
            getToken().then((data) => {
                if (data.error) {
                    notify(data.error);
                } else {
                    if (data.token !== this.options.baatToken) {
                        this.options.baatToken = data.token;
                        if (!this._url) {
                            this.setUrl(this.__url);
                        }
                    }
                    this.storeBaatToken(data.token);
                }
                setTimeout(() => this.periodicTokenUpdate(), this.options.tokenUpdateInterval);
            });
        },

        onAdd: function(map) {
            const token = this.baatTokenUpToDate();
            if (token) {
                this.options.baatToken = token;
                this.setUrl(this.__url);
            }
            this.periodicTokenUpdate();
            return L.TileLayer.prototype.onAdd.call(this, map);
        }
    }
);
