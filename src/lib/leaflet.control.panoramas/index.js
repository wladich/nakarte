import L from 'leaflet';
import './style.css';
import 'lib/controls-styles/controls-styles.css';
import ko from 'vendored/knockout';
import googleProvider from './lib/google';
import mapillaryProvider from './lib/mapillary';
import wikimediaProvider from './lib/wikimedia';

function fireRefreshEventOnWindow() {
    const evt = document.createEvent("HTMLEvents");
    evt.initEvent('resize', true, false);
    window.dispatchEvent(evt);
}


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
    },

    getIcon: function() {
        let markerIcon = this.getElement();
        markerIcon = markerIcon.children[0];
        return markerIcon;
    },

    setHeading: function(angle) {
        const markerIcon = this.getIcon();
        markerIcon.style.transform = `rotate(${angle || 0}deg)`;
    },

    setType: function(markerType) {
        const className = {
            'slim': 'leaflet-panorama-marker-circle',
            'normal': 'leaflet-panorama-marker-binocular'}[markerType]
        this.getIcon().className = className;
    }
});

L.Control.Panoramas = L.Control.extend({
        includes: L.Mixin.Events,

        options: {
            position: 'topleft'
        },

        getProviders: function() {
            return [
                {name: 'google', title: 'Google street view', provider: googleProvider, layerOptions: {zIndex:10},
                 code: 'g',
                 selected: ko.observable(true),
                 mapMarkerType: 'normal'},
                {name: 'wikimedia', title: 'Wikimedia commons', provider: wikimediaProvider,
                    layerOptions: {opacity: 0.7, zIndex: 9},
                    code: 'w',
                    selected: ko.observable(false),
                    mapMarkerType: 'slim'
                },
                {name: 'mapillary', title: 'Mapillary', provider: mapillaryProvider,
                    layerOptions: {opacity: 0.7, zIndex: 8},
                    code: 'm',
                    selected: ko.observable(false),
                    mapMarkerType: 'normal'},
            ]
        },

        initialize: function(panoramaContainer, options) {
            L.Control.prototype.initialize.call(this, options);
            this._panoramaContainer = panoramaContainer;
            this.providers = this.getProviders();
            for (let provider of this.providers) {
                provider.selected.subscribe(this.updateCoverageVisibility, this);
                provider.container = L.DomUtil.create('div', 'panorama-container', panoramaContainer);
            }
            this.nearbyPoints = [];
        },

        onAdd: function(map) {
            this._map = map;
            const container = this._container = L.DomUtil.create('div', 'leaflet-control leaflet-contol-panoramas');
            container.innerHTML = `
                <a name="button" class="panoramas-button leaflet-control-button icon-panoramas" title="Show panoramas"
                    data-bind="click: onButtonClick"></a>
                <div class="panoramas-list control-form" data-bind="foreach: providers">
                    <div><label><input type="checkbox" data-bind="checked: selected"><span data-bind="text: title"></span></label></div>
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
            this.notifyChanged();
        },

        showPanoramaContainer: function() {
            L.DomUtil.addClass(this._panoramaContainer, 'enabled');
            fireRefreshEventOnWindow();
        },

        panoramaVisible: function() {
            if (L.DomUtil.hasClass(this._panoramaContainer, 'enabled')) {
                for (let provider of this.providers) {
                    if (L.DomUtil.hasClass(provider.container, 'enabled')) {
                        return provider
                    }
                }
            }
            return false;
        },

        setupNearbyPoints: function(points) {
            for (let point of this.nearbyPoints) {
                this._map.removeLayer(point)
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
                provider.viewer = await provider.provider.getViewer(provider.container);
                this.setupViewerEvents(provider);
            }
            if (data) {
                // wait for panorama container become of right size, needed for viewer setup
                L.Util.requestAnimFrame(() => provider.viewer.showPano(data));
            }
            provider.viewer.activate();
            this.notifyChanged();
        },

        setupViewerEvents: function(provider) {
            provider.viewer.on({
                'change': this.onPanoramaChangeView.bind(this, provider),
                'closeclick': this.onPanoramaCloseClick
            }, this);
        },

        hidePanoViewer: function() {
            for (let provider of this.providers) {
                this.hidePano(provider);
            }
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

        onPanoramaChangeView: function(provider, e) {
            if (!this._map.getBounds().pad(-0.05).contains(e.latlng)) {
                this._map.panTo(e.latlng);
            }
            this.placeMarker(e.latlng, e.heading);
            this.marker.setType(provider.mapMarkerType);
            this.setupNearbyPoints(e.latlngs);
            this.notifyChanged();
        },

        onPanoramaCloseClick: function(e) {
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
                    this.showPano(provider, searchResult.data);
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
                for (let provider of this.providers) {
                    if (provider.selected()){
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
                provider.selected(coverageCode.includes(provider.code))
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