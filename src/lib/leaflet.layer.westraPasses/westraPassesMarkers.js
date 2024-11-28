import escapeHtml from 'escape-html';
import L from 'leaflet';

import './westraPassesMarkers.css';
import {markerIcons, MountainPassesMarkers} from '~/lib/leaflet.layer.mountainPasses/mountainPassesMarkers';
import {openPopupWindow} from '~/lib/popup-window';
import {saveAs} from '~/vendored/github.com/eligrey/FileSaver';

const WestraPassesMarkers = MountainPassesMarkers.extend({
    sourceName: 'Westra',
    descriptionWidth: 500,

    makeTooltip: function (marker) {
        const properties = marker.properties;
        let toolTip = properties.grade || '';
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

    passToGpx: function (marker) {
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
        const filename = marker.properties.name || 'Без названия';
        saveAs(new Blob([gpx], {type: 'application/gpx+xml'}), filename + '.gpx', true);
    },

    passToKml: function (marker) {
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
        const filename = marker.properties.name || 'Без названия';
        saveAs(new Blob([kml], {type: 'application/vnd.google-earth.kml+xml'}), filename + '.kml', true);
    },

    makeIcon: function (marker) {
        let icon;
        if (marker.properties.is_summit) {
            icon = markerIcons.summit;
        } else {
            icon = markerIcons[marker.properties.grade_eng];
        }
        return icon;
    },

    makePassName: function (passProperties) {
        return passProperties.name || '';
    },

    makeDescription: function (marker) {
        const properties = marker.properties;
        const latLng = marker.latlng;
        const url = 'https://westra.ru/passes/Passes/' + properties.id;
        let altnames = '';
        let connects = '';
        let comments = '';
        if (properties.altnames) {
            altnames = `
                    <tr>
                        <td>Другие названия</td>
                        <td>${properties.altnames}</td>
                    </tr>`;
        }

        if (!properties.is_summit) {
            connects = `
                    <tr>
                        <td>Соединяет</td>
                        <td>${properties.connects || 'неизвестнo'}</td>
                    </tr>`;
        }

        if (properties.comments) {
            for (const comment of properties.comments) {
                let user = '';
                if (comment.user) {
                    user = `<span class="westra-passes-description-comment-author">${comment.user}:</span>`;
                }
                comments += `<p class="westra-passes-description-comment">${user}${comment.content}</p>`;
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
        const description = L.DomUtil.create('div');
        description.innerHTML = `
                <table class="westra-pass-details">
                    <tr>
                        <td>${properties.is_summit ? 'Вершина ' : 'Перевал '}</td>
                        <td>${properties.name || 'название неизвестно'}</td>
                    </tr>
                    ${altnames}
                    <tr>
                        <td>Категория</td>
                        <td>${properties.grade || 'неизвестная'}</td>
                    </tr>
                    <tr>
                        <td>Высота</td>
                        <td>${properties.elevation ? properties.elevation + ' м' : 'неизвестная'}</td>
                    </tr>
                    ${connects}
                    <tr>
                        <td>Характеристика склонов</td>
                        <td>${properties.slopes || 'неизвестная'}</td>
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
                        <td><a id="westra-pass-link" href="${url}">${url}</a>${reports}</td></tr>
                    <tr>
                        <td>Добавил</td>
                        <td>${properties.author || 'неизвестно'}</td>
                    </tr>
                    ${comments}
                </table>`;
        description.querySelector('#westra-pass-link').onclick = () => {
            openPopupWindow(url, 780, 'westra-details');
            return false;
        };
        description.querySelector('#westra-pass-gpx').onclick = () => {
            this.passToGpx(marker);
            return false;
        };
        description.querySelector('#westra-pass-kml').onclick = () => {
            this.passToKml(marker);
            return false;
        };
        return description;
    },
});

export {WestraPassesMarkers};
