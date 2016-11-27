import L from 'leaflet'
import ko from 'knockout';
import 'lib/knockout.component.progress/progress';
import 'lib/controls-styles.css';
import './control.css';
import PageFeature from './pageFeature';
import Contextmenu from 'lib/contextmenu/contextmenu';
import {renderMap} from './map-render'
import formHtml from './form.html';

ko.extenders.checkNumberRange = function(target, range) {
    return ko.pureComputed({
            read: target,  //always return the original observables value
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

L.Control.PrintPages = L.Control.extend({
        options: {position: 'bottomleft'},

        pageSizes: [
            {'name': 'A1', width: 594, height: 841},
            {'name': 'A2', width: 420, height: 594},
            {'name': 'A3', width: 297, height: 420},
            {'name': 'A4', width: 210, height: 297},
            {'name': 'A5', width: 594, height: 210}
        ],

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
            this.downloadProgressRange = ko.observable(undefined);
            this.downloadProgressDone = ko.observable(undefined);
            this.marginLeft = ko.observable(3).extend({checkNumberRange: [0, 99]});
            this.marginRight = ko.observable(3).extend({checkNumberRange: [0, 99]});
            this.marginTop = ko.observable(3).extend({checkNumberRange: [0, 99]});
            this.marginBottom = ko.observable(3).extend({checkNumberRange: [0, 99]});
            this.autoZoomLevels = ko.observable({});
            this.printSize = ko.pureComputed(this._printSize, this);
            this.printSize.subscribe(this.onPageSizeChanged, this);
            this.scale.subscribe(this.onPageSizeChanged, this);
            this.resolution.subscribe(this.onPageSizeChanged, this);
            this.pageSizeDescription = ko.pureComputed(this._displayPageSize, this);
        },

        onAdd: function(map) {
            this._map = map;
            const container = this._container =
                L.DomUtil.create('div', 'leaflet-control control-form control-print-pages');
            L.DomEvent.disableClickPropagation(container);
            if (!L.Browser.touch) {
                L.DomEvent.disableScrollPropagation(container);
            }

            map.on('move', this.updateFormZooms, this);
            container.innerHTML = formHtml;
            ko.applyBindings(this, container);
            this.updateFormZooms();
            return container;
        },

        addPage: function(isLandsacape) {
            let [pageWidth, pageHeight] = this.printSize();
            if (isLandsacape) {
                [pageWidth, pageHeight] = [pageHeight, pageWidth];
            }
            const page = new PageFeature(this._map.getCenter(), [pageWidth, pageHeight],
                this.scale(), (this.pages.length + 1).toString()
            );
            page.addTo(this._map);
            this.pages.push(page);
            let cm = new Contextmenu(this.makePageContexmenuItems.bind(this, page));
            page.on('contextmenu', cm.show, cm);
            page.on('click', this.rotatePage.bind(this, page));
            page.on('move', this.updateFormZooms, this);
            this.updateFormZooms();
            return page
        },

        addLandscapePage: function() {
            const page = this.addPage(true);
            page._rotated = true;
        },

        addPortraitPage: function() {
            this.addPage(false);
        },

        removePage: function(page) {
            let i = this.pages.indexOf(page);
            this.pages.splice(i, 1);
            this._map.removeLayer(page);
            for (; i < this.pages.length; i++) {
                this.pages[i].setLabel((i + 1).toString());
            }
            this.updateFormZooms()
        },

        removePages: function() {
            this.pages.forEach((page) => page.removeFrom(this._map));
            this.pages = [];
            this.updateFormZooms();
        },

        savePdf: function(data) {
            if (!this._map) {
                return;
            }
            renderMap(this._map);
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

        makePageContexmenuItems: function(page) {
            const items = [
                {text: 'Rotate', callback: this.rotatePage.bind(this, page)},
                '-',
                {text: 'Delete', callback: this.removePage.bind(this, page)},
                '-',
                {text: 'Save image', callback: this.savePageJpg.bind(this, page), disabled: true}
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
        },

        savePageJpg: function(page) {

        },

        renumberPage: function(page, newIndex) {
            const oldIndex = this.pages.indexOf(page);
            this.pages.splice(oldIndex, 1);
            this.pages.splice(newIndex, 0, page);
            for (let i = Math.min(oldIndex, newIndex); i < this.pages.length; i++) {
                this.pages[i].setLabel((i + 1).toString());
            }
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
                let absLats = this.pages.map((page) => {
                        return Math.abs(page.getLatLngBounds().getSouth())
                    }
                );
                referenceLat = Math.min(...absLats);
            } else {
                if (!this._map) {
                    return [null, null];
                }
                referenceLat = this._map.getCenter().lat;
            }
            let targetMetersPerPixel = scale / (resolution / 2.54);
            let mapUnitsPerPixel = targetMetersPerPixel / Math.cos(referenceLat * Math.PI / 180);
            const satZoom = Math.ceil(Math.log(40075016.4 / 256 / mapUnitsPerPixel) / Math.LN2);

            targetMetersPerPixel = scale / (90 / 2.54) / 1.5;
            mapUnitsPerPixel = targetMetersPerPixel / Math.cos(referenceLat * Math.PI / 180);
            const mapZoom = Math.round(Math.log(40075016.4 / 256 / mapUnitsPerPixel) / Math.LN2);
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
        }
    }
);