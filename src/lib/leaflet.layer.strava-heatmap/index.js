import L from 'leaflet';
import urlViaCorsProxy from 'lib/CORSProxy';
import logging from 'lib/logging';
import {notify} from 'lib/notifications';

const StravaHeatmap = L.TileLayer.extend({

    _checkUserLoggedIn: function() {
        const message = `Для просмотра тепловой карты треков необходимо зарегистрироваться и залогиниться на сайте https://strava.com, после чего перезагрузить страницу. 
Если вы не хотите регистририваться в сервисе Strava, вы можете выбрать в настройках слои с низким разрешением "Strava heatmap lowres", они доступны всем пользователям.

You have to login at https://strava.com to be able to view tracks heatmap.
Alternatively you can select low resolution layers in layers settings.`;

        const data = {
            x: 4954,
            y: 2559,
            z: 13,
            s: this.options.subdomains[0],
        };
        const url = L.Util.template(this._url, data);
        const xhr = new XMLHttpRequest();
        xhr.open('GET', urlViaCorsProxy(url));
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 403) {
                    notify(message);
                    StravaHeatmap._loginChecked = true;
                } else if (xhr.status === 200) {
                    StravaHeatmap._loginChecked = true;
                } else {
                    logging.captureMessage('Unexpected state from strava layer', {extra: xhr});
                }
            }
        };
        xhr.send();

    },

    onAdd: function(map) {
        L.TileLayer.prototype.onAdd.call(this, map);
        if (!StravaHeatmap._loginChecked) {
            this._checkUserLoggedIn();
        }
    }
});

export {StravaHeatmap};