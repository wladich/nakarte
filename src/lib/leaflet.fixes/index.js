import L from 'leaflet';
import './style.css';

function fixAll() {
    fixPanAnimationBug();
    fixTouchDetection();
    fixMapKeypressEvent();
    fixVectorDrawWhileAnimation();
    fixVectorWorldJump();
    fixMarkerWorldJump();
    fixViewResetOnWorldJump();
    fixMarkerDragWorldJump();
}

// https://github.com/Leaflet/Leaflet/issues/3575
function fixPanAnimationBug() {
    if (!L.Browser.chrome) {
        return;
    }
    if (L.PosAnimation.prototype.__panAnimationFixed) {
        return;
    }

    const originalStep = L.PosAnimation.prototype._step;
    L.PosAnimation.prototype._step = function() {
        return originalStep.call(this, true);
    };
    L.PosAnimation.prototype.__panAnimationFixed = true;
}

function fixTouchDetection() {
    L.Browser.touch &= ((navigator.pointerEnabled && !L.Browser.ie)|| navigator.maxTouchPoints)
}

function fixMapKeypressEvent() {
    const originalHandleDOMEvent = L.Map.prototype._handleDOMEvent;
    L.Map.prototype._handleDOMEvent = function(e) {
        if (e.type === 'keypress' && e.keyCode === 13) {
            this._fireDOMEvent(e, e.type);
        } else {
            originalHandleDOMEvent.call(this, e);
        }
    }
}

function fixVectorDrawWhileAnimation() {
    if (L.Renderer.__animationFixed) {
        return;
    }

    const resetInterval = 300;

    const originalGetEvents = L.Renderer.prototype.getEvents;

    const onZoom = function() {
        const now = Date.now();
        if (!this._lastReset || (now - this._lastReset > resetInterval)) {
            this._reset();
            this._lastReset = now;
        } else {
            L.Renderer.prototype._onZoom.call(this);
        }

    };

    const onMove = function() {
        const now = Date.now();
        if (!this._lastReset || (now - this._lastReset > resetInterval)) {
            this._reset();
            this._lastReset = now;
        }
    };

    const getEvents = function() {
        const result = originalGetEvents.call(this);
        result.move = onMove;
        result.zoom = onZoom;
        return result;
    };

    L.Renderer.prototype.getEvents = getEvents;
    L.Renderer.__animationFixed = true;
}

function fixVectorWorldJump() {
    // Shift line points longitude by +360 or -360, to minimize distance between line center and map view center
    // Longitude is changed only for display, longitude of pints is not changed
    // Breaks dipslay of lines spanning more then one world copy
    L.Polyline.prototype._projectLatlngs = function(latlngs, result, projectedBounds) {
        var flat = latlngs[0] instanceof L.LatLng,
            len = latlngs.length,
            i, ring;
        const polylineBounds = this.getBounds();
        let shift = 0;
        if (polylineBounds.isValid()) {
            const worldWidth = this._map.getPixelWorldBounds().getSize().x;
            const polylineCenter = polylineBounds.getCenter();
            const mapCenter = this._map.getCenter();

            if (polylineCenter.lng < mapCenter.lng - 180) {
                shift = worldWidth
            } else if (polylineCenter.lng > mapCenter.lng + 180) {
                shift = -worldWidth;
            }
        }

        if (flat) {
            ring = [];
            for (i = 0; i < len; i++) {
                let p = this._map.latLngToLayerPoint(latlngs[i]);
                p.x += shift;
                ring[i] = p;
                projectedBounds.extend(p);
            }
            result.push(ring);
        } else {
            for (i = 0; i < len; i++) {
                this._projectLatlngs(latlngs[i], result, projectedBounds);
            }
        }
    }
}

function fixMarkerWorldJump() {
    // Shift marker longitude by +360 or -360, which is closer to map view center
    // Longitude is changed only for positioning html-element, Marker._latlng is not changed
    // Breaks display of markers with huge longitudes like 750 (can be displayed only at zoom levels 0 or 1)
    L.Marker.prototype.update = function() {
        if (this._icon) {
            const mapCenter = this._map.getCenter();
            const worldWidth = this._map.getPixelWorldBounds().getSize().x;
            var pos = this._map.latLngToLayerPoint(this._latlng).round();
            if (this._latlng.lng < mapCenter.lng - 180) {
                pos.x += worldWidth
            } else if (this._latlng.lng > mapCenter.lng + 180) {
                pos.x -= worldWidth;
            }
            this._setPos(pos);
        }

        return this;
    };
}

function fixViewResetOnWorldJump() {
    L.Map.addInitHook(function() {
        this._lastResetLongitude = null;
        this.on('viewreset', () => {
            this._lastResetLongitude = this.getCenter().lng;
        });

        this.on('move', (e) => {
            const lng = this.getCenter().lng;
            if (this._lastResetLongitude === null) {
                this._lastResetLongitude = lng;
            } else if (Math.abs(lng - this._lastResetLongitude) > 90) {
                this.fire('viewreset');
            }
        })
    });
}

function wrapLongitudeToTarget(latLng, targetLatLng) {
    const targetLng = targetLatLng.lng;
    const lng = latLng.lng;
    let newLng;
    if (Math.abs(lng + 360 - targetLng) < Math.abs(lng - targetLng)) {
        newLng = lng + 360;
    } else if (Math.abs(lng - 360 - targetLng) < Math.abs(lng - targetLng)) {
        newLng = lng - 360;
    } else {
        return latLng;
    }
    return L.latLng(latLng.lat, newLng);
}

function fixMarkerDragWorldJump() {
    L.Handler.MarkerDrag.prototype._onDrag = function(e) {
        var marker = this._marker,
            shadow = marker._shadow,
            iconPos = L.DomUtil.getPosition(marker._icon),
            latlng = marker._map.layerPointToLatLng(iconPos);
        // update shadow position
        if (shadow) {
            L.DomUtil.setPosition(shadow, iconPos);
        }

        latlng = wrapLongitudeToTarget(latlng, marker._latlng);
        marker._latlng = latlng;
        e.latlng = latlng;
        e.oldLatLng = this._oldLatLng;

        // @event drag: Event
        // Fired repeatedly while the user drags the marker.
        marker
            .fire('move', e)
            .fire('drag', e);
    }
}

export {fixAll, wrapLongitudeToTarget}
