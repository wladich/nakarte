import './fstrPassesMarkers.css';
import {MountainPassesMarkers} from '~/lib/leaflet.layer.mountainPasses/mountainPassesMarkers';

import iconPass1a from './icons/pass-1a.png';
import iconPass1b from './icons/pass-1b.png';
import iconPass2a from './icons/pass-2a.png';
import iconPass2b from './icons/pass-2b.png';
import iconPass3a from './icons/pass-3a.png';
import iconPass3b from './icons/pass-3b.png';
import iconPassNoGrade from './icons/pass-nograde.png';

const markerIcons = {
    '1a': {url: iconPass1a, center: [7.5, 7.5]},
    '1b': {url: iconPass1b, center: [7.5, 7.5]},
    '2a': {url: iconPass2a, center: [7.5, 7.5]},
    '2b': {url: iconPass2b, center: [7.5, 7.5]},
    '3a': {url: iconPass3a, center: [7.5, 7.5]},
    '3b': {url: iconPass3b, center: [7.5, 7.5]},
    'nograde': {url: iconPassNoGrade, center: [7.5, 7.5]},
};

const FstrUrl = 'https://tssr.ru/mountain/pereval/';

const FstrPassesMarkers = MountainPassesMarkers.extend({
    sourceName: 'FSTR',
    descriptionWidth: 950,

    loadMarkers: function (data) {
        this.regions = data.regions;
        return MountainPassesMarkers.prototype.loadMarkers.call(this, data);
    },

    getPasses(data) {
        return data.passes;
    },

    makeIcon: function (marker) {
        return markerIcons[marker.properties.grade_min];
    },

    makePassName: function (passProperties) {
        return passProperties.name;
    },

    formatGrade: function (normGrade) {
        return {
            'nograde': 'н/к',
            '1a': '1А',
            '1b': '1Б',
            '2a': '2А',
            '2b': '2Б',
            '3a': '3А',
            '3b': '3Б',
        }[normGrade];
    },

    makeTooltip: function (marker) {
        const properties = marker.properties;
        const name = properties.name || 'без названия'; // eslint-disable-line no-shadow
        let grade = this.formatGrade(properties.grade_min);
        if (properties.grade_max) {
            grade += '-' + this.formatGrade(properties.grade_max);
        }

        let toolTip = `Перевал ${name} (${grade}`;
        if (properties.elevation) {
            toolTip += `, ${properties.elevation}`;
        }
        if (properties.approx) {
            toolTip += ', координаты приблизительные';
        }
        toolTip += ')';
        return toolTip;
    },

    makeDescription: function (marker) {
        const properties = marker.properties;
        const region = this.regions[properties.region_id];
        const regionUrl = FstrUrl + region.url;

        function formatCoords(s) {
            return s.replaceAll(/\s*\n\s*/gu, '<br>').replaceAll(/ +/gu, '&nbsp;');
        }

        function formatText(s) {
            return s.replaceAll(/\s*\n\s*/gu, '<br>');
        }

        const variantsLines = properties.details.map(
            (variant) => `
            <tr>
                <td class="center">${formatText(variant.number)}</td>
                <td class="center">${formatText(variant.name)}</td>
                <td class="center">${formatText(variant.altnames)}</td>
                <td class="center">${formatText(variant.elevation)}</td>
                <td class="center">${formatText(variant.grade)}</td>
                <td class="center">${formatText(variant.surface_type)}</td>
                <td>${formatText(variant.connects)}</td>
                <td>${formatCoords(variant.coords)}</td>
                <td>${formatCoords(variant.approx_coords)}</td>
                <td>${formatText(variant.first_visit)}</td>
                <td>${formatText(variant.comment)}</td>
            </tr>
            `
        );
        const msgCoordsApprox = properties.approx
            ? '<p class="fstr-pass-msg-approx">Координаты точки перевала приблизительные</p>'
            : '';

        const reporUrl =
            'https://docs.google.com/forms/d/e/1FAIpQLSdjibos1pcPUlRDsUHnycNgp9nJxSCKASMOSqN7PPMndQPL2w/viewform?fbzx=-9176885795887734707'; // eslint-disable-line max-len
        return `
            <p><a href="${regionUrl}">${region.name}</a></p>
            ${msgCoordsApprox}
            <table class="fstr-pass-variants">
                <tr>
                    <th>Номер</th>
                    <th>Название</th>
                    <th>Другие названия</th>
                    <th>Высота</th>
                    <th>Категория</th>
                    <th>Характеристика</th>
                    <th>Что соединяет</th>
                    <th>Координаты</th>
                    <th>Координаты приблизительные</th>
                    <th>Первопрохождение</th>
                    <th>Дополнительная информация</th>
                </tr>
                ${variantsLines.join('')}
            </table>
            <p>
                Заметили ошибку или неточность?
                <a href="${reporUrl}">Сообщите</a>, пожалуйста, маршрутному комитету ФСТР.
            </p>
        `;
    },
});

export {FstrPassesMarkers};
