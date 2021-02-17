import L from 'leaflet';
import {makeButton} from '~/lib/leaflet.control.commons';
import './style.css';
import localStorage from '~/lib/safe-localstorage';

const STATE_DISABLED = 'disabled';
const STATE_LOCATING = 'locating';
const STATE_ENABLED = 'enabled';
const STATE_ENABLED_FOLLOWING = 'enabled_following';
const STATE_MOVING_TO_FOLLOWING = 'moving_to_following';
const STATE_MOVING_TO_FOLLOWING_FIRST = 'moving_to_following_first';
const STATE_UPDATING_FOLLOWING = 'updating_following';

const EVENT_INIT = 'init';
const EVENT_BUTTON_CLICK = 'button_click';
const EVENT_LOCATION_RECEIVED = 'location_received';
const EVENT_LOCATION_ERROR = 'location_error';
const EVENT_MAP_MOVE = 'user_move';
const EVENT_MAP_MOVE_END = 'map_move_end';

const LOCALSTORAGE_POSITION = 'leaflet_locate_position';

const PositionMarker = L.LayerGroup.extend({
    initialize: function(options) {
        L.LayerGroup.prototype.initialize.call(this, options);
        this._locationSet = false;
        this._elements = {
            accuracyCircle: L.circle([0, 0], {
                radius: 1,
                interactive: false,
                fillColor: '#4271a8',
                color: '#2ba3f7',
                weight: 2
            }),
            markerCircle: L.circleMarker([0, 0], {
                interactive: false,
                radius: 10,
                color: '#2ba3f7',
                weight: 2.5,
                fill: null,
                opacity: 0.8
            }),
            markerPoint: L.circleMarker([0, 0], {
                interactive: false,
                radius: 2,
                weight: 0,
                color: '#2ba3f7',
                fillOpacity: 0.8
            }),
        };
        this.addLayer(this._elements.accuracyCircle);
    },

    onAdd: function(map) {
        L.LayerGroup.prototype.onAdd.call(this, map);
        map.on('zoom', this._onZoom, this);
        this._updatePrecisionState();
    },

    onRemove: function(map) {
        map.off('zoom', this._onZoom, this);
        L.LayerGroup.prototype.onRemove.call(this, map);
    },

    _updatePrecisionState: function() {
        if (!this._map || !this._locationSet) {
            return;
        }
        const precise = this._elements.accuracyCircle._radius <= this._elements.markerCircle.options.radius * 0.8;
        if (precise !== this._precise) {
            if (precise) {
                this._elements.accuracyCircle.setStyle({opacity: 0, fillOpacity: 0});
                this.addLayer(this._elements.markerPoint);
                this.addLayer(this._elements.markerCircle);
            } else {
                this._elements.accuracyCircle.setStyle({opacity: 0.8, fillOpacity: 0.4});
                this.removeLayer(this._elements.markerPoint);
                this.removeLayer(this._elements.markerCircle);
            }
            this._precise = precise;
        }
    },

    setLocation: function(latlng, accuracy) {
        this._elements.accuracyCircle.setLatLng(latlng);
        this._elements.accuracyCircle.setRadius(accuracy);
        this._elements.markerCircle.setLatLng(latlng);
        this._elements.markerPoint.setLatLng(latlng);
        this._locationSet = true;
        this._updatePrecisionState();
    },

    _onZoom: function() {
        this._updatePrecisionState();
    }

});

const LocateControl = L.Control.extend({
        // button click behavior:
        // if button turned off -- turn on, maps follows marker
        // if button turned on
        //     if map is following marker -- turn off
        //     if map not following marker -- center map at marker, start following

        options: {
            locationAcquireTimeoutMS: Infinity,
            showError: ({message}) => {
                alert(message);
            },
            maxAutoZoom: 17,
            minAutoZoomDeltaForAuto: 4,
            minDistForAutoZoom: 2 // in average screen sizes
        },

        initialize: function(options) {
            L.Control.prototype.initialize.call(this, options);
            this._events = [];
        },

        onAdd: function(map) {
            this._map = map;
            const {container, link} = makeButton('leaflet-control-locate', 'Where am I?', 'icon-position');
            this._container = container;
            L.DomEvent.on(link, 'click', () => this._handleEvent(EVENT_BUTTON_CLICK));
            this._marker = new PositionMarker();
            this._handleEvent(EVENT_INIT);
            return container;
        },

        moveMapToCurrentLocation: function(zoom) {
            let storedPosition = null;
            try {
                storedPosition = JSON.parse(localStorage.getItem(LOCALSTORAGE_POSITION));
                let {lat, lon} = storedPosition;
                if (lat && lon) {
                    storedPosition = L.latLng(lat, lon);
                } else {
                    storedPosition = null;
                }
            } catch (e) {
                // ignore invalid data from localstorage
            }

            if (storedPosition) {
                this._map.setView(storedPosition, zoom, {animate: false});
                if (!('geolocation' in navigator)) {
                    return;
                }
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        this._storePositionToLocalStorage(pos);
                        this._map.setView(L.latLng(pos.coords.latitude, pos.coords.longitude), zoom, {
                            animate: false,
                        });
                    },
                    (e) => {
                        if (e.code === 1) {
                            localStorage.removeItem(LOCALSTORAGE_POSITION);
                        }
                    }, {
                    enableHighAccuracy: false,
                    timeout: 500,
                    maximumAge: 0
                });
            }
        },

        _startLocating: function() {
            if (!('geolocation' in navigator) || !('watchPosition' in navigator.geolocation)) {
                const error = {code: 0, message: 'Geolocation not supported'};
                setTimeout(() => {
                        this._onLocationError(error);
                    }, 0
                );
            }
            this._watchID = navigator.geolocation.watchPosition(
                this._onLocationSuccess.bind(this), this._onLocationError.bind(this),
                {
                    enableHighAccuracy: true,
                    timeout: this.options.locationAcquireTimeoutMS,
                }
            );
        },

        _storePositionToLocalStorage: function(pos) {
            const coords = {lat: pos.coords.latitude, lon: pos.coords.longitude};
            localStorage.setItem(LOCALSTORAGE_POSITION, JSON.stringify(coords));
        },

        _onLocationSuccess: function(pos) {
            this._handleEvent(EVENT_LOCATION_RECEIVED, pos);
            this._storePositionToLocalStorage(pos);
        },

        _onLocationError: function(e) {
            this._handleEvent(EVENT_LOCATION_ERROR, e);
            if (e.code === 1) {
                localStorage.removeItem(LOCALSTORAGE_POSITION);
            }
        },

        _stopLocating: function() {
            if (this._watchID && navigator.geolocation) {
                navigator.geolocation.clearWatch(this._watchID);
            }
        },

        _storeLocation: function(position) {
            this._latlng = L.latLng(position.coords.latitude, position.coords.longitude);
            this._accuracy = position.coords.accuracy;
        },

        _updateMarkerLocation: function() {
            this._marker.setLocation(this._latlng, this._accuracy);
        },

        _updateMapPositionWhileFollowing: function() {
            this._updateFollowingStartPosition = this._map.getCenter();
            this._updateFollowingDestPosition = this._latlng;
            this._map.panTo(this._latlng);
        },

        _setViewToLocation: function(preferAutoZoom) {
            if (!this._map || !this._latlng) {
                return;
            }

            // autoZoom -- to fit accuracy cirlce on screen, but not more then options.maxAutoZoom (17)
            // if current zoom more then options.minAutoZoomDeltaForAuto less then autoZoom, set autoZoom
            // if map center far from geolocation, set autoZoom
            // if map center not far from geolocation
            //      if accuracy circle does not fit at current zoom, zoom out to fit
            //      if  current zoom is less then minAutoZoomDeltaForAuto less then autoZoom
            //          or >= autoZoom and circle fits screen, keep current zoom

            const currentZoom = this._map.getZoom();
            let zoomFitAccuracy = this._map.getBoundsZoom(this._latlng.toBounds(this._accuracy * 2));
            let autoZoom = zoomFitAccuracy;
            let newZoom;
            autoZoom = Math.min(autoZoom, this.options.maxAutoZoom);

            if (preferAutoZoom || autoZoom - currentZoom >= this.options.minAutoZoomDeltaForAuto) {
                newZoom = autoZoom;
            } else {
                const p1 = this._map.project(this._map.getCenter());
                const p2 = this._map.project(this._latlng);
                const screenSize = this._map.getSize();
                const averageScreenSize = (screenSize.x + screenSize.y) / 2;
                if (p1.distanceTo(p2) > averageScreenSize * this.options.minDistForAutoZoom) {
                    newZoom = autoZoom;
                } else {
                    newZoom = currentZoom > zoomFitAccuracy ? zoomFitAccuracy : currentZoom;
                }
            }
            this._map.setView(this._latlng, newZoom);
        },

        _onMapMove: function() {
            this._handleEvent(EVENT_MAP_MOVE);
        },

        _onMapMoveEnd: function() {
            const ll = this._map.getCenter();
            setTimeout(() => {
                    if (this._map.getCenter().equals(ll)) {
                        this._handleEvent(EVENT_MAP_MOVE_END);
                    }
                }, 100
            );
        },

        _isMapOffsetFromFollowingSegment: function() {
            if (this._updateFollowingStartPosition) {
                const p = this._map.project(this._map.getCenter());
                const p1 = this._map.project(this._updateFollowingStartPosition);
                const p2 = this._map.project(this._updateFollowingDestPosition);
                return L.LineUtil.pointToSegmentDistance(p, p1, p2) > 5;
            }
            return true;
        },

        _isMapCenteredAtLocation: function() {
            if (!this._latlng || !this._map) {
                return false;
            }
            let p1 = this._map.project(this._latlng);
            let p2 = this._map.project(this._map.getCenter());
            return p1.distanceTo(p2) < 5;
        },

        _updateButtonClasses: function(add, remove) {
            for (let cls of add) {
                L.DomUtil.addClass(this._container, cls);
            }
            for (let cls of remove) {
                L.DomUtil.removeClass(this._container, cls);
            }
        },

        _setEvents: function(on) {
            const f = on ? 'on' : 'off';
            this._map[f]('move', this._onMapMove, this);
            this._map[f]('moveend', this._onMapMoveEnd, this);
        },

        _handleEvent: function(event, data) {
            this._events.push({event, data});
            if (!this._processingEvent) {
                this._processingEvent = true;
                while (this._events.length) {
                    this._processEvent(this._events.shift());
                }
                this._processingEvent = false;
            }
        },

        _processEvent: function({event, data}) { // eslint-disable-line complexity
            // console.log('PROCESS EVENT', event);
            const state = this._state;
            switch (event) {
                case EVENT_INIT:
                    this._setState(STATE_DISABLED);
                    break;
                case EVENT_BUTTON_CLICK:
                    if (state === STATE_DISABLED) {
                        this._setState(STATE_LOCATING);
                    } else if (state === STATE_ENABLED) {
                        this._setState(STATE_MOVING_TO_FOLLOWING);
                        this._setViewToLocation();
                    } else {
                        this._setState(STATE_DISABLED);
                    }
                    break;
                case EVENT_LOCATION_RECEIVED:
                    if (state === STATE_DISABLED) {
                        return;
                    }
                    this._storeLocation(data);
                    this._updateMarkerLocation();
                    if (state === STATE_LOCATING || state === STATE_MOVING_TO_FOLLOWING_FIRST) {
                        this._setViewToLocation(true);
                        this._setState(STATE_MOVING_TO_FOLLOWING_FIRST);
                    } else if (state === STATE_MOVING_TO_FOLLOWING) {
                        this._setViewToLocation();
                    } else if (this._state === STATE_ENABLED_FOLLOWING || state === STATE_UPDATING_FOLLOWING) {
                        this._updateMapPositionWhileFollowing();
                        this._setState(STATE_UPDATING_FOLLOWING);
                    }
                    break;
                case EVENT_LOCATION_ERROR:
                    if (state === STATE_DISABLED) {
                        return;
                    }
                    this.options.showError(data);
                    this._setState(STATE_DISABLED);
                    break;
                case EVENT_MAP_MOVE:
                    if (state === STATE_ENABLED_FOLLOWING) {
                        if (!this._isMapCenteredAtLocation() && this._isMapOffsetFromFollowingSegment()) {
                            this._setState(STATE_ENABLED);
                        }
                    }
                    break;
                case EVENT_MAP_MOVE_END:
                    if (state === STATE_MOVING_TO_FOLLOWING) {
                        if (this._isMapCenteredAtLocation()) {
                            this._setState(STATE_ENABLED_FOLLOWING);
                        } else {
                            this._setState(STATE_ENABLED);
                        }
                    } else if (state === STATE_UPDATING_FOLLOWING || state === STATE_MOVING_TO_FOLLOWING_FIRST) {
                        if (this._isMapCenteredAtLocation() || !this._isMapOffsetFromFollowingSegment()) {
                            this._setState(STATE_ENABLED_FOLLOWING);
                        } else {
                            this._setState(STATE_ENABLED);
                        }
                    }
                    break;
                default:
            }
        },

        _setState: function(newState) {
            const oldState = this._state;
            if (oldState === newState) {
                return;
            }
            // console.log(`STATE: ${oldState} -> ${newState}`);
            switch (newState) {
                case STATE_LOCATING:
                    this._startLocating();
                    this._updateButtonClasses(['requesting'], ['active', 'following']);
                    this._setEvents(true);
                    break;
                case STATE_DISABLED:
                    this._stopLocating();
                    this._marker.removeFrom(this._map);
                    this._setEvents(false);
                    this._updateButtonClasses([], ['active', 'highlight', 'following', 'requesting']);
                    break;
                case STATE_ENABLED:
                    this._updateButtonClasses(['active', 'highlight'], ['following', 'requesting']);
                    break;
                case STATE_MOVING_TO_FOLLOWING_FIRST:
                    this._marker.addTo(this._map);
                    break;
                case STATE_ENABLED_FOLLOWING:
                    this._updateButtonClasses(['active', 'highlight', 'following'], ['requesting']);
                    break;
                default:
            }
            this._state = newState;
        },
    }
);

export {LocateControl};
