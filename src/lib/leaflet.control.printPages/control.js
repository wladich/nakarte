import L from 'leaflet';
import ko from 'knockout';
import '~/lib/knockout.component.progress/progress';
import '~/lib/controls-styles/controls-styles.css';
import './control.css';
import PageFeature from './pageFeature';
import Contextmenu from '~/lib/contextmenu';
import {renderPages} from './map-render';
import formHtml from './form.html';
import {notify} from '~/lib/notifications';
import {makePdf} from './pdf';
import {saveAs} from '~/vendored/github.com/eligrey/FileSaver';
import {blobFromString} from '~/lib/binary-strings';
import '~/lib/leaflet.hashState/leaflet.hashState';
import '~/lib/leaflet.control.commons';
import * as logging from '~/lib/logging';
import {MagneticMeridians} from './decoration.magnetic-meridians';
import {OverlayScale} from './decoration.scale';
import {Grid} from './decoration.grid';

ko.extenders.checkNumberRange = function(target, range) {
    return ko.pureComputed({
            read: target,  // always return the original observables value
            write: function(newValue) {
                newValue = parseFloat(newValue);
                if (newValue >= range[0] && newValue <= range[1]) {
                    target(newValue);
                } else {
                    target.notifySubscribers(target());
                }
            }
        }
    ).extend({notify: 'always'});
};

function savePagesPdf(imagesInfo, resolution, fileName) {
    let pdf = makePdf(imagesInfo, resolution);
    pdf = blobFromString(pdf);
    saveAs(pdf, fileName, true);
}

function savePageJpg(page, fileName) {
    saveAs(blobFromString(page.data), fileName, true);
}

L.Control.PrintPages = L.Control.extend({
        options: {
            position: 'bottomleft',
            defaultMargin: 7,
        },

        includes: [L.Mixin.Events, L.Mixin.HashState],

        stateChangeEvents: ['change'],

        pageSizes: [
            {name: 'A1', width: 594, height: 841},
            {name: 'A2', width: 420, height: 594},
            {name: 'A3', width: 297, height: 420},
            {name: 'A4', width: 210, height: 297},
            {name: 'A5', width: 148, height: 210}
        ],

        zoomLevels: ['auto', 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],

        initialize: function(options) {
            L.Control.prototype.initialize.call(this, options);
            this.pages = [];
            this.scale = ko.observable(500).extend({checkNumberRange: [1, 1000000]});
            this.resolution = ko.observable(300).extend({checkNumberRange: [10, 9999]});
            this.zoomLevel = ko.observable('auto');
            this.pageWidth = ko.observable(210).extend({checkNumberRange: [10, 9999]});
            this.pageHeight = ko.observable(297).extend({checkNumberRange: [10, 9999]});
            this.settingsExpanded = ko.observable(false);
            this.makingPdf = ko.observable(false);
            this.downloadProgressRange = ko.observable();
            this.downloadProgressDone = ko.observable();
            this.marginLeft = ko.observable(this.options.defaultMargin).extend({checkNumberRange: [0, 99]});
            this.marginRight = ko.observable(this.options.defaultMargin).extend({checkNumberRange: [0, 99]});
            this.marginTop = ko.observable(this.options.defaultMargin).extend({checkNumberRange: [0, 99]});
            this.marginBottom = ko.observable(this.options.defaultMargin).extend({checkNumberRange: [0, 99]});
            this.autoZoomLevels = ko.observable({});
            this.printSize = ko.pureComputed(this._printSize, this);
            this.printSize.subscribe(this.onPageSizeChanged, this);
            this.scale.subscribe(this.onPageSizeChanged, this);
            this.resolution.subscribe(this.onPageSizeChanged, this);
            this.pageSizeDescription = ko.pureComputed(this._displayPageSize, this);
            this.pagesNum = ko.observable(0);
            this.pagesNumLabel = ko.pureComputed(this._pagesNumLabel, this);
            this.gridOn = ko.observable(false);
            this.magneticMeridiansOn = ko.observable(false);

            // hash state notifications
            this.scale.subscribe(this.notifyChange, this);
            this.printSize.subscribe(this.notifyChange, this);
            this.resolution.subscribe(this.notifyChange, this);
            this.zoomLevel.subscribe(this.notifyChange, this);
            this.gridOn.subscribe(this.notifyChange, this);
            this.magneticMeridiansOn.subscribe(this.notifyChange, this);
        },

        onAdd: function(map) {
            this._map = map;
            const container = this._container =
                L.DomUtil.create('div', 'leaflet-control control-form control-print-pages');
            this._stopContainerEvents();

            map.on('move', this.updateFormZooms, this);
            container.innerHTML = formHtml;
            ko.applyBindings(this, container);
            this.updateFormZooms();
            return container;
        },

        setExpanded: function() {
            L.DomUtil.removeClass(this._container, 'minimized');
        },

        setMinimized: function() {
            L.DomUtil.addClass(this._container, 'minimized');
        },

        addPage: function(isLandscape, center) {
            let [pageWidth, pageHeight] = this.printSize();
            if (isLandscape) {
                [pageWidth, pageHeight] = [pageHeight, pageWidth];
            }
            if (!center) {
                center = this._map.getCenter();
            }
            const page = new PageFeature(center, [pageWidth, pageHeight],
                this.scale(), (this.pages.length + 1).toString()
            );
            page._rotated = isLandscape;
            page.addTo(this._map);
            this.pages.push(page);
            this.pagesNum(this.pages.length);
            let cm = new Contextmenu(this.makePageContexmenuItems.bind(this, page));
            page.on('contextmenu', cm.show, cm);
            page.on('click', this.rotatePage.bind(this, page));
            page.on('move', this.updateFormZooms, this);
            page.on('moveend', this.notifyChange, this);
            this.updateFormZooms();
            this.notifyChange();
            return page;
        },

        addLandscapePage: function() {
            this.addPage(true);
        },

        addPortraitPage: function() {
            this.addPage(false);
        },

        removePage: function(page) {
            let i = this.pages.indexOf(page);
            this.pages.splice(i, 1);
            this.pagesNum(this.pages.length);
            this._map.removeLayer(page);
            for (; i < this.pages.length; i++) {
                this.pages[i].setLabel((i + 1).toString());
            }
            this.notifyChange();
            this.updateFormZooms();
        },

        removePages: function() {
            this.pages.forEach((page) => page.removeFrom(this._map));
            this.pages = [];
            this.pagesNum(this.pages.length);
            this.notifyChange();
            this.updateFormZooms();
        },

        onSavePdfClicked: function() {
            if (!this.pages.length) {
                notify('Add some pages to print');
                return;
            }
            this.savePdf();
        },

        zoomForPrint: function() {
            let zoom = this.zoomLevel();
            if (zoom === 'auto') {
                zoom = this.suggestZooms();
            } else {
                zoom = {mapZoom: zoom, satZoom: zoom};
            }
            return zoom;
        },

        incrementProgress: function(inc, range) {
            this.downloadProgressRange(range);
            this.downloadProgressDone((this.downloadProgressDone() || 0) + inc);
        },

        savePdf: function() {
            logging.captureBreadcrumb('start save pdf');
            if (!this._map) {
                return;
            }
            this.downloadProgressRange(1000);
            this.downloadProgressDone(undefined);
            this.makingPdf(true);
            const pages = this.pages.map((page) => ({
                        latLngBounds: page.getLatLngBounds(),
                        printSize: page.getPrintSize(),
                        label: page.getLabel()
            }));
            const resolution = this.resolution();
            const decorationLayers = [];
            if (this.gridOn()) {
                decorationLayers.push(new Grid());
            }
            if (this.magneticMeridiansOn()) {
                decorationLayers.push(new MagneticMeridians());
            }
            decorationLayers.push(new OverlayScale());
            const scale = this.scale();
            const width = this.pageWidth();
            const height = this.pageHeight();
            const eventId = logging.randId();
            const zooms = this.zoomForPrint();
            this.fire('mapRenderStart', {
                action: 'pdf',
                eventId,
                scale,
                resolution,
                pages,
                zooms
            });
            renderPages({
                    map: this._map,
                    pages,
                    zooms,
                    resolution,
                    scale,
                    decorationLayers,
                    progressCallback: this.incrementProgress.bind(this)
                }
            ).then(({images, renderedLayers}) => {
                    if (images) {
                        const fileName = this.getFileName({
                            renderedLayers,
                            scale,
                            width,
                            height,
                            extension: 'pdf'
                        });
                        savePagesPdf(images, resolution, fileName);
                        this.fire('mapRenderEnd', {eventId, success: true});
                    }
                }
            ).catch((e) => {
                    logging.captureException(e, 'raster creation failed');
                    this.fire('mapRenderEnd', {eventId, success: false, error: e});
                    notify(`Failed to create PDF: ${e.message}`);
                }
            ).then(() => this.makingPdf(false));
        },

        savePageJpg: function(page) {
            logging.captureBreadcrumb('start save page jpg', {pageNumber: page.getLabel()});
            const pages = [{
                latLngBounds: page.getLatLngBounds(),
                printSize: page.getPrintSize(),
                label: page.getLabel()
            }];
            const decorationLayers = [];
            if (this.gridOn()) {
                decorationLayers.push(new Grid());
            }
            if (this.magneticMeridiansOn()) {
                decorationLayers.push(new MagneticMeridians());
            }
            decorationLayers.push(new OverlayScale());
            this.downloadProgressRange(1000);
            this.downloadProgressDone(undefined);
            this.makingPdf(true);
            const resolution = this.resolution();
            const scale = this.scale();
            const width = this.pageWidth();
            const height = this.pageHeight();
            const eventId = logging.randId();
            const zooms = this.zoomForPrint();
            this.fire('mapRenderStart', {
                action: 'jpg',
                eventId,
                scale,
                resolution,
                pages,
                zooms
            });
            renderPages({
                    map: this._map,
                    pages,
                    zooms,
                    resolution,
                    scale,
                    decorationLayers,
                    progressCallback: this.incrementProgress.bind(this)
                }
            )
                .then(({images, renderedLayers}) => {
                    const fileName = this.getFileName({
                        renderedLayers,
                        scale,
                        width,
                        height,
                        extension: 'jpg'
                    });
                    savePageJpg(images[0], fileName);
                    this.fire('mapRenderEnd', {eventId, success: true});
                })
                .catch((e) => {
                        logging.captureException(e, 'raster creation failed');
                        this.fire('mapRenderEnd', {eventId, success: false, error: e});
                        notify(`Failed to create JPEG from page: ${e.message}`);
                    }
                ).then(() => this.makingPdf(false));
        },

        onPageSizeChanged: function() {
            let [pageWidth, pageHeight] = this.printSize();
            this.pages.forEach((page) => {
                    let [w, h] = [pageWidth, pageHeight];
                    if (page._rotated) {
                        [w, h] = [h, w];
                    }
                    page.setSize([w, h], this.scale());
                }
            );
            this.updateFormZooms();
        },

        onPagesNumLabelClick: function() {
            if (this.pages.length > 0) {
                const bounds = L.latLngBounds([]);
                for (let page of this.pages) {
                    bounds.extend(page.latLngBounds);
                }
                this._map.fitBounds(bounds.pad(0.2));
            }
        },

        makePageContexmenuItems: function(page) {
            const items = [
                {text: 'Rotate', callback: this.rotatePage.bind(this, page)},
                '-',
                {text: 'Delete', callback: this.removePage.bind(this, page)},
                '-',
                {text: 'Save image', callback: this.savePageJpg.bind(this, page), disabled: this.makingPdf()}
            ];
            if (this.pages.length > 1) {
                items.push({text: 'Change order', separator: true});
                this.pages.forEach((p, i) => {
                        if (p !== page) {
                            items.push({
                                    text: (i + 1).toString(),
                                    callback: this.renumberPage.bind(this, page, i)
                                }
                            );
                        }
                    }
                );
            }
            return items;
        },

        rotatePage: function(page) {
            page._rotated = !page._rotated;
            page.rotate();
            this.notifyChange();
        },

        renumberPage: function(page, newIndex) {
            const oldIndex = this.pages.indexOf(page);
            this.pages.splice(oldIndex, 1);
            this.pages.splice(newIndex, 0, page);
            for (let i = Math.min(oldIndex, newIndex); i < this.pages.length; i++) {
                this.pages[i].setLabel((i + 1).toString());
            }
            this.notifyChange();
        },

        _printSize: function() {
            return [this.pageWidth() - this.marginLeft() - this.marginRight(),
                this.pageHeight() - this.marginTop() - this.marginBottom()];
        },

        suggestZooms: function() {
            const scale = this.scale(),
                resolution = this.resolution();
            let referenceLat;
            if (this.pages.length > 0) {
                let absLats = this.pages.map((page) => Math.abs(page.getLatLngBounds().getCenter().lat));
                referenceLat = Math.min(...absLats);
            } else {
                if (!this._map) {
                    return [null, null];
                }
                referenceLat = this._map.getCenter().lat;
            }
            let targetMetersPerPixel = scale / (resolution / 2.54);
            let mapUnitsPerPixel = targetMetersPerPixel / Math.cos(referenceLat * Math.PI / 180);
            let satZoom = Math.ceil(Math.log(40075016.4 / 256 / mapUnitsPerPixel) / Math.LN2);

            targetMetersPerPixel = scale / (90 / 2.54) / 1.5;
            mapUnitsPerPixel = targetMetersPerPixel / Math.cos(referenceLat * Math.PI / 180);
            let mapZoom = Math.round(Math.log(40075016.4 / 256 / mapUnitsPerPixel) / Math.LN2);
            mapZoom = Math.min(mapZoom, 18);
            satZoom = Math.min(satZoom, 18);
            mapZoom = Math.max(mapZoom, 0);
            satZoom = Math.max(satZoom, 0);
            return {mapZoom, satZoom};
        },

        updateFormZooms: function() {
            this.autoZoomLevels(this.suggestZooms());
        },

        _displayPageSize: function() {
            const width = this.pageWidth(),
                height = this.pageHeight();
            for (let size of this.pageSizes) {
                if (size.width === width && size.height === height) {
                    return size.name;
                }
            }
            return `${width} x ${height} mm`;
        },

        notifyChange: function() {
            this.fire('change');
        },

        hasPages: function() {
            return this.pages.length > 0;
        },

        _pagesNumLabel: function() {
            const n = this.pagesNum();
            let label = '';
            if (n) {
                label += n;
            } else {
                label = 'No';
            }
            label += ' page';
            if (n === 0 || n > 1) {
                label += 's';
            }
            return label;
        },

        serializeState: function() {
            const pages = this.pages;
            let state = null;
            if (pages.length) {
                state = [];
                state.push(this.scale().toString());
                state.push(this.resolution().toString());
                state.push(this.zoomLevel().toString());
                state.push(this.pageWidth().toString());
                state.push(this.pageHeight().toString());
                state.push(this.marginLeft().toString());
                state.push(this.marginRight().toString());
                state.push(this.marginTop().toString());
                state.push(this.marginBottom().toString());
                for (let page of pages) {
                    let latLng = page.getLatLng().wrap();
                    state.push(latLng.lat.toFixed(5));
                    state.push(latLng.lng.toFixed(5));
                    state.push(page._rotated ? '1' : '0');
                }
                let flags =
                    (this.magneticMeridiansOn() ? 1 : 0) |
                    (this.gridOn() ? 2 : 0);
                state.push(flags.toString());
            }
            return state;
        },

        unserializeState: function(state) {
            if (!state || !state.length) {
                return false;
            }
            this.removePages();
            state = [...state];
            this.scale(state.shift());
            this.resolution(state.shift());
            this.zoomLevel(state.shift());
            this.pageWidth(state.shift());
            this.pageHeight(state.shift());
            this.marginLeft(state.shift());
            this.marginRight(state.shift());
            this.marginTop(state.shift());
            this.marginBottom(state.shift());
            let lat, lng, rotated;
            while (state.length >= 3) {
                lat = parseFloat(state.shift());
                lng = parseFloat(state.shift());
                rotated = parseInt(state.shift(), 10);
                if (isNaN(lat) || isNaN(lng) || lat < -85 || lat > 85 || lng < -180 || lng > 180) {
                    break;
                }
                this.addPage(Boolean(rotated), L.latLng(lat, lng));
            }
            if (state.length) {
                const flags = parseInt(state.shift(), 10);
                if (flags >= 0 && flags <= 3) {
                    this.magneticMeridiansOn(Boolean(flags & 1));
                    this.gridOn(Boolean(flags & 2));
                }
            }
            return true;
        },

        getFileName: function({renderedLayers, scale, width, height, extension}) {
            let fileName = '';

            let opaqueLayer;
            const transparentOverlayLayers = [];

            renderedLayers.forEach((layer) => {
                const {
                    options: {
                        isOverlay,
                        isOverlayTransparent,
                        shortName
                    }
                } = layer;

                if (!shortName) {
                    return;
                }

                if (isOverlay) {
                    if (isOverlayTransparent) {
                        transparentOverlayLayers.push(layer);
                    } else {
                        opaqueLayer = layer;
                    }
                } else if (!opaqueLayer) {
                    opaqueLayer = layer;
                }
            });

            function appendLayerShortName(layer) {
                fileName += `${layer.options.shortName}_`;
            }
            if (opaqueLayer) {
                appendLayerShortName(opaqueLayer);
            }
            transparentOverlayLayers.forEach(appendLayerShortName);

            fileName += `${scale}m`;

            const currentPageSize = this.pageSizes.find(
                (pageSize) => width === pageSize.width && height === pageSize.height
            );

            if (currentPageSize) {
                fileName += `_${currentPageSize.name}`;
            }

            return `${fileName}.${extension}`;
        }
    }
);
