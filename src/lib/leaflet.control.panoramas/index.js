import L from 'leaflet';
import ko from 'knockout';
import googleProvider from './lib/google';
import '~/lib/leaflet.hashState/leaflet.hashState';

import './style.css';
import {Events} from './lib/common';
import '~/lib/controls-styles/controls-styles.css';
import {makeButtonWithBar} from '~/lib/leaflet.control.commons';
import mapillaryProvider from './lib/mapillary';
import wikimediaProvider from './lib/wikimedia';
import {DragEvents} from '~/lib/leaflet.events.drag';
import {onElementResize} from '~/lib/anyElementResizeEvent';
import safeLocalStorage from '~/lib/safe-localstorage';
import mapyczProvider from './lib/mapycz';

const PanoMarker = L.Marker.extend({
    options: {
        zIndexOffset: 10000
    },

    initialize: function() {
        const icon = L.divIcon({
                className: 'leaflet-panorama-marker-wraper',
                html: '<div class="leaflet-panorama-marker"></div>'
            }
        );
        L.Marker.prototype.initialize.call(this, [0, 0], {icon, interactive: false});
        this._postponeType = null;
        this._postponeHeading = null;
    },

    onAdd: function(map) {
        L.Marker.prototype.onAdd.call(this, map);
        if (this._postponeType !== null) {
            this.setType(this._postponeType);
        }
        if (this._postponeHeading !== null) {
            this.setHeading(this._postponeHeading);
        }
    },

    onRemove: function(map) {
        L.Marker.prototype.onRemove.call(this, map);
    },

    getIcon: function() {
        let markerIcon = this.getElement();
        markerIcon = markerIcon.children[0];
        return markerIcon;
    },

    setHeading: function(angle) {
        this._postponeHeading = angle;
        if (!this._map) {
            return;
        }
        const markerIcon = this.getIcon();
        markerIcon.style.transform = `rotate(${angle || 0}deg)`;
    },

    setType: function(markerType) {
        this._postponeType = markerType;
        if (!this._map) {
            return;
        }
        const className = {
            slim: 'leaflet-panorama-marker-circle',
            normal: 'leaflet-panorama-marker-binocular'
        }[markerType];
        this.getIcon().className = className;
    }
});

L.Control.Panoramas = L.Control.extend({
        includes: L.Mixin.Events,

        options: {
            position: 'topleft',
            splitVerically: true,
            splitSizeFraction: 0.5,
            minViewerSize: 30,
        },

        getProviders: function() {
            return [
                {
                    name: 'google',
                    title: 'Google street view',
                    provider: googleProvider,
                    layerOptions: {zIndex: 10},
                    code: 'g',
                    selected: ko.observable(true),
                    mapMarkerType: 'normal'
                },
                {
                    name: 'wikimedia',
                    title: 'Wikimedia commons',
                    provider: wikimediaProvider,
                    layerOptions: {opacity: 0.7, zIndex: 9},
                    code: 'w',
                    selected: ko.observable(false),
                    mapMarkerType: 'slim'
                },
                {
                    name: 'mapillary',
                    title: 'Mapillary',
                    provider: mapillaryProvider,
                    layerOptions: {opacity: 0.7, zIndex: 8},
                    code: 'm',
                    selected: ko.observable(false),
                    mapMarkerType: 'normal'
                },
                {
                    name: 'mapycz',
                    title: 'mapy.cz',
                    provider: mapyczProvider,
                    layerOptions: {opacity: 0.7, zIndex: 8},
                    code: 'c',
                    selected: ko.observable(false),
                    mapMarkerType: 'normal'
                }
            ];
        },

        initialize: function(options) {
            L.Control.prototype.initialize.call(this, options);
            this.loadSettings();
            this._panoramasContainer = L.DomUtil.create('div', 'panoramas-container');
            onElementResize(
                this._panoramasContainer,
                L.Util.requestAnimFrame.bind(null, this.onContainerResize.bind(this))
            );
            this.providers = this.getProviders();
            for (let provider of this.providers) {
                provider.selected.subscribe(this.updateCoverageVisibility, this);
                provider.container = L.DomUtil.create('div', 'panorama-container', this._panoramasContainer);
            }
            this.nearbyPoints = [];
            this.marker = new PanoMarker();
        },

        loadSettings: function() {
            let storedSettings;
            try {
                storedSettings = JSON.parse(safeLocalStorage.panoramaSettings);
            } catch {
                // ignore
            }
            this._splitVerically = storedSettings?.spitVertically ?? this.options.splitVerically;
            const fraction = storedSettings?.splitSizeFraction;
            this._splitSizeFraction = isNaN(fraction) ? this.options.splitSizeFraction : fraction;
        },

        saveSetting: function() {
            safeLocalStorage.panoramaSettings = JSON.stringify({
                spitVertically: this._splitVerically,
                splitSizeFraction: this._splitSizeFraction
            });
        },

        onAdd: function(map) {
            this._map = map;

            this._splitterDragging = false;
            const splitter = L.DomUtil.create('div', 'panorama-splitter', this._panoramasContainer);
            L.DomUtil.create('div', 'splitter-border', splitter);
            const splitterButton = L.DomUtil.create('div', 'button', splitter);
            new DragEvents(splitter, null, {trackOutsideElement: true}).on({
                dragstart: this.onSplitterDragStart,
                dragend: this.onSplitterDragEnd,
                drag: this.onSplitterDrag,
            }, this);
            new DragEvents(splitterButton, null, {trackOutsideElement: true}).on({
                click: this.onSplitterClick
            }, this);
            this.setupViewerLayout();
            const {container, link, barContainer} = makeButtonWithBar(
                'leaflet-contol-panoramas', 'Show panoramas (Alt-P)', 'icon-panoramas');
            map.on('resize', this.onMapResize, this);
            this._container = container;
            L.DomEvent.on(link, 'click', this.onButtonClick, this);
            L.DomEvent.on(document, 'keyup', this.onKeyUp, this);
            barContainer.innerHTML = `
                 <div class="panoramas-list" data-bind="foreach: providers">
                     <div>
                         <label>
                             <input type="checkbox" data-bind="checked: selected"><span data-bind="text: title"></span>
                         </label>
                     </div>
                 </div>
             `;

            ko.applyBindings(this, container);
            map.createPane('rasterOverlay').style.zIndex = 300;
            return container;
        },

        onSplitterDrag: function(e) {
            const minSize = this.options.minViewerSize;
            const container = this._panoramasContainer;
            const oldSize = container[this._splitVerically ? 'offsetWidth' : 'offsetHeight'];
            let newSize = oldSize + e.dragMovement[this._splitVerically ? 'x' : 'y'];
            const mapSize = this._map._container[this._splitVerically ? 'offsetWidth' : 'offsetHeight'];
            if (newSize < minSize) {
                newSize = this.options.minViewerSize;
            }
            const maxSize = oldSize + mapSize - minSize;
            if (newSize > maxSize) {
                newSize = maxSize;
            }
            this.setContainerSizePixels(newSize);
        },

        onSplitterClick: function() {
            this._splitVerically = !this._splitVerically;
            this.saveSetting();
            this.setupViewerLayout();
        },

        onButtonClick: function() {
            this.switchControl();
        },

        switchControl: function() {
            if (this.controlEnabled) {
                this.disableControl();
            } else {
                this.enableControl();
            }
        },

        onKeyUp: function(e) {
            if (e.keyCode === 'P'.codePointAt(0) && e.altKey) {
                this.switchControl();
            }
        },

        enableControl: function() {
            if (this.controlEnabled) {
                return;
            }
            this.controlEnabled = true;
            L.DomUtil.addClass(this._container, 'active');
            this.updateCoverageVisibility();
            this._map.on('click', this.onMapClick, this);
            L.DomUtil.addClass(this._map._container, 'panoramas-control-active');
            this.notifyChange();
        },

        disableControl: function() {
            if (!this.controlEnabled) {
                return;
            }
            this.controlEnabled = false;
            L.DomUtil.removeClass(this._container, 'active');
            this.updateCoverageVisibility();
            this._map.off('click', this.onMapClick, this);
            this.hidePanoViewer();
            L.DomUtil.removeClass(this._map._container, 'panoramas-control-active');
            this.notifyChange();
        },

        updateCoverageVisibility: function() {
            if (!this._map) {
                return;
            }
            for (let provider of this.providers) {
                if (this.controlEnabled && provider.selected()) {
                    if (!provider.coverageLayer) {
                        const options = L.extend({pane: 'rasterOverlay'}, provider.layerOptions);
                        provider.coverageLayer = provider.provider.getCoverageLayer(options);
                    }
                    provider.coverageLayer.addTo(this._map);
                } else {
                    if (provider.coverageLayer) {
                        this._map.removeLayer(provider.coverageLayer);
                    }
                }
            }
            this.notifyChange();
        },

        showPanoramaContainer: function() {
            L.DomUtil.addClass(this._panoramasContainer, 'enabled');
        },

        panoramaVisible: function() {
            if (L.DomUtil.hasClass(this._panoramasContainer, 'enabled')) {
                for (let provider of this.providers) {
                    if (L.DomUtil.hasClass(provider.container, 'enabled')) {
                        return provider;
                    }
                }
            }
            return false;
        },

        setupNearbyPoints: function(points) {
            for (let point of this.nearbyPoints) {
                this._map.removeLayer(point);
            }
            this.nearbyPoints = [];
            if (points) {
                const icon = L.divIcon({className: 'leaflet-panorama-marker-point'});
                for (let latlng of points) {
                    this.nearbyPoints.push(L.marker(latlng, {icon}).addTo(this._map));
                }
            }
        },

        hidePano: function(provider) {
            L.DomUtil.removeClass(provider.container, 'enabled');
            if (provider.viewer) {
                provider.viewer.deactivate();
            }
            this.setupNearbyPoints();
        },

        showPano: async function(provider, data) {
            this.showPanoramaContainer();
            for (let otherProvider of this.providers) {
                if (otherProvider !== provider) {
                    this.hidePano(otherProvider);
                }
            }
            L.DomUtil.addClass(provider.container, 'enabled');
            if (!provider.viewer) {
                // eslint-disable-next-line require-atomic-updates
                provider.viewer = await provider.provider.getViewer(provider.container);
                this.setupViewerEvents(provider);
            }
            if (data) {
                // wait for panorama container become of right size, needed for viewer setup
                setTimeout(() => provider.viewer.showPano(data), 0);
            }
            provider.viewer.activate();
            this.marker.setType(provider.mapMarkerType);
            this.notifyChange();
        },

        setupViewerEvents: function(provider) {
            provider.viewer.on({
                [Events.ImageChange]: this.onViewerImageChange,
                [Events.BearingChange]: this.onViewerBearingChange,
                [Events.YawPitchZoomChangeEnd]: this.onViewerZoomYawPitchChangeEnd,
                closeclick: this.onPanoramaCloseClick
            }, this);
        },

        hidePanoViewer: function() {
            for (let provider of this.providers) {
                this.hidePano(provider);
            }
            L.DomUtil.removeClass(this._panoramasContainer, 'enabled');
            this._map.removeLayer(this.marker);
            this.notifyChange();
        },

        notifyChange: function() {
            this.fire('change');
        },

        onViewerImageChange: function(e) {
            if (!this._map.getBounds().pad(-0.05).contains(e.latlng)) {
                this._map.panTo(e.latlng);
            }
            this._map.addLayer(this.marker);
            this.marker.setLatLng(e.latlng);
            this.notifyChange();
        },

        onViewerBearingChange: function(e) {
            this.marker.setHeading(e.bearing);
        },

        onViewerZoomYawPitchChangeEnd: function() {
            this.notifyChange();
        },

        onPanoramaCloseClick: function() {
            this.hidePanoViewer();
        },

        onMapClick: async function(e) {
            const
                searchRadiusPx = 24,
                p = this._map.project(e.latlng).add([searchRadiusPx, 0]),
                searchRadiusMeters = e.latlng.distanceTo(this._map.unproject(p)),
                promises = [];
            for (let provider of this.providers) {
                if (provider.selected()) {
                    promises.push({
                        promise: provider.provider.getPanoramaAtPos(e.latlng, searchRadiusMeters),
                        provider: provider
                    });
                }
            }

            for (let {promise, provider} of promises) {
                let searchResult = await promise;
                if (searchResult.found) {
                    this._map.removeLayer(this.marker);
                    this.provider = provider;
                    this.showPano(provider, searchResult.data);
                    return;
                }
            }
        },

        setupViewerLayout: function() {
            let sidebar;
            if (this._splitVerically) {
                L.DomUtil.addClass(this._panoramasContainer, 'split-vertical');
                L.DomUtil.removeClass(this._panoramasContainer, 'split-horizontal');
                sidebar = 'left';
                this._panoramasContainer.style.height = '100%';
            } else {
                L.DomUtil.addClass(this._panoramasContainer, 'split-horizontal');
                L.DomUtil.removeClass(this._panoramasContainer, 'split-vertical');
                sidebar = 'top';
                this._panoramasContainer.style.width = '100%';
            }
            this._map.addElementToSidebar(sidebar, this._panoramasContainer);
            this.updateContainerSize();
        },

        setContainerSizePixels: function(size) {
            size = Math.round(size);
            this._panoramasContainer.style[this._splitVerically ? 'width' : 'height'] = `${size}px`;
            setTimeout(() => { // map size has not updated yet
                const mapSize = this._map._container[this._splitVerically ? 'offsetWidth' : 'offsetHeight'];
                this._splitSizeFraction = size / (mapSize + size);
                this.saveSetting();
            }, 0);
        },

        updateContainerSize: function() {
            const fraction = this._splitSizeFraction;
            const container = this._panoramasContainer;
            const containerSize = container[this._splitVerically ? 'offsetWidth' : 'offsetHeight'];
            const mapSize = this._map._container[this._splitVerically ? 'offsetWidth' : 'offsetHeight'];
            const newSize = Math.round(fraction * (mapSize + containerSize));
            container.style[this._splitVerically ? 'width' : 'height'] = `${newSize}px`;
        },

        onContainerResize: function() {
            const provider = this.panoramaVisible();
            if (provider && provider.viewer) {
                provider.viewer.invalidateSize();
            }
        },

        onMapResize: function() {
            if (!this._splitterDragging) {
                this.updateContainerSize();
            }
        },

        onSplitterDragStart: function() {
            this._splitterDragging = true;
        },

        onSplitterDragEnd: function() {
            this._splitterDragging = false;
        },
    },
);

L.Control.Panoramas.include(L.Mixin.HashState);
L.Control.Panoramas.include({
        stateChangeEvents: ['change'],

        serializeState: function() {
            let state = null;
            if (this.controlEnabled) {
                state = [];
                let coverageCode = '_';
                for (let provider of this.providers) {
                    if (provider.selected()) {
                        coverageCode += provider.code;
                    }
                }
                state.push(coverageCode);
                const provider = this.panoramaVisible();
                if (provider && provider.viewer) {
                    let viewerState = provider.viewer.getState();
                    if (viewerState) {
                        state.push(provider.code);
                        state.push(...viewerState);
                    }
                }
            }
            return state;
        },

        unserializeState: function(state) {
            if (!state) {
                this.disableControl();
                return true;
            }

            const coverageCode = state[0];
            if (!coverageCode || coverageCode[0] !== '_') {
                return false;
            }
            this.enableControl();
            for (let provider of this.providers) {
                provider.selected(coverageCode.includes(provider.code));
            }
            if (state.length > 2) {
                const panoramaVisible = state[1];
                for (let provider of this.providers) {
                    if (panoramaVisible === provider.code) {
                        this.showPano(provider).then(() => {
                            const success = provider.viewer.setState(state.slice(2));
                            if (!success) {
                                this.hidePanoViewer();
                            }
                        });
                        break;
                    }
                }
            }
            return true;
        }
    }
);

L.Control.Panoramas.hashStateUpgrader = function(panoramasControl) {
    return L.Util.extend({}, L.Mixin.HashState, {
        unserializeState: function(oldState) {
            if (oldState) {
                const upgradedState = ['_g'];
                if (oldState.length) {
                    upgradedState.push('g', ...oldState);
                }
                setTimeout(() => panoramasControl.unserializeState(upgradedState), 0);
            }
            return false;
        },

        serializeState: function() {
            return null;
        },
    });
};
