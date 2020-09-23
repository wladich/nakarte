import L from 'leaflet';

import './style.css';
import {onElementResize} from '~/lib/anyElementResizeEvent';

const MapWithSidebars = L.Map.extend({
    initialize: function (id, options) {
        this._sidebarsContainer = L.DomUtil.get(id);
        this.setupSidebarsLayout(this._sidebarsContainer);
        L.Map.prototype.initialize.call(this, this._mapContainer, options);
        onElementResize(this._mapContainer, L.Util.requestAnimFrame.bind(null, this.invalidateSize.bind(this)));
    },

    setupSidebarsLayout: function (container) {
        this._sidebarContainers = {};
        const sidebars = this._sidebarContainers;
        L.DomUtil.addClass(container, 'leaflet-map-sidebars-container');
        sidebars['left'] = L.DomUtil.create('div', 'leaflet-map-sidebar-left', this._sidebarsContainer);
        const midColumn = L.DomUtil.create('div', 'leaflet-map-sidebar-mid-column', this._sidebarsContainer);
        sidebars['right'] = L.DomUtil.create('div', 'leaflet-map-sidebar-right', this._sidebarsContainer);
        sidebars['top'] = L.DomUtil.create('div', 'leaflet-map-sidebar-top', midColumn);
        this._mapContainer = L.DomUtil.create('div', 'leaflet-map-container-with-sidebars', midColumn);
        sidebars['bottom'] = L.DomUtil.create('div', 'leaflet-map-sidebar-bottom', midColumn);
    },

    addElementToSidebar: function (barName, element) {
        this._sidebarContainers[barName].appendChild(element);
    },

    removeElementFromSidebar: function (barName, element) {
        this._sidebarContainers[barName].removeChild(element);
    },
});

export {MapWithSidebars};
