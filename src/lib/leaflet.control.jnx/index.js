import ko from 'knockout';
import L from 'leaflet';

import '~/lib/leaflet.control.commons';
import '~/lib/controls-styles/controls-styles.css';
import * as logging from '~/lib/logging';
import {notify} from '~/lib/notifications';
import {saveAs} from '~/vendored/github.com/eligrey/FileSaver';

import controlHtml from './control.html';
import './control.css';
import {makeJnxFromLayer, minZoom} from './jnx-maker';
import {RectangleSelect} from './selector';

L.Control.JNX = L.Control.extend({
    includes: L.Mixin.Events,

    initialize: function (layersControl, options) {
        L.Control.prototype.initialize.call(this, options);
        this._layersControl = layersControl;
        this.makingJnx = ko.observable(false);
        this.downloadProgressRange = ko.observable(1);
        this.downloadProgressDone = ko.observable(0);
        this.layerForExport = ko.observable(null);
        this.areaSelectorVisible = ko.observable(false);
        this.zoomLevel = ko.observable(null);
        this.zoomChoices = ko.observable(null);
        this.fixZoom = ko.observable(false);
    },

    getLayerForJnx: function () {
        for (const layerRec of this._layersControl._layers.slice().reverse()) {
            const layer = layerRec.layer;
            if (!this._map.hasLayer(layer) || !layer.options) {
                continue;
            }
            if (layer.options.isWrapper) {
                const layerName = layerRec.name;
                for (const subLayer of layer.getLayers().slice().reverse()) {
                    if (subLayer.options?.jnx) {
                        return {layer: subLayer, name: layerName};
                    }
                }
            } else if (layer.options.jnx) {
                return {layer, name: layerRec.name};
            }
        }
        return null;
    },

    estimateTilesCount: function (maxZoom) {
        const bounds = this._areaSelector.getBounds();
        let maxTilesPerLevel = 0;
        let totalTiles = 0;
        for (let zoom = minZoom(maxZoom); zoom <= maxZoom; zoom++) {
            const topLeftTile = this._map.project(bounds.getNorthWest(), zoom).divideBy(256).floor();
            const bottomRightTile = this._map.project(bounds.getSouthEast(), zoom).divideBy(256).ceil();
            const tilesCount = Math.ceil((bottomRightTile.x - topLeftTile.x) * (bottomRightTile.y - topLeftTile.y));
            totalTiles += tilesCount;
            maxTilesPerLevel = Math.max(maxTilesPerLevel, tilesCount);
        }
        return {total: totalTiles, maxPerLevel: maxTilesPerLevel};
    },

    updateZoomChoices: function () {
        if (!this.layerForExport() || !this._areaSelector) {
            this.zoomChoices(null);
            this.zoomLevel(null);
            return;
        }
        const layer = this.layerForExport().layer;
        const choices = {};
        const maxLevel = layer.options.maxNativeZoom || layer.options.maxZoom || 18;
        let minLevel = Math.max(0, maxLevel - 6);
        if (layer.options.minZoom) {
            minLevel = Math.max(minLevel, layer.options.minZoom);
        }

        const equatorLength = 40075016;
        const lat = this._areaSelector.getBounds().getCenter().lat;
        let metersPerPixel = (equatorLength / 2 ** maxLevel / 256) * Math.cos((lat / 180) * Math.PI);

        for (let zoom = maxLevel; zoom >= minLevel; zoom -= 1) {
            const tilesCount = this.estimateTilesCount(zoom);
            const fileSizeMb = tilesCount.total * 0.02;
            choices[zoom] = {
                zoom,
                metersPerPixel,
                maxLevelTiles: tilesCount.maxPerLevel,
                fileSizeMb,
                warning: tilesCount.maxPerLevel > 50000,
            };
            metersPerPixel *= 2;
        }
        this.zoomChoices(choices);
        if (!this.zoomChoices()[this.zoomLevel()]) {
            this.zoomLevel(null);
        }
    },

    notifyProgress: function (value, maxValue) {
        this.downloadProgressDone(this.downloadProgressDone() + value);
        this.downloadProgressRange(maxValue);
    },

    errorMessage: function () {
        if (!this.layerForExport()) {
            return 'Select layer for export';
        }
        if (!this.areaSelectorVisible()) {
            return 'Set area for export';
        }
        if (this.zoomLevel() === null) {
            return 'Select zoom level';
        }
        return null;
    },

    makeJnx: function () {
        if (!this.zoomLevel() || !this._areaSelector || !this.layerForExport()) {
            return;
        }
        logging.captureBreadcrumb('start making jnx');
        this.makingJnx(true);
        this.downloadProgressDone(0);

        const bounds = this._areaSelector.getBounds();
        const layer = this.layerForExport().layer;
        const layerName = this.layerForExport().name;
        const zoom = this.zoomLevel();
        const sanitizedLayerName = layerName.toLowerCase().replace(/[ ()]+/u, '_');
        const fileName = `nakarte.me_${sanitizedLayerName}_z${zoom}.jnx`;
        const eventId = logging.randId();
        this.fire('tileExportStart', {
            eventId,
            layer,
            zoom,
            bounds,
        });
        makeJnxFromLayer(layer, layerName, zoom, bounds, this.fixZoom(), this.notifyProgress.bind(this))
            .then((fileData) => {
                saveAs(fileData, fileName, true);
                this.fire('tileExportEnd', {eventId, success: true});
            })
            .catch((e) => {
                logging.captureException(e, 'Failed to create JNX');
                this.fire('tileExportEnd', {
                    eventId,
                    success: false,
                    error: e,
                });
                notify(`Failed to create JNX: ${e.message}`);
            })
            .then(() => this.makingJnx(false));
    },

    onAdd: function (map) {
        this._map = map;
        const container = L.DomUtil.create('div', 'leaflet-control control-form leaflet-control-jnx');
        this._container = container;
        container.innerHTML = controlHtml;
        map.on('baselayerchange overlayadd overlayremove', this.updateLayer, this);
        this.updateLayer();
        ko.applyBindings(this, container);
        this._stopContainerEvents();
        return container;
    },

    removeAreaSelector: function () {
        if (this._areaSelector) {
            this._map.removeLayer(this._areaSelector);
            this._areaSelector = null;
            this.areaSelectorVisible(false);
            this.onSelectorChange();
        }
    },

    setAreaSelector: function (bounds = this._map.getBounds().pad(-0.25)) {
        if (this._areaSelector) {
            this._map.removeLayer(this._areaSelector);
        }
        this._areaSelector = new RectangleSelect(bounds)
            .addTo(this._map)
            .on('change', this.onSelectorChange, this)
            .on('click', this.setExpanded, this);
        this.areaSelectorVisible(true);
        this.onSelectorChange();
    },

    onSelectorChange: function () {
        this.updateZoomChoices();
        this.fire('selectionchange');
    },

    moveMapToAreaSelector: function () {
        if (this._areaSelector) {
            this._map.fitBounds(this._areaSelector.getBounds().pad(0.25));
        }
    },

    onMinimizedDialogButtonClick: function () {
        if (!this._areaSelector) {
            this.setAreaSelector();
        }
        this.setExpanded();
    },

    setExpanded: function () {
        L.DomUtil.removeClass(this._container, 'minimized');
    },

    setMinimized: function () {
        L.DomUtil.addClass(this._container, 'minimized');
    },

    updateLayer: function () {
        this.layerForExport(this.getLayerForJnx());
        this.updateZoomChoices();
    },
});
