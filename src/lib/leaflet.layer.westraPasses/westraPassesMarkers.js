import L from 'leaflet';
import '~/lib/leaflet.layer.canvasMarkers';
import {openPopupWindow} from '~/lib/popup-window';
import escapeHtml from 'escape-html';
import {saveAs} from '~/vendored/github.com/eligrey/FileSaver';
import iconFromBackgroundImage from '~/lib/iconFromBackgroundImage';
import {fetch} from '~/lib/xhr-promise';
import {notify} from '~/lib/notifications';
import * as logging from '~/lib/logging';

const WestraPassesMarkers = L.Layer.CanvasMarkers.extend({
        options: {
            filePasses: 'westra_passes2.json',
            scaleDependent: true
        },

        initialize: function(baseUrl, options) {
            L.Layer.CanvasMarkers.prototype.initialize.call(this, null, options);
            this.on('markerclick', this.showPassDescription, this);
            this._baseUrl = baseUrl;
            this.url = baseUrl + this.options.filePasses;
        },

        loadData: async function() {
            if (this._downloadStarted) {
                return;
            }
            this._downloadStarted = true;
            let xhr;
            try {
                xhr = await fetch(this.url);
            } catch (e) {
                this._downloadStarted = false;
                logging.captureException(e, 'failed to get westra passes');
                notify('Failed to get Westra passes data');
            }

            const {passes, regions} = JSON.parse(xhr.response);
            this.regions = regions;
            this._createMarkers(passes);
        },

        _createMarkers: function(passes) {
            const markers = [];
            for (const pass of passes) {
                const marker = {
                    latlng: {
                        lat: pass.latlon[0],
                        lng: pass.latlon[1]
                    },
                    label: pass.name || "",
                    icon: this._makeIcon,
                    tooltip: this._makeTooltip.bind(this),
                    properties: pass
                };
                markers.push(marker);
            }
            this.addMarkers(markers);
            this._dataLoaded = true;
            this.fire('data-loaded');
        },

        onAdd: function(map) {
            L.Layer.CanvasMarkers.prototype.onAdd.call(this, map);
            this.loadData();
        },

        _makeTooltip: function(marker) {
            var properties = marker.properties,
                toolTip = properties.grade || '';
            if (toolTip && properties.elevation) {
                toolTip += ', ';
            }
            toolTip += properties.elevation || '';
            if (toolTip) {
                toolTip = ' (' + toolTip + ')';
            }
            toolTip = (properties.name || 'без названия') + toolTip;
            toolTip = (properties.is_summit ? 'Вершина ' : 'Перевал ') + toolTip;
            return toolTip;
        },

        _passToGpx: function(marker) {
            let label = marker.tooltip;
            if (typeof label === 'function') {
                label = label(marker);
            }
            label = escapeHtml(label);
            const gpx = `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
                <gpx xmlns="http://www.topografix.com/GPX/1/1"
                     creator="http://nakarte.me"
                     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd"
                     version="1.1">
                    <wpt lat="${marker.latlng.lat.toFixed(6)}" lon="${marker.latlng.lng.toFixed(6)}">
                        <name>${label}</name>
                    </wpt>
                </gpx>
            `;
            var filename = marker.properties.name || 'Без названия';
            saveAs(new Blob([gpx], {type: 'application/gpx+xml'}), filename + '.gpx', true);
        },

        _passToKml: function(marker) {
            let label = marker.tooltip;
            if (typeof label === 'function') {
                label = label(marker);
            }
            label = escapeHtml(label);
            const kml = `<?xml version="1.0" encoding="UTF-8"?>
                <kml xmlns="http://www.opengis.net/kml/2.2">
                    <Placemark>
                        <name>${label}</name>
                        <Point>
                            <coordinates>
                                ${marker.latlng.lng.toFixed(6)},${marker.latlng.lat.toFixed(6)},0
                            </coordinates>
                        </Point>
                    </Placemark>
                </kml>
            `;
            var filename = marker.properties.name || 'Без названия';
            saveAs(new Blob([kml], {type: 'application/vnd.google-earth.kml+xml'}), filename + '.kml', true);
        },

        _makeIcon: function(marker) {
            var className;
            className = 'westra-pass-marker ';
            if (marker.properties.is_summit) {
                className += 'westra-pass-marker-summit';
            } else {
                className += 'westra-pass-marker-' + marker.properties.grade_eng;
            }
            return iconFromBackgroundImage(className);
        },

        showPassDescription: function(e) {
            if (!this._map) {
                return;
            }
            const properties = e.marker.properties,
                latLng = e.marker.latlng,
                catalogueUrlBase = 'https://westra.ru/passes',
                passUrl = `${catalogueUrlBase}/Passes/${properties.id}`,
                regionUrlBase = `${catalogueUrlBase}/Places`;
            let altnames = '',
                connects = '',
                comments = '';
            if (properties.altnames) {
                altnames = `
                    <tr>
                        <td>Другие названия</td>
                        <td>${escapeHtml(properties.altnames)}</td>
                    </tr>`;
            }

            if (!properties.is_summit) {
                connects = `
                    <tr>
                        <td>Соединяет</td>
                        <td>${properties.connects ? escapeHtml(properties.connects) : "неизвестнo"}</td>
                    </tr>`;
            }

            if (properties.comments) {
                for (let comment of properties.comments) {
                    let user = '';
                    if (comment.user) {
                        user = (
                            `<span class="westra-passes-description-comment-author">${escapeHtml(comment.user)}:</span>`
                        );
                    }
                    comments += (
                        `<p class="westra-passes-description-comment">${user}${escapeHtml(comment.content)}</p>`
                    );
                }
                comments = `
                    <tr>
                        <td>Комментарии</td>
                        <td>${comments}</td>
                    </tr>`;
            }
            let reports;
            if (properties.reports_total) {
                reports =
                    `<br>Отчетов: ${properties.reports_total}, ` +
                    `с фото: ${properties.reports_photo || 0}, ` +
                    `с описанием: ${properties.reports_tech || 0}`;
            } else {
                reports = '<br>Отчетов нет';
            }
            const region = properties.regions.map((regionId) => {
                const name = escapeHtml(this.regions[regionId].name);
                const id = escapeHtml(regionId);
                return `<a href="${regionUrlBase}/${id}">${name}</a>`;
            }).join(' / ');

            let description = `
                <table class="pass-details">
                    <tr>
                        <td>${properties.is_summit ? 'Вершина ' : 'Перевал '}</td>
                        <td>${properties.name ? escapeHtml(properties.name) : 'название неизвестно'}</td>
                    </tr>
                    ${altnames}
                    <tr>
                        <td>Категория</td>
                        <td>${properties.grade ? escapeHtml(properties.grade) : "неизвестная"}</td>
                    </tr>
                    <tr>
                        <td>Высота</td>
                        <td>${properties.elevation ? (escapeHtml(properties.elevation) + ' м') : 'неизвестная'}</td>
                    </tr>
                    ${connects}
                    <tr>
                        <td>Характеристика склонов</td>
                        <td>${properties.slopes ? escapeHtml(properties.slopes) : "неизвестная"}</td>
                    </tr>
                    <tr>
                        <td>Координаты</td>
                        <td>
                            <table class="coords">
                                <tr class="header">
                                    <td>Широта</td>
                                    <td>Долгота</td>
                                </tr>
                                <tr>
                                    <td>${latLng.lat.toFixed(5)}</td>
                                    <td>${latLng.lng.toFixed(5)}</td>
                                    <td><a id="westra-pass-gpx" title="Сохранить">gpx</a></td>
                                    <td><a id="westra-pass-kml" title="Сохранить">kml</a></td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td>На сайте Вестры</td>
                        <td><a id="westra-pass-link" href="${passUrl}">${passUrl}</a>${reports}</td></tr>
                    <tr>
                        <td>Добавил</td>
                        <td>${properties.author ? escapeHtml(properties.author) : "неизвестно"}</td>
                    </tr>
                    ${comments}
                    <tr>
                        <td>Район</td>
                        <td>${region}</td>
                    </tr>

                </table>`;
            this._map.openPopup(description, latLng, {maxWidth: 500});
            document.getElementById('westra-pass-link').onclick = function() {
                openPopupWindow(passUrl, 780, 'westra-details');
                return false;
            };
            document.getElementById('westra-pass-gpx').onclick = function() {
                this._passToGpx(e.marker);
                return false;
            }.bind(this);
            document.getElementById('westra-pass-kml').onclick = function() {
                this._passToKml(e.marker);
                return false;
            }.bind(this);
        }
    }
);

export {WestraPassesMarkers};
