import L from 'leaflet';
import ko from 'vendored/knockout';
import './style.css';
import 'lib/leaflet.control.commons';
import {RectangleSelect} from './selector';
import Contextmenu from 'lib/contextmenu';
import {makeJnxFromLayer, minZoom} from './jnx-maker';
import {saveAs} from 'vendored/github.com/eligrey/FileSaver';
import {notify} from 'lib/notifications';
import logging from 'lib/logging';

L.Control.JNX = L.Control.extend({
        includes: L.Mixin.Events,

        initialize: function(layersControl, options) {
            L.Control.prototype.initialize.call(this, options);
            this._layersControl = layersControl;
            this.makingJnx = ko.observable(false);
            this.downloadProgressRange = ko.observable(1);
            this.downloadProgressDone = ko.observable(0);
            this.contextMenu = new Contextmenu(() => this.makeMenuItems());
        },

        getLayerForJnx: function() {
            let selectedLayer = {};
            for (let layerRec of this._layersControl._layers) {
                let layer = layerRec.layer;
                if (this._map.hasLayer(layer) && layer.options && layer.options.jnx) {
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
            const bounds = this._selector.getBounds();
            for (let zoom=minZoom(maxZoom); zoom <= maxZoom; zoom++) {
                const topLeftTile = this._map.project(bounds.getNorthWest(), zoom).divideBy(256).floor();
                const bottomRightTile = this._map.project(bounds.getSouthEast(), zoom).divideBy(256).ceil();
                tilesCount += Math.ceil((bottomRightTile.x - topLeftTile.x) * (bottomRightTile.y - topLeftTile.y));
            }
            return tilesCount;
        },

        makeMenuItems: function() {
            const {layer, layerName} = this.getLayerForJnx();
            if (!layer) {
                return [{text: 'No supported layers'}];
            }
            const maxLevel = layer.options.maxNativeZoom || layer.options.maxZoom || 18;
            const minLevel = Math.max(0, maxLevel - 6);

            const equatorLength = 40075016;
            const lat = this._selector.getBounds().getCenter().lat;
            let metersPerPixel = equatorLength / Math.pow(2, maxLevel) / 256 * Math.cos(lat / 180 * Math.PI);

            const items = [{text: layerName, header: true}];
            for (let zoom = maxLevel; zoom >= minLevel; zoom -= 1) {
                let tilesCount = this.estimateTilesCount(zoom);
                let fileSizeMb = tilesCount * 0.02;
                let itemClass = tilesCount > 50000 ? 'jnx-menu-warning' : '';
                let resolutionString = metersPerPixel.toFixed(2);
                let sizeString = fileSizeMb.toFixed(fileSizeMb > 1 ? 0 : 1);
                let item = {
                    text: `<span class="${itemClass}">Zoom ${zoom} (${resolutionString} m/pixel) &mdash; ${tilesCount} tiles (~${sizeString} Mb)</span>`,
                    callback: () => this.makeJnx(layer, layerName, zoom),
                    disabled: this.makingJnx()
                };
                items.push(item);
                metersPerPixel *= 2;
            }
            return items;
        },

        notifyProgress: function(value, maxValue) {
            this.downloadProgressDone(this.downloadProgressDone() + value);
            this.downloadProgressRange(maxValue);
        },

        makeJnx: function(layer, layerName, zoom) {
            logging.captureBreadcrumbWithUrl({message: 'start making jnx'});
            this.makingJnx(true);
            this.downloadProgressDone(0);

            const bounds = this._selector.getBounds();
            const sanitizedLayerName = layerName.toLowerCase().replace(/[ ()]+/, '_');
            const fileName = `nakarte.me_${sanitizedLayerName}_z${zoom}.jnx`;
            const eventId = logging.randId();
            logging.logEvent('jnx start', {eventId, layerName, zoom, bounds});
            makeJnxFromLayer(layer, layerName, zoom, bounds, this.notifyProgress.bind(this))
                .then((fileData) => {
                    saveAs(fileData, fileName, true);
                    logging.logEvent('jnx end', {eventId, success: true});
                })
                .catch((e) => {
                        logging.captureException(e);
                        logging.logEvent('jnx end', {eventId, success: false, error: e.stack});
                        notify(`Failed to create JNX: ${e.message}`);
                    }
                )
                .then(() => this.makingJnx(false));
        },

        onAdd: function(map) {
            this._map = map;
            const container = this._container = L.DomUtil.create('div', 'leaflet-control leaflet-control-jnx');
            container.innerHTML = `
                <a class="button" data-bind="visible: !makingJnx(), click: onButtonClicked"
                 title="Make JNX for Garmin receivers">JNX</a>
                <div data-bind="
                    component:{
                        name: 'progress-indicator',
                        params: {progressRange: downloadProgressRange, progressDone: downloadProgressDone}
                    },
                    visible: makingJnx()"></div>`;
            ko.applyBindings(this, container);
            this._stopContainerEvents();
            return container;
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
                .on('change', () => this.fire('selectionchange'))
                .on('click contextmenu', (e) => {
                    L.DomEvent.stop(e);
                    this.contextMenu.show(e)
                });
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
    }
);

