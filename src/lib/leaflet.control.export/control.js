import L from 'leaflet';
import ko from 'vendored/knockout';
import './style.css';
import './control.css';
import 'lib/leaflet.control.commons';
import {RectangleSelect} from './selector';
import {exportFromLayer, minZoom} from './export-maker';
import {formats} from './export-formats';
import localStorage from 'lib/safe-localstorage';
import formHtml from './form.html';

import {saveAs} from 'vendored/github.com/eligrey/FileSaver';
import {notify} from 'lib/notifications';
import logging from 'lib/logging';

const ATTR_EXPORT_FORMAT = "exportFormat";

function saveFormatNameToLocalStorage(formatName) {
    localStorage.setItem(ATTR_EXPORT_FORMAT, formatName);
}

function getFormatNameFromLocalStorage() {
    return localStorage.getItem(ATTR_EXPORT_FORMAT);
}


// we need ability to manually recalculate value of computed on external events
// this function adds `recalculate` method to computed.
function updatableComputed(func, _this) {
    const mutator = ko.observable();
    const computed = ko.computed(function() {
        mutator();
        return func.apply(_this);
    }, _this);

    computed.recalculate = () => {
        mutator.valueHasMutated();
    };

    return computed;
}

L.Control.export = L.Control.extend({
    includes: L.Mixin.Events,

    initialize: function(layersControl, options) {
        L.Control.prototype.initialize.call(this, options);
        this._layersControl = layersControl;
        this.exportInProgress = ko.observable(false);
        this.downloadProgressRange = ko.observable(1);
        this.downloadProgressDone = ko.observable(0);

        this.exportLayer = updatableComputed(this.getExportLayer, this);
        this.bounds = updatableComputed(() => {
            if(! this._selector) {
                return null;
            }
            return this._selector.getBounds();
        });


        this.formats = formats;
        this.formatName = ko.observable(this.getExportFormat().name);
        this.formatName.subscribe(() => {
            this.setExportFormatByName(this.formatName());
            this.fire('exportformatchange');
        });

        this.items = ko.computed(() => {
            this.formatName();
            return this.getExportOptions();
        });


        this.on("selectionchange", () => {this.bounds.recalculate()});
    },

    onAdd: function(map) {
        this._map = map;
        const container = this._container =
            L.DomUtil.create('div', 'leaflet-control control-form leaflet-control-export');
        container.innerHTML = formHtml;
        this._stopContainerEvents();

        map.on("layeradd", () => {this.exportLayer.recalculate()}); // todo: multiple events on `soviet topo maps grid`.
        map.on("layerremove", () => {this.exportLayer.recalculate()});
        this.exportLayer.recalculate();

        ko.applyBindings(this, container);
        return container;
    },

    setExpanded: function() {
        L.DomUtil.removeClass(this._container, 'minimized');
        this.removeSelector(); // fixme
        this.onButtonClicked();
    },

    setMinimized: function() {
        L.DomUtil.addClass(this._container, 'minimized');
        this.removeSelector();
    },

    getExportFormat: function() {
        if (this.exportFormat === undefined) {
            let fromStorage = getFormatNameFromLocalStorage();
            this.exportFormat = formats.find( (f) => (f.name === fromStorage) ) || formats[0];
        }
        return this.exportFormat;
    },

    getExportFormatName: function() {
        return this.getExportFormat().name;
    },

    setExportFormatByName: function(formatName) {
        this.exportFormat = formats.find( (f) => (f.name === formatName ) );
        if ( this.exportFormat === undefined ) {
            this.exportFormat = this.getExportFormat();
            this.fire('exportformatchange');
        }
        this.formatName(this.exportFormat.name);
        saveFormatNameToLocalStorage(this.getExportFormatName());
    },

    getExportLayer: function() {
        if (! this._map) {
            return {layer: null, layerName: ""};
        }
        let selectedLayer = {};
        for (let layerRec of this._layersControl._layers) {
            let layer = layerRec.layer;
            if (this._map.hasLayer(layer) && layer.options && layer.options.export) {
                selectedLayer = {
                    layer,
                    layerName: layerRec.name
                }
            }
        }
        return selectedLayer;
    },

    estimateTilesCount: function(maxZoom) {
        let tilesCount = 0;
        const bounds = this.bounds();
        for (let zoom=minZoom(maxZoom); zoom <= maxZoom; zoom++) {
            const topLeftTile = this._map.project(bounds.getNorthWest(), zoom).divideBy(256).floor();
            const bottomRightTile = this._map.project(bounds.getSouthEast(), zoom).divideBy(256).ceil();
            tilesCount += Math.ceil((bottomRightTile.x - topLeftTile.x) * (bottomRightTile.y - topLeftTile.y));
        }
        return tilesCount;
    },

    getExportOptions: function() {
        const {layer, layerName} = this.exportLayer();
        if (!layer || !this.bounds()) {
            return [];
        }

        const maxLevel = layer.options.maxNativeZoom || layer.options.maxZoom || 18;
        const minLevel = Math.max(0, maxLevel - 6);

        const equatorLength = 40075016;
        const lat = this.bounds().getCenter().lat;
        let metersPerPixel = equatorLength / Math.pow(2, maxLevel) / 256 * Math.cos(lat / 180 * Math.PI);
        const format = this.getExportFormat();
        const items = [];
        for (let zoom = maxLevel; zoom >= minLevel; zoom -= 1) {
            let tilesCount = this.estimateTilesCount(zoom);
            let fileSizeMb = tilesCount * 0.02;

            items.push(format.exportOptionFactory({format, layer, layerName, zoom, metersPerPixel, tilesCount, fileSizeMb}));
            metersPerPixel *= 2;
        }
        return items;
    },

    notifyProgress: function(value, maxValue) {
        this.downloadProgressDone(this.downloadProgressDone() + value);
        this.downloadProgressRange(maxValue);
    },

    clickHandler: function(option) {
        this.startExport(option.format, option.layer, option.layerName, option.zoom);
    },

    startExport: function(format, layer, layerName, zoom) {
        logging.captureBreadcrumbWithUrl({message: 'start export'});
        this.exportInProgress(true);
        this.downloadProgressDone(0);

        const bounds = this._selector.getBounds();
        const sanitizedLayerName = layerName.toLowerCase().replace(/[ ()]+/, '_');
        const fileName = `nakarte.me_${sanitizedLayerName}_z${zoom}.${format.fileExtension}`;
        const eventId = logging.randId();
        logging.logEvent('export start', {eventId, layerName, zoom, bounds});
        exportFromLayer(format, layer, layerName, zoom, bounds, this.notifyProgress.bind(this))
            .then((fileData) => {
                saveAs(fileData, fileName, true);
                logging.logEvent('export end', {eventId, success: true});
            })
            .catch((e) => {
                    logging.captureException(e);
                    logging.logEvent('export end', {eventId, success: false, error: e.stack});
                    notify(`Export failed: ${e.message}`);
                }
            )
            .then(() => this.exportInProgress(false));
    },

    removeSelector: function() {
        if (this._selector) {
            this._map.removeLayer(this._selector);
            this._selector = null;
            this.fire('selectionchange');
        }
    },

    addSelector: function(bounds) {
        if (!bounds) {
            bounds = this._map.getBounds().pad(-0.25);
        }
        this._selector = new RectangleSelect(bounds)
            .addTo(this._map)
            .on('change', () => this.fire('selectionchange'));
        this.fire('selectionchange');
    },


    onButtonClicked: function() {
        if (this._selector) {
            if (this._selector.getBounds().intersects(this._map.getBounds().pad(-0.05))) {
                this.removeSelector();
            } else {
                this.removeSelector();
                this.addSelector();
            }

        } else {
            this.addSelector();
        }
    },
});

