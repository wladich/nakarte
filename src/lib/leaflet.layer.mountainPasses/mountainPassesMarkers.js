import L from 'leaflet';
import '~/lib/leaflet.layer.canvasMarkers';

import {fetch} from '~/lib/xhr-promise';
import {notify} from '~/lib/notifications';
import * as logging from '~/lib/logging';

import iconPass1a from './pass-1a.png';
import iconPass1b from './pass-1b.png';
import iconPass2a from './pass-2a.png';
import iconPass2b from './pass-2b.png';
import iconPass3a from './pass-3a.png';
import iconPass3b from './pass-3b.png';
import iconPassNoGrade from './pass-nograde.png';
import iconPassUnknownGrade from './pass-unknown-notconfirmed.png';
import iconSummit from './summit.png';

const markerIcons = {
    '1a': {url: iconPass1a, center: [7, 7]},
    '1b': {url: iconPass1b, center: [7, 7]},
    '2a': {url: iconPass2a, center: [7, 7]},
    '2b': {url: iconPass2b, center: [7, 7]},
    '3a': {url: iconPass3a, center: [7, 7]},
    '3b': {url: iconPass3b, center: [7, 7]},
    'nograde': {url: iconPassNoGrade, center: [7, 7]},
    'unknown': {url: iconPassUnknownGrade, center: [7, 7]},
    'summit': {url: iconSummit, center: [7, 7]},
};

const MountainPassesMarkers = L.Layer.CanvasMarkers.extend({
    options: {
        scaleDependent: true,
    },

    sourceName: 'ABSTRACT',
    descriptionWidth: null,

    initialize: function(dataUrl, options) {
        L.Layer.CanvasMarkers.prototype.initialize.call(this, null, options);
        this.on('markerclick', (e) => this.showPassDescription(e.marker));
        this.url = dataUrl;
    },

    loadData: function() {
        if (this._downloadStarted) {
            return;
        }
        this._downloadStarted = true;
        fetch(this.url, {responseType: 'json'}).then(
            (xhr) => this.loadMarkers(xhr.responseJSON),
            (e) => {
                this._downloadStarted = false;
                logging.captureException(e, `failed to get ${this.sourceName} passes`);
                notify(`Failed to get ${this.sourceName} passes data`);
            }
        );
    },

    onAdd: function(map) {
        L.Layer.CanvasMarkers.prototype.onAdd.call(this, map);
        this.loadData();
    },

    getPasses(data) {
        return data;
    },

    makeIcon: function() {
        throw new Error('Not implemented');
    },

    makeTooltip: function(_unused_marker) {
        throw new Error('Not implemented');
    },

    makeDescription: function(_unused_marker) {
        throw new Error('Not implemented');
    },

    makePassName: function(_unused_passProperties) {
        throw new Error('Not implemented');
    },

    showPassDescription: function(marker) {
        if (!this._map) {
            return;
        }
        const description = this.makeDescription(marker);
        this._map.openPopup(description, marker.latlng, {maxWidth: this.descriptionWidth});
    },

    loadMarkers: function(data) {
        const makeIcon = this.makeIcon.bind(this);
        const makeTooltip = this.makeTooltip.bind(this);
        const passes = this.getPasses(data);
        const markers = passes.map((pass) => ({
            latlng: {
                lat: pass.latlon[0],
                lng: pass.latlon[1],
            },
            label: this.makePassName(pass),
            icon: makeIcon,
            tooltip: makeTooltip,
            properties: pass,
        }));
        this.addMarkers(markers);
        this._dataLoaded = true;
        this.fire('data-loaded');
    },
});

export {MountainPassesMarkers, markerIcons};
