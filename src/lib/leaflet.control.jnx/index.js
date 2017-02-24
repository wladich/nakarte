import L from 'leaflet';
import ko from 'knockout';
import './style.css';
import 'lib/leaflet.control.commons';
import {RectangleSelect} from './selector';
import Contextmenu from 'lib/contextmenu';
import {makeJnxFromLayer} from './jnx-maker';
import {saveAs} from 'browser-filesaver';
import {notify} from 'lib/notifications';

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
            let selectedLayer = null;
            this._map.eachLayer((layer) => {
                    if (layer.options && layer.options.jnx) {
                        selectedLayer = layer;
                    }
                }
            );
            return selectedLayer;
        },

        getLayerName: function(layer) {
            const layerRec = this._layersControl._getLayer(L.stamp(layer));
            if (layerRec) {
                return layerRec.name;
            } else {
                return 'Unknown layer';
            }

        },

        estimateTilesNumber: function(zoom) {
            const bounds = this._selector.getBounds();
            const topLeftTile = this._map.project(bounds.getNorthWest(), zoom).divideBy(256).floor();
            const bottomRightTile = this._map.project(bounds.getSouthEast(), zoom).divideBy(256).ceil();
            return Math.ceil((bottomRightTile.x - topLeftTile.x) * (bottomRightTile.y - topLeftTile.y) * 4 / 3);
        },

        makeMenuItems: function() {
            const layer = this.getLayerForJnx();
            if (!layer) {
                return [{text: 'No supported layer'}];
            }
            const layerName = this.getLayerName(layer);
            const maxLevel = layer.options.maxNativeZoom || layer.options.maxZoom || 18;
            const minLevel = Math.max(0, maxLevel - 6);

            const equatorLength = 40075016;
            const lat = this._selector.getBounds().getCenter().lat;
            let metersPerPixel = equatorLength / Math.pow(2, maxLevel) / 256 * Math.cos(lat / 180 * Math.PI);

            const items = [{text: `<b>${layerName}</b>`}];
            for (let zoom = maxLevel; zoom >= minLevel; zoom -= 1) {
                let tilesCount = this.estimateTilesNumber(zoom);
                let fileSizeMb = tilesCount * 0.02;
                items.push({
                        text: `Zoom ${zoom} (${metersPerPixel.toFixed(2)} m/pixel) &mdash; ${tilesCount} (~${fileSizeMb.toFixed(1)} Mb)`,
                        callback: () => this.makeJnx(layer, layerName, zoom)
                    }
                );
                metersPerPixel *= 2;
            }
            return items;
        },

        notifyProgress: function(value, maxValue) {
            this.downloadProgressDone(this.downloadProgressDone() + value);
            this.downloadProgressRange(maxValue);
        },

        makeJnx: function(layer, layerName, zoom) {
            this.makingJnx(true);
            this.downloadProgressDone(0);

            const bounds = this._selector.getBounds();
            const sanitizedLayerName = layerName.toLowerCase().replace(/[ ()]+/, '_');
            const fileName = `nakarte.tk_${sanitizedLayerName}_z${zoom}.jnx`;
            makeJnxFromLayer(layer, layerName, zoom, bounds, this.notifyProgress.bind(this))
                .then((fileData) => saveAs(fileData, fileName, true))
                .catch((e) => notify(e.message))
                .then(() => this.makingJnx(false));
        },

        onAdd: function(map) {
            this._map = map;
            const container = this._container = L.DomUtil.create('div', 'leaflet-control leaflet-control-jnx');
            container.innerHTML = `
                <a class="button" data-bind="visible: !makingJnx(), click: onButtonClicked">JNX</a>
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
                .on('click contextmenu', (e) => this.contextMenu.show(e));
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

