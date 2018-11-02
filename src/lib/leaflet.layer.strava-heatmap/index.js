import L from 'leaflet';
import {notify} from 'lib/notifications';

const StravaHeatmap = L.TileLayer.extend({

    _checkUserLoggedIn: function() {
        const message = `
            Для просмотра тепловой карты треков необходимо зарегистрироваться и залогиниться на сайте
            <a title="Откроется в новом окне" target="_blank" href="https://strava.com/login">https://strava.com/login</a>, 
            затем открыть карту на оригинальном сайте
            <a title="Откроется в новом окне" target="_blank" href="https://www.strava.com/heatmap">https://www.strava.com/heatmap</a>, 
            после чего перезагрузить эту страницу.<br>
            Если вы не хотите регистририваться в сервисе Strava, вы можете выбрать в настройках слои с низким 
            разрешением "Strava&nbsp;heatmap&nbsp;lowres", они доступны всем пользователям.<br><br>

            You have to login at
            <a title="Will open in new window" target="_blank" href="https://strava.com/login">https://strava.com/login</a>
             and then open <a title="Will open in new window" target="_blank" href="https://www.strava.com/heatmap">https://www.strava.com/heatmap</a> to be able to view tracks heatmap.
            Alternatively you can select low resolution layers in layers settings.`;

        const data = {
            x: 4954,
            y: 2559,
            z: 13,
            s: this.options.subdomains[0],
        };
        const url = L.Util.template(this._url, data);
        const image = new Image();

        image.onload = function() {
            StravaHeatmap._loginChecked = true;
        };

        image.onerror = function() {
            if (!StravaHeatmap._loginChecked) {
                StravaHeatmap._loginChecked = true;
                notify(message);
            }
        };

        image.src = url;

    },

    onAdd: function(map) {
        L.TileLayer.prototype.onAdd.call(this, map);
        if (!StravaHeatmap._loginChecked) {
            this._checkUserLoggedIn();
        }
    }
});

export {StravaHeatmap};