import L from 'leaflet';
import {fetch} from 'lib/xhr-promise';
import {formatXhrError, notify} from 'lib/notifications';

function parseResponse(s) {
    let data;
    try {
        data = JSON.parse(s);
    } catch (e) {
        throw new Error('invalid JSON');
    }
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
                    console.log(e);
                    return {error: 'Server returned invalid token for Norway map'}
                }
            },
            function(xhr) {
                return {error: formatXhrError(xhr, 'token for Norway map')}
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
            if (window.localStorage) {
                nextUpdate = parseInt(localStorage.getItem('baatTokenNextUpdate'), 10) || 0;
            }
            return Date.now() < nextUpdate && localStorage.getItem('baatToken');
        },

        storeBaatToken: function(token) {
            if (window.localStorage) {
                localStorage.setItem('baatToken', token);
                localStorage.setItem('baatTokenNextUpdate', Date.now().toString() + this.options.tokenUpdateInterval);
            }
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
