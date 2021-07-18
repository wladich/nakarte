import L from 'leaflet';
import ko from 'knockout';
import './style.css';
import './selector.css';
import '~/lib/leaflet.control.commons';
import {RectangleSelect} from './selector';
import {exportFromLayer, minZoom} from './jnx-maker';
import formHtml from './form.html';

import {saveAs} from '~/vendored/github.com/eligrey/FileSaver';
import {notify} from '~/lib/notifications';
import * as logging from '~/lib/logging';

L.Control.Export = L.Control.extend({
        includes: L.Mixin.Events,

        initialize: function(layersControl, options) {
            L.Control.prototype.initialize.call(this, options);
            this._layersControl = layersControl;
            this.exportInProgress = ko.observable(false);
            this.downloadProgressRange = ko.observable(1);
            this.downloadProgressDone = ko.observable(0);
            this.exportLayer = ko.observable(this.getLayerForExport());
            this.cancelFlag = ko.observable(false);
            this.exportOptions = ko.observable(this.getExportOptions());
            this.on("selectionchange", () => {
                this.exportOptions(this.getExportOptions());
            });
        },

        getLayerForExport: function() {
            if (!this._map) {
                return {};
            }
            for (let layerRec of this._layersControl._layers.slice().reverse()) {
                let layer = layerRec.layer;
                if (!this._map.hasLayer(layer) || !layer.options) {
                    continue;
                }
                if (layer.options.isWrapper) {
                    const layerName = layerRec.name;
                    for (const subLayer of layer.getLayers().slice().reverse()) {
                        if (subLayer.options?.export) {
                            return {layer: subLayer, layerName};
                        }
                    }
                } else if (layer.options.export) {
                    return {layer, layerName: layerRec.name};
                }
            }
            return {};
        },

        estimateTilesCount: function(maxZoom) {
            let tilesCount = 0;
            const bounds = this._selector.getBounds();
            for (let zoom = minZoom(maxZoom); zoom <= maxZoom; zoom++) {
                const topLeftTile = this._map.project(bounds.getNorthWest(), zoom).divideBy(256).floor();
                const bottomRightTile = this._map.project(bounds.getSouthEast(), zoom).divideBy(256).ceil();
                tilesCount += Math.ceil((bottomRightTile.x - topLeftTile.x) * (bottomRightTile.y - topLeftTile.y));
            }
            return tilesCount;
        },

        setExpanded: function() {
            L.DomUtil.removeClass(this._container, 'minimized');
        },

        setMinimized: function() {
            L.DomUtil.addClass(this._container, 'minimized');
        },

        getExportOptions: function() {
            const {layer, layerName} = this.exportLayer();
            const bounds = this._selector ? this._selector.getBounds() : null;
            if (!layer || !bounds) {
                return [];
            }
            const maxLevel = layer.options.maxNativeZoom || layer.options.maxZoom || 18;
            let minLevel = Math.max(0, maxLevel - 6);
            if (layer.options.minZoom) {
                minLevel = Math.max(minLevel, layer.options.minZoom);
            }
            const equatorLength = 40075016;
            const lat = bounds.getCenter().lat;
            let metersPerPixel = equatorLength / 2 ** maxLevel / 256 * Math.cos(lat / 180 * Math.PI);
            const items = [];
            for (let zoom = maxLevel; zoom >= minLevel; zoom -= 1) {
                let tilesCount = this.estimateTilesCount(zoom);
                let fileSizeMb = tilesCount * 0.02;
                let resolutionString = metersPerPixel.toFixed(2);
                let sizeString = fileSizeMb.toFixed(fileSizeMb > 1 ? 0 : 1);
                let option = {layer, layerName, zoom, metersPerPixel, tilesCount, fileSizeMb};
                option.label =
                    `Zoom ${zoom} (${resolutionString} m/pixel) &mdash; ${tilesCount} tiles (~${sizeString} Mb)`;
                option.warning = option.tilesCount > 50000;
                option.tooltip = option.tilesCount > 50000 ? '> 50000 tiles' : '';
                items.push(option);
                metersPerPixel *= 2;
            }
            return items;
        },

        hasExportOptions: function() {
            return this.getExportOptions().length > 0;
        },

        notifyProgress: function(value, maxValue) {
            this.downloadProgressDone(this.downloadProgressDone() + value);
            this.downloadProgressRange(maxValue);
        },

        exportOptionClickHandler: function(option) {
            if (!this.exportInProgress()) {
                this.startExport(option.layer, option.layerName, option.zoom);
            }
        },

        startExport: function(layer, layerName, zoom) {
            logging.captureBreadcrumb('start export');
            this.exportInProgress(true);
            this.downloadProgressDone(0);
            const bounds = this._selector.getBounds();
            const sanitizedLayerName = layerName.toLowerCase().replace(/[ ()]+/u, '_');
            const fileName = `nakarte.me_${sanitizedLayerName}_z${zoom}.jnx`;
            const eventId = logging.randId();
            logging.logEvent('export start', {eventId, layerName, zoom, bounds});
            this.cancelFlag(false);
            exportFromLayer(layer, layerName, zoom, bounds, this.notifyProgress.bind(this), this.cancelFlag)
                .then((fileData) => {
                    saveAs(fileData, fileName, true);
                    logging.logEvent('export end', {eventId, success: true});
                })
                .catch((e) => {
                    if (e.message === 'canceled') {
                        logging.logEvent('export cancelled', {eventId, success: true});
                    } else {
                        logging.captureException(e);
                        logging.logEvent('export end', {eventId, success: false, error: e.stack});
                        notify(`Export failed: ${e.message}`);
                    }
                })
                .then(() => this.exportInProgress(false));
        },

        onAdd: function(map) {
            this._map = map;
            const container = this._container =
            L.DomUtil.create('div', 'leaflet-control control-form leaflet-control-export');
            container.innerHTML = formHtml;
            this._stopContainerEvents();
            map.on("layeradd", () => this.exportLayer(this.getLayerForExport()));
            map.on("layerremove", () => this.exportLayer(this.getLayerForExport()));
            ko.applyBindings(this, container);
            return container;
        },

        removeSelector: function() {
            this.setMinimized();
            if (this._selector) {
                this._map.removeLayer(this._selector);
                this._selector = null;
                this.fire('selectionchange');
            }
        },

        addSelector: function(bounds) {
            this.setExpanded();
            if (!bounds) {
                bounds = this._map.getBounds().pad(-0.25);
            }
            this._selector = new RectangleSelect(bounds)
                .addTo(this._map)
                .on('change', () => this.fire('selectionchange'));
            this.fire('selectionchange');
        },

        showSelector: function() {
            if (this._selector) {
                if (!this._selector.getBounds().intersects(this._map.getBounds().pad(-0.05))) {
                    this.removeSelector();
                    this.addSelector();
                }
            } else {
                this.addSelector();
            }
        },

        cancelExport: function() {
            this.cancelFlag(true);
        }
});
