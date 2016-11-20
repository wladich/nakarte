import L from 'leaflet';
import './style.css';
import getGoogle from 'lib/googleMapsApi/googleMapsApi';


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
            this.marker = L.marker([0, 0], {icon: icon});
        },

        onAdd: function(map) {
            this._map = map;
            const container = L.DomUtil.create('a', 'leaflet-control leaflet-contol-button leaflet-contol-panoramas');
            container.title = 'Show panoramas';
            L.DomEvent.disableClickPropagation(container);
            if (!L.Browser.touch) {
                L.DomEvent.disableScrollPropagation(container);
            }
            L.DomEvent.on(container, 'click', this.onButtonClick, this);

            map.createPane('rasterOverlay').style.zIndex = 300;
            this._coverageLayer = L.tileLayer(
                'https://mts1.googleapis.com/vt?lyrs=svv|cb_client:apiv3&style=40,18&x={x}&y={y}&z={z}',
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
            this.fire('panoramachanged')
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
                return [];
            }
            const state = [];
            if (this.panoramaVisible) {
                state.push('1');
                if (this.panoramaPosition && this.panoramaAngle !== undefined) {
                    state.push(this.panoramaPosition.lat.toFixed(5));
                    state.push(this.panoramaPosition.lng.toFixed(5));
                    state.push(Math.round(this.panoramaAngle.heading).toFixed());
                    state.push(Math.round(this.panoramaAngle.pitch).toFixed());
                    state.push(Math.round(this.panoramaAngle.zoom).toFixed(2));
                }
            } else {
                state.push('0');
            }
            return state;
        },

        unserializeState: function(state) {
            if (!state || !state.length) {
                this.hidePanorama();
                this.hideCoverage();
                return;
            }
            if (state[0] === '1') {
                this.showCoverage();
                const lat = parseFloat(state[1]);
                const lng = parseFloat(state[2]);
                const heading = parseFloat(state[3]);
                const pitch = parseFloat(state[4]);
                const zoom = parseFloat(state[5]);
                if (!isNaN(lat) && !isNaN(lng) && !isNaN(heading) && !isNaN(pitch)) {
                    this.showPanoramaAtPos(L.latLng(lat, lng), {heading, pitch, zoom});
                }

            } else {
                this.hidePanorama();
                this.showCoverage();
            }
        }
    }
);