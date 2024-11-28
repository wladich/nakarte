import './fstrPassesMarkers.css';
import {markerIcons, MountainPassesMarkers} from '~/lib/leaflet.layer.mountainPasses/mountainPassesMarkers';

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

        return `
            <div>
                <a href="${regionUrl}">${region.name}</a>
            </div>
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
        `;
    },
});

export {FstrPassesMarkers};
