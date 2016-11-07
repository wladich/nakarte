import L from 'leaflet'
import React from 'react';
import ReactDOM from 'react-dom';
import '../controls-styles.css';
import './control.css';
import PrintPagesForm from './form';
import PageFeature from './pageFeature';
import Contextmenu from '../contextmenu/contextmenu';
import {renderMap} from './map-render'

L.Control.PrintPages = L.Control.extend({
        options: {position: 'bottomleft'},
        initialize: function(options) {
            L.Control.prototype.initialize.call(this, options);
            this.pages = [];
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
            this.form = ReactDOM.render(<PrintPagesForm
                    onAddLandscapePage={this.addLandscapePage.bind(this)}
                    onAddPortraitPage={this.addPortraitPage.bind(this)}
                    onRemovePages={this.removePages.bind(this)}
                    onSavePdf={this.savePdf.bind(this)}
                    onFormDataChanged={this.onFormDataChanged.bind(this)}
                />, container
            );
            this.updateFormZooms();
            return container;
        },

        addPage: function(data, landsacape) {
            let {pageWidth, pageHeight, marginLeft, marginTop, marginRight, marginBottom} = data;
            if (landsacape) {
                [pageWidth, pageHeight] = [pageHeight, pageWidth];
            }
            const page = new PageFeature(this._map.getCenter(),
                [pageWidth - marginLeft - marginRight, pageHeight - marginTop - marginBottom],
                data.scale, (this.pages.length + 1).toString()
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

        addLandscapePage: function(data) {
            const page = this.addPage(data, true);
            page._rotated = true;
        },

        addPortraitPage: function(data) {
            this.addPage(data, false);
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

        onFormDataChanged: function(data) {
            let {pageWidth, pageHeight, marginLeft, marginTop, marginRight, marginBottom, scale} = data;
            this.pages.forEach((page) => {
                    let w = pageWidth - marginLeft - marginRight,
                        h = pageHeight - marginTop - marginBottom;
                    if (page._rotated) {
                        [w, h] = [h, w];
                    }
                    page.setSize([w, h], scale);
                }
            );
            this.updateFormZooms();
        },

        makePageContexmenuItems: function(page) {
            var items = [
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

        suggestZooms: function() {
            const scale = this.form.state.scale,
                resolution = this.form.state.resolution;
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
            var targetMetersPerPixel = scale / (resolution / 2.54);
            var mapUnitsPerPixel = targetMetersPerPixel / Math.cos(referenceLat * Math.PI / 180);
            var zoomSat = Math.ceil(Math.log(40075016.4 / 256 / mapUnitsPerPixel) / Math.LN2);

            targetMetersPerPixel = scale / (90 / 2.54) / 1.5;
            mapUnitsPerPixel = targetMetersPerPixel / Math.cos(referenceLat * Math.PI / 180);
            var zoomMap = Math.round(Math.log(40075016.4 / 256 / mapUnitsPerPixel) / Math.LN2);
            return {zoomMap, zoomSat};
        },

        updateFormZooms: function() {
            this.form.setSuggestedZooms(this.suggestZooms());
        }
    }
);