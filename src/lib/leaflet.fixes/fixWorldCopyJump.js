import L from 'leaflet';

function shiftLongitudeToTarget(lng, targetLng) {
    if (targetLng instanceof L.LatLngBounds) {
        if (!targetLng.isValid()) {
            return 0;
        }
        targetLng = targetLng.getCenter().lng;
    } else {
        targetLng = targetLng.lng ?? targetLng;
    }
    let shift = 0;
    if (Math.abs(lng + 360 - targetLng) < Math.abs(lng - targetLng)) {
        shift = 360;
    } else if (Math.abs(lng - 360 - targetLng) < Math.abs(lng - targetLng)) {
        shift = -360;
    }
    return shift;
}

function wrapLatLngToTarget(latLng, targetLng) {
    const shift = shiftLongitudeToTarget(latLng.lng, targetLng);
    return L.latLng(latLng.lat, latLng.lng + shift);
}

function wrapLatLngBoundsToTarget(latLngBounds, targetLng) {
    const shift = shiftLongitudeToTarget(latLngBounds.getCenter().lng, targetLng);
    const p1 = latLngBounds.getSouthEast();
    const p2 = latLngBounds.getNorthWest();
    return L.latLngBounds([[p1.lat, p1.lng + shift], [p2.lat, p2.lng + shift]]);
}

function fixVectorMarkerWorldJump() {
    L.Polyline.prototype.shiftProjectedFitMapView = function() {
        const polylineBounds = this.getBounds();
        let shift = null;
        if (this._map && polylineBounds.isValid()) {
            const worldWidth = this._map.getPixelWorldBounds().getSize().x;
            const polylineCenter = polylineBounds.getCenter();
            const mapCenter = this._map.getCenter();

            if (polylineCenter.lng < mapCenter.lng - 180) {
                shift = worldWidth;
            } else if (polylineCenter.lng > mapCenter.lng + 180) {
                shift = -worldWidth;
            } else {
                shift = 0;
            }
        }
        return shift;
    };

    // Shift line points longitude by +360 or -360, to minimize distance between line center and map view center
    // Longitude is changed only for display, longitude of pints is not changed
    // Breaks dipslay of lines spanning more then one world copy
    L.Polyline.prototype._projectLatlngs = function(latlngs, result, projectedBounds) {
        var flat = latlngs[0] instanceof L.LatLng,
            len = latlngs.length,
            i, ring;
        let shift = null;
        if (this.options.projectedShift) {
            shift = this.options.projectedShift();
        }
        if (shift === null) {
            shift = this.shiftProjectedFitMapView();
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
    };

    // Shift marker longitude by +360 or -360, which is closer to map view center
    // Longitude is changed only for positioning html-element, Marker._latlng is not changed
    // Breaks display of markers with huge longitudes like 750 (can be displayed only at zoom levels 0 or 1)
    L.Marker.prototype.update = function() {
        if (this._icon) {
            var pos = this._map.latLngToLayerPoint(this._latlng).round();
            let shift = null;
            if (this.options.projectedShift) {
                shift = this.options.projectedShift();
            }
            if (shift === null) {
                const mapCenter = this._map.getCenter();
                const worldWidth = this._map.getPixelWorldBounds().getSize().x;
                if (this._latlng.lng < mapCenter.lng - 180) {
                    shift = worldWidth;
                } else if (this._latlng.lng > mapCenter.lng + 180) {
                    shift = -worldWidth;
                } else {
                    shift = 0;
                }
            }
            pos.x += shift;
            this._setPos(pos);
        }

        return this;
    };

    // Emit viewreset event when longitude of map view center changes more then 90 degrees from prevoius reset
    L.Map.addInitHook(function() {
        this._lastResetLongitude = null;
        this.on('viewreset', () => {
            this._lastResetLongitude = this.getCenter().lng;
        });

        this.on('move', () => {
            const lng = this.getCenter().lng;
            if (this._lastResetLongitude === null) {
                this._lastResetLongitude = lng;
            } else if (Math.abs(lng - this._lastResetLongitude) > 90) {
                this.fire('viewreset');
            }
        });
    });

    // Avoid marker longitude change from 180 to -180 while dragging.
    L.Handler.MarkerDrag.prototype._onDrag = function(e) {
        var marker = this._marker,
            shadow = marker._shadow,
            iconPos = L.DomUtil.getPosition(marker._icon),
            latlng = marker._map.layerPointToLatLng(iconPos);
        // update shadow position
        if (shadow) {
            L.DomUtil.setPosition(shadow, iconPos);
        }

        latlng = wrapLatLngToTarget(latlng, marker._latlng);
        marker._latlng = latlng;
        e.latlng = latlng;
        e.oldLatLng = this._oldLatLng;

        // @event drag: Event
        // Fired repeatedly while the user drags the marker.
        marker
            .fire('move', e)
            .fire('drag', e);
    };
}

export {wrapLatLngToTarget, fixVectorMarkerWorldJump, wrapLatLngBoundsToTarget};
