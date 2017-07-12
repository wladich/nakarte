import L from 'leaflet';
import './style.css';
import 'lib/controls-styles/controls-styles.css';
import ko from 'vendored/knockout';
import googleProvider from './lib/google';
import mapillaryProvider from './lib/mapillary';

function fireRefreshEventOnWindow() {
    const evt = document.createEvent("HTMLEvents");
    evt.initEvent('resize', true, false);
    window.dispatchEvent(evt);
}


const PanoMarker = L.Marker.extend({
    initialize: function() {
        const icon = L.divIcon({
                className: 'leaflet-panorama-marker-wraper',
                html: '<div class="leaflet-panorama-marker"></div>'
            }
        );
        L.Marker.prototype.initialize.call(this, [0, 0], {icon, interactive: false});
    },

    setHeading: function(angle) {
        let markerIcon = this.getElement();
        markerIcon = markerIcon.children[0];
        markerIcon.style.transform = `rotate(${angle}deg)`;
    }
});

L.Control.Panoramas = L.Control.extend({
        includes: L.Mixin.Events,

        options: {
            position: 'topleft'
        },

        initialize: function(panoramaContainer, options) {
            L.Control.prototype.initialize.call(this, options);
            this.googleCoverageSelected = ko.observable(true);
            this.mapillaryCoverageSelected = ko.observable(false);
            this.googleCoverageSelected.subscribe(this.updateCoverageVisibility, this);
            this.mapillaryCoverageSelected.subscribe(this.updateCoverageVisibility, this);
            this._panoramaContainer = panoramaContainer;
            this._googlePanoramaContainer = L.DomUtil.create('div', 'panorama-container', panoramaContainer);
            this._mapillaryPanoramaContainer = L.DomUtil.create('div', 'panorama-container', panoramaContainer);
        },

        onAdd: function(map) {
            this._map = map;
            const container = this._container = L.DomUtil.create('div', 'leaflet-control leaflet-contol-panoramas');
            container.innerHTML = `
                <a name="button" class="panoramas-button leaflet-control-button icon-panoramas" title="Show panoramas"
                    data-bind="click: onButtonClick"></a>
                <div class="panoramas-list control-form">
                    <div><label><input type="checkbox" data-bind="checked: googleCoverageSelected">Google street view</label></div>
                    <div><label><input type="checkbox" data-bind="checked: mapillaryCoverageSelected">Mapillary</label></div>
                </div>
            `;
            this._stopContainerEvents();
            ko.applyBindings(this, container);
            map.createPane('rasterOverlay').style.zIndex = 300;
            return container;
        },

        onButtonClick: function() {
            if (this.controlEnabled) {
                this.disableControl();
            } else {
                this.enableControl();
            }
        },

        enableControl: function() {
            if (this.controlEnabled) {
                return;
            }
            this.controlEnabled = true;
            L.DomUtil.addClass(this._container, 'enabled');
            this.updateCoverageVisibility();
            this._map.on('click', this.onMapClick, this);
            L.DomUtil.addClass(this._map._container, 'panoramas-control-active');
            this.notifyChanged();
        },

        disableControl: function() {
            if (!this.controlEnabled) {
                return;
            }
            this.controlEnabled = false;
            L.DomUtil.removeClass(this._container, 'enabled');
            this.updateCoverageVisibility();
            this._map.off('click', this.onMapClick, this);
            this.hidePanoViewer();
            L.DomUtil.removeClass(this._map._container, 'panoramas-control-active');
            this.notifyChanged();
        },

        updateCoverageVisibility: function() {
            if (!this._map) {
                return;
            }
            if (this.controlEnabled && this.googleCoverageSelected()) {
                if (!this.googleCoverage) {
                    this.googleCoverage = googleProvider.getCoverageLayer({pane: 'rasterOverlay', zIndex: 2});
                }
                this.googleCoverage.addTo(this._map);
            } else {
                if (this.googleCoverage) {
                    this.googleCoverage.removeFrom(this._map)
                }
            }

            if (this.controlEnabled && this.mapillaryCoverageSelected()) {
                if (!this.mapillaryCoverage) {
                    this.mapillaryCoverage = mapillaryProvider.getCoverageLayer({pane: 'rasterOverlay', opacity: 0.7,
                        zIndex: 1});
                }
                this.mapillaryCoverage.addTo(this._map);
            } else {
                if (this.mapillaryCoverage) {
                    this.mapillaryCoverage.removeFrom(this._map)
                }
            }
            this.notifyChanged();
        },

        showPanoramaContainer: function() {
            L.DomUtil.addClass(this._panoramaContainer, 'enabled');
            fireRefreshEventOnWindow();
        },

        panoramaVisible: function() {
            if (L.DomUtil.hasClass(this._panoramaContainer, 'enabled')) {
                if (L.DomUtil.hasClass(this._googlePanoramaContainer, 'enabled')) {
                    return 'google';
                }
                if (L.DomUtil.hasClass(this._mapillaryPanoramaContainer, 'enabled')) {
                    return 'mapillary';
                }
            }
            return false;
        },

        hidePanoGoogle: function() {
            L.DomUtil.removeClass(this._googlePanoramaContainer, 'enabled');
            if (this.googleViewer) {
                this.googleViewer.deactivate();
            }
        },

        hidePanoMapillary: function() {
            L.DomUtil.removeClass(this._mapillaryPanoramaContainer, 'enabled');
            if (this.mapillaryViewer) {
                this.mapillaryViewer.deactivate();
            }
        },

        showPanoGoogle: async function(data) {
            this.hidePanoMapillary();
            this.showPanoramaContainer();
            L.DomUtil.addClass(this._googlePanoramaContainer, 'enabled');
            if (!this.googleViewer) {
                this.googleViewer = await googleProvider.getViewer(this._googlePanoramaContainer);
                this.setupViewerEvents(this.googleViewer);
            }
            this.googleViewer.activate();
            if (data) {
                this.googleViewer.showPano(data);
            }
            this.notifyChanged();
        },

        showPanoMapillary: async function(data) {
            this.showPanoramaContainer();
            this.hidePanoGoogle();
            L.DomUtil.addClass(this._mapillaryPanoramaContainer, 'enabled');
            if (!this.mapillaryViewer) {
                this.mapillaryViewer = await mapillaryProvider.getViewer(this._mapillaryPanoramaContainer);
                this.setupViewerEvents(this.mapillaryViewer);
            }
            if (data) {
                this.mapillaryViewer.showPano(data);
            }
            this.mapillaryViewer.activate();
            this.notifyChanged();
        },

        setupViewerEvents: function(viewer) {
            viewer.on({
                'change': this.onPanoramaChangeView,
                'closeclick': this.onPanoramaCloseClick
            }, this);
        },

        hidePanoViewer: function() {
            this.hidePanoGoogle();
            this.hidePanoMapillary();
            L.DomUtil.removeClass(this._panoramaContainer, 'enabled');
            this.hideMarker();
            fireRefreshEventOnWindow();
            this.notifyChanged();
        },


        placeMarker: function(latlng, heading) {
            if (!this.panoramaVisible()) {
                return;
            }
            if (!this.marker) {
                this.marker = new PanoMarker();
            }
            this._map.addLayer(this.marker);
            this.marker.setLatLng(latlng);
            this.marker.setHeading(heading);
        },

        hideMarker: function() {
            if (this.marker) {
                this._map.removeLayer(this.marker);
            }
        },
        notifyChanged: function() {
            this.fire('panoramachanged');
        },

        onPanoramaChangeView: function(e) {
            if (!this._map.getBounds().pad(-0.05).contains(e.latlng)) {
                this._map.panTo(e.latlng);
            }
            this.placeMarker(e.latlng, e.heading);
            this.notifyChanged();
        },

        onPanoramaCloseClick: function(e) {
            this.hidePanoViewer();
        },

        onMapClick: async function(e) {
            let
                googlePanoPromise, mapillaryPanoPromise;
            const
                searchRadiusPx = 24,
                p = this._map.project(e.latlng).add([searchRadiusPx, 0]),
                searchRadiusMeters = e.latlng.distanceTo(this._map.unproject(p));
            if (this.googleCoverageSelected()) {
                googlePanoPromise = googleProvider.getPanoramaAtPos(e.latlng, searchRadiusMeters);
            }
            if (this.mapillaryCoverageSelected()) {
                mapillaryPanoPromise = mapillaryProvider.getPanoramaAtPos(e.latlng, searchRadiusMeters);
            }
            if (googlePanoPromise) {
                let searchResult = await googlePanoPromise;
                if (searchResult.found) {
                    this.showPanoGoogle(searchResult.data);
                    return;
                }
            }
            if (mapillaryPanoPromise) {
                let searchResult = await mapillaryPanoPromise;
                if (searchResult.found) {
                    this.showPanoMapillary(searchResult.data);
                    return;
                }

            }
        }
    },
);

L.Control.Panoramas.include(L.Mixin.HashState);
L.Control.Panoramas.include({
        stateChangeEvents: ['panoramachanged'],

        serializeState: function() {
            let state = null;
            if (this.controlEnabled) {
                state = [];
                let coverageCode='_';
                if (this.mapillaryCoverageSelected()) {
                    coverageCode += 'm';
                }
                if (this.googleCoverageSelected()) {
                    coverageCode += 'g';
                }
                state.push(coverageCode);
                const panoramaVisible = this.panoramaVisible();
                if (panoramaVisible) {
                    let code = {'google': 'g', 'mapillary': 'm'}[panoramaVisible];
                    let viewer = {'google': this.googleViewer, 'mapillary': this.mapillaryViewer}[panoramaVisible];
                    if (viewer) {
                        let viewerState = viewer.getState();
                        if (viewerState) {
                            state.push(code);
                            state.push(...viewerState);
                        }
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
            this.googleCoverageSelected(coverageCode.includes('g'));
            this.mapillaryCoverageSelected(coverageCode.includes('m'));
            if (state.length > 2) {
                const panoramaVisible = state[1];
                if (panoramaVisible === 'g') {
                    this.showPanoGoogle().then(() => this.googleViewer.setState(state.slice(2)));
                }
                if (panoramaVisible === 'm') {
                    this.showPanoMapillary().then(() => this.mapillaryViewer.setState(state.slice(2)));
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
                console.log('Upgrading');
                const upgradedState = ['_g'];
                if (oldState.length) {
                    upgradedState.push('g', ...oldState);
                }
                setTimeout(()=> panoramasControl.unserializeState(upgradedState), 0);
            }
            return false;
        },

        serializeState: function() {
            return null;
        },
    });



};