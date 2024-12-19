import L from 'leaflet';
import '~/lib/leaflet.layer.canvasMarkers';

import {fetch} from '~/lib/xhr-promise';
import {notify} from '~/lib/notifications';
import * as logging from '~/lib/logging';

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

export {MountainPassesMarkers};
