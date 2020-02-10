import L from 'leaflet';
import {notify} from '~/lib/notifications';
import {fetch} from '~/lib/xhr-promise';

const StravaHeatmap = L.TileLayer.extend({
    options: {
        authRenewInterval: 24 * 3600 * 1000,
    },

    checkUserLoggedIn: async function() {
        const data = {
            x: 4954,
            y: 2559,
            z: 13,
            s: this.options.subdomains[0],
        };
        const url = L.Util.template(this._url, data);
        const image = new Image();
        return new Promise((resolve) => {
            image.onerror = () => resolve(false);
            image.onload = () => resolve(true);
            image.src = url;
        });
    },

    tryHeatmapLogin: async function() {
        try {
            await fetch('https://heatmap-external-a.strava.com/auth', {
                withCredentials: true,
                maxTries: 1,
            });
        } catch (e) {
            // skip error
        }
    },

    ensureUserLoggedIn: async function(showInstructions = true) {
        if (!(await this.checkUserLoggedIn())) {
            await this.tryHeatmapLogin();
            this.redraw();
            if (!(await this.checkUserLoggedIn())) {
                if (this._map && showInstructions) {
                    this.notifyUserNeedsLogin();
                }
            }
        }
    },

    notifyUserNeedsLogin: function() {
        const message = `
                Для просмотра тепловой карты треков необходимо зарегистрироваться и залогиниться на сайте
                <a title="Откроется в новом окне" target="_blank" href="https://strava.com/login">
                    https://strava.com/login</a>, после чего нажать кнопку "Ok"<br>
                Если вы не хотите регистририваться в сервисе Strava, вы можете выбрать в настройках слои с низким
                разрешением "Strava&nbsp;heatmap&nbsp;lowres", они доступны всем пользователям.<br><br>

                To use tracks heatmap you need to register and  log in at
                <a title="Will open in new window" target="_blank" href="https://strava.com/login">
                    https://strava.com/login</a>
                and press "Ok" button afterwards.
                If you do not want to register at Strava you can select low resolution maps in layers settings.`;

        notify(message, () => this.ensureUserLoggedIn(false));
    },

    onAdd: function(map) {
        L.TileLayer.prototype.onAdd.call(this, map);
        this.ensureUserLoggedIn();
        this._authRenewIntervalId = setInterval(() => this.tryHeatmapLogin(), this.options.authRenewInterval);
    },

    onRemove: function(map) {
        clearInterval(this._authRenewIntervalId);
        L.TileLayer.prototype.onRemove.call(this, map);
    },
});

export {StravaHeatmap};
