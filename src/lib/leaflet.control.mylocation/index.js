import L from 'leaflet';
import 'leaflet.locatecontrol';
import './style.css';


const MyLocate = L.Control.Locate.extend({
        options: {
            icon: 'icon-position',
            iconLoading: 'icon-position',
            setView: 'untilPan',
            flyTo: true,
            cacheLocation: false,
            showPopup: false,
            locateOptions: {
                enableHighAccuracy: true,
                watch: true,
                setView: false
            },
            maxZoom: 16,

            circleStyle: {
                interactive: false,
                color: '#4271a8',
                fillOpacity: 0.3,
                weight: 0,
            },
            markerStyle: {
                color: '#2a85d4',
                weight: 2.5,
                opacity: 0.8,
                fillOpacity: 0.4,
                radius: 8
            },
            minCirclePixelRadius: 50

        },

        start: function() {
            this.options.keepCurrentZoomLevel = false;
            L.Control.Locate.prototype.start.call(this);
        },

        _onDrag: function() {
            if (this._settingView) {
                return;
            }
            L.Control.Locate.prototype._onDrag.call(this);
        },

        _activate: function() {
            if (!this._active) {
                this._map.on('movestart', this._onDrag, this);
                this._map.on('zoom', this._onZoom, this);
            }
            L.Control.Locate.prototype._activate.call(this);
        },

        _deactivate: function() {
            L.Control.Locate.prototype._deactivate.call(this);
            this._map.off('movestart', this._onDrag, this);
            this._map.off('zoom', this._onZoom, this);
        },

        _onZoom: function() {
            if (!this._circle || !this.options.minCirclePixelRadius) {
                return;
            }
            if (typeof this._circle._origFillOpacity === 'undefined') {
                this._circle._origFillOpacity = this._circle.options.fillOpacity;
            }
            L.Util.requestAnimFrame(() => {
                const opacity = this._circle._radius < this.options.minCirclePixelRadius ?
                    0 : this._circle._origFillOpacity;
                console.log(this._circle._radius, this.options.minCirclePixelRadius, this._circle._origFillOpacity);
                this._circle.setStyle({fillOpacity: opacity});
            });
        },

        _onClick: function() {
            this.options.keepCurrentZoomLevel = false;
            L.Control.Locate.prototype._onClick.call(this);
        },

        _onMarkerClick: function() {
            this._userPanned = false;
            this._updateContainerStyle();
            this.options.keepCurrentZoomLevel = false;
            this.setView();
        },
    
        _drawMarker: function() {
            var newMarker = !this._marker;
            L.Control.Locate.prototype._drawMarker.call(this);
            if (newMarker) {
                this._marker.on('click', this._onMarkerClick.bind(this));
            }
        },

        setView: function() {
            this._drawMarker();
            if (this._isOutsideMapBounds()) {
                this._event = undefined;  // clear the current location so we can get back into the bounds
                this.options.onLocationOutsideMapBounds(this);
            } else {
                var coords = this._event,
                    lat = coords.latitude,
                    lng = coords.longitude,
                    latlng = new L.LatLng(lat, lng),
                    zoom;
                if (!this.options.keepCurrentZoomLevel) {
                    // fix for leaflet issue #6139
                    var bounds = latlng.toBounds(coords.accuracy * 2);
                    zoom = this._map.getBoundsZoom(bounds);
                    zoom = this.options.maxZoom ? Math.min(zoom, this.options.maxZoom) : zoom;
                }
                this._settingView = true;
                this._map.once('moveend', () => {
                    this._settingView = false;
                });
                var f = this.options.flyTo ? this._map.flyTo : this._map.setView;
                f.call(this._map, latlng, zoom);

                this.options.keepCurrentZoomLevel = true;
            }
        },

    }
);

export {MyLocate};


// + при включение зумить, но не ближе ~16 уровня  и не ближе круга точности.
// + зум можно уменьшать только если круг точности большой и на 16 уровень не помещается
// + при обновлении позиции зум не менять
// + при плавном приближении маркер сильно зумится
// + а что с сохранением состоямия в localStorage? -- ничего