import L from 'leaflet';
import './style.css';
import 'lib/controls-styles/controls-styles.css';
import getGoogle from 'lib/googleMapsApi';


L.Control.Panoramas = L.Control.extend({
        includes: L.Mixin.Events,

        options: {
            position: 'topleft'
        },

        initialize: function(panoramaContainer, options) {
            L.Control.prototype.initialize.call(this, options);
            this._panoramaContainer = panoramaContainer;

            const icon = L.divIcon({
                    className: 'leaflet-panorama-marker-wraper',
                    html: '<div class="leaflet-panorama-marker"></div>'
                }
            );
            this.marker = L.marker([0, 0], {icon: icon, interactive: false});
        },

        onAdd: function(map) {
            this._map = map;
            const container = L.DomUtil.create('a', 'leaflet-control leaflet-control-button leaflet-contol-panoramas');
            container.title = 'Show panoramas';
            L.DomEvent.disableClickPropagation(container);
            if (!L.Browser.touch) {
                L.DomEvent.disableScrollPropagation(container);
            }
            L.DomEvent.on(container, 'click', this.onButtonClick, this);

            map.createPane('rasterOverlay').style.zIndex = 300;
            this._coverageLayer = L.tileLayer(
                'https://maps.googleapis.com/maps/vt?pb=!1m5!1m4!1i{z}!2i{x}!3i{y}!4i256!2m8!1e2!2ssvv!4m2!1scb_client!2sapiv3!4m2!1scc!2s*211m3*211e3*212b1*213e2*211m3*211e2*212b1*213e2!3m5!3sUS!12m1!1e40!12m1!1e18!4e0',
                {pane: 'rasterOverlay'}
            );

            return container;
        },

        onRemove: function() {
            this._map = null;
            this.hideCoverage();
            this.hidePanorama();
        },

        showPanorama: function() {
            if (this.panoramaVisible) {
                return;
            }
            L.DomUtil.addClass(this._panoramaContainer, 'enabled');
            this.getGoogleApi().then((api) => api.panorama.setVisible(true));
            window.dispatchEvent(new Event('resize'));
            this.marker.addTo(this._map);
            this.panoramaVisible = true;
            this.notifyChanged();
        },

        hidePanorama: function() {
            if (!this.panoramaVisible) {
                return;
            }
            this.getGoogleApi().then((api) => api.panorama.setVisible(false));
            L.DomUtil.removeClass(this._panoramaContainer, 'enabled');
            window.dispatchEvent(new Event('resize'));
            this._map.removeLayer(this.marker);
            this.panoramaVisible = false;
            this.notifyChanged();
        },

        showCoverage: function() {
            if (this.coverageVisible) {
                return;
            }
            L.DomUtil.addClass(this.getContainer(), 'enabled');
            L.DomUtil.addClass(this._map._container, 'panoramas-control-active');
            this._coverageLayer.addTo(this._map);
            this._map.on('click', this.onMapClick, this);
            this.coverageVisible = true;
            this.notifyChanged();
        },

        onMapClick: function(e) {
            this.showPanoramaAtPos(e.latlng);
        },

        showPanoramaAtPos: function(latlng, pov) {
            this.showPanorama();
            const searchRadiusPx = 24;
            const p = this._map.project(latlng).add([searchRadiusPx, 0]);
            const searchRadiusMeters = latlng.distanceTo(this._map.unproject(p));

            function setPanoramaPosition(api, panoData, status) {
                if (status === api.google.maps.StreetViewStatus.OK) {
                    api.panorama.setPosition(panoData.location.latLng);
                }
                if (pov) {
                    api.panorama.setPov(pov);
                }
            }

            this.getGoogleApi().then((api) => {
                    api.service.getPanorama({
                            location: latlng,
                            radius: searchRadiusMeters,
                            preference: api.google.maps.StreetViewPreference.NEAREST
                        }, setPanoramaPosition.bind(null, api)
                    );
                }
            );
        },

        hideCoverage: function() {
            if (!this.coverageVisible) {
                return;
            }
            L.DomUtil.removeClass(this.getContainer(), 'enabled');
            L.DomUtil.removeClass(this._map._container, 'panoramas-control-active');
            this._coverageLayer.removeFrom(this._map);
            this._map.off('click', this.onMapClick, this);
            this.coverageVisible = false;
            this.notifyChanged();
        },

        onButtonClick: function() {
            if (!this.coverageVisible) {
                this.showCoverage();
            } else {
                this.hideCoverage();
                this.hidePanorama();
            }
        },

        onPanoramaChangePosition: function() {
            this.getGoogleApi().then((api) => {
                    let pos = api.panorama.getPosition();
                    if (pos) {
                        pos = L.latLng([pos.lat(), pos.lng()]);
                        this.marker.setLatLng(pos);
                        if (!this._map.getBounds().contains(pos)) {
                            this._map.panTo(pos);
                        }
                        this.panoramaPosition = pos;
                    } else {
                        this.panoramaPosition = null;
                    }
                    this.notifyChanged();
                }
            );
        },

        onPanoramaChangeView: function() {
            let markerIcon = this.marker.getElement();
            if (markerIcon) {
                markerIcon = markerIcon.children[0]
            }
            this.getGoogleApi().then((api) => {
                    const pov = api.panorama.getPov();
                    if (markerIcon) {
                        markerIcon.style.transform = `rotate(${pov.heading}deg)`;
                    }
                    this.panoramaAngle = pov;
                    this.notifyChanged();
                }
            );
        },

        notifyChanged: function() {
            this.fire('panoramachanged');
        },

        getGoogleApi: function() {
            if (!this._googleApi) {
                this._googleApi = getGoogle().then((google) => {
                        const panorama = new google.maps.StreetViewPanorama(this._panoramaContainer, {
                                enableCloseButton: true,
                                imageDateControl: true
                            }
                        );
                        panorama.addListener('position_changed', this.onPanoramaChangePosition.bind(this));
                        panorama.addListener('pov_changed', this.onPanoramaChangeView.bind(this));
                        panorama.addListener('closeclick', this.hidePanorama.bind(this));

                        return {
                            google,
                            service: new google.maps.StreetViewService(),
                            panorama

                        }
                    }
                );
            }
            return this._googleApi;

        }
    }
);

L.Control.Panoramas.include(L.Mixin.HashState);
L.Control.Panoramas.include({
        stateChangeEvents: ['panoramachanged'],

        serializeState: function() {
            if (!this.coverageVisible) {
                return null;
            }
            const state = [];
            if (this.panoramaVisible && this.panoramaPosition && this.panoramaAngle !== undefined) {
                state.push(this.panoramaPosition.lat.toFixed(5));
                state.push(this.panoramaPosition.lng.toFixed(5));
                state.push(this.panoramaAngle.heading.toFixed(1));
                state.push(this.panoramaAngle.pitch.toFixed(1));
                state.push(this.panoramaAngle.zoom.toFixed(1));
            }
            return state;
        },

        unserializeState: function(state) {
            if (!state) {
                this.hidePanorama();
                this.hideCoverage();
                return true;
            }
            if (state.length === 0) {
                this.hidePanorama();
                this.showCoverage();
                return true;
            }

            const lat = parseFloat(state[0]);
            const lng = parseFloat(state[1]);
            const heading = parseFloat(state[2]);
            const pitch = parseFloat(state[3]);
            const zoom = parseFloat(state[4]);
            if (!isNaN(lat) && !isNaN(lng) && !isNaN(heading) && !isNaN(pitch)) {
                this.showCoverage();
                this.showPanoramaAtPos(L.latLng(lat, lng), {heading, pitch, zoom});
                return true;
            }

            return false;
        }
    }
);