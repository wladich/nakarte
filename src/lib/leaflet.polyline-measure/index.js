import L from 'leaflet';
import './measured_line.css';

function pointOnSegmentAtDistance(p1, p2, dist) {
    // FIXME: we should place markers along projected line to avoid transformation distortions
    var q = dist / p1.distanceTo(p2),
        x = p1.lng + (p2.lng - p1.lng) * q,
        y = p1.lat + (p2.lat - p1.lat) * q;
    return L.latLng(y, x);
}

function sinCosFromLatLonSegment(segment) {
    const
        p1 = L.CRS.EPSG3857.project(segment[0]),
        p2 = L.CRS.EPSG3857.project(segment[1]),
        dx = p2.x - p1.x,
        dy = p1.y - p2.y,
        len = Math.sqrt(dx * dx + dy * dy),
        sin = dy / len,
        cos = dx / len;
    return [sin, cos];
}

L.MeasuredLine = L.Polyline.extend({
        options: {
            minTicksIntervalMm: 15,
        },

        onAdd: function(map) {
            L.Polyline.prototype.onAdd.call(this, map);
            this._ticks = {};
            this.updateTicks();
            this._map.on('zoomend', this.updateTicks, this);
            // markers are created only for visible part of map, need to update when it changes
            this._map.on('moveend', this.updateTicks, this);
            this.on('nodeschanged', this.updateTicksLater, this);
        },

        updateTicksLater: function() {
            setTimeout(this.updateTicks.bind(this), 0);
        },

        onRemove: function(map) {
            this._map.off('zoomend', this.updateTicks, this);
            this._map.off('moveend', this.updateTicks, this);
            this.off('nodeschanged', this.updateTicks, this);
            this._clearTicks();
            L.Polyline.prototype.onRemove.call(this, map);
        },

        _clearTicks: function() {
            if (this._map) {
                Object.values(this._ticks).forEach((tick) => this._map.removeLayer(tick));
                this._ticks = {};
            }
        },

        _addTick: function(tick, marker) {
            var transformMatrixString = 'matrix(' + tick.transformMatrix.join(',') + ')';
            if (marker) {
                marker._icon.childNodes[0].style.transform = transformMatrixString;
                marker.setLatLng(tick.position);
            } else {
                var labelText = Math.round((tick.distanceValue / 10)) / 100 + ' km',
                    icon = L.divIcon(
                        {
                            html: '<div class="measure-tick-icon-text" style="transform:' +
                                transformMatrixString + '">' +
                            labelText + '</div>',
                            className: 'measure-tick-icon'
                        }
                    );
                marker = L.marker(tick.position, {
                    icon: icon,
                    interactive: false,
                    keyboard: false,
                    projectedShift: () => this.shiftProjectedFitMapView(),
                });
                marker.addTo(this._map);
            }
            this._ticks[tick.distanceValue.toString()] = marker;
        },

        setMeasureTicksVisible: function(visible) {
            this.options.measureTicksShown = visible;
            this.updateTicks();
        },

        getTicksPositions: function(minTicksIntervalMeters, bounds) {
            var steps = [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000];
            var ticks = [];

            const that = this;
            function addTick(position, segment, distanceValue) {
                if (bounds) {
                    // create markers only in visible part of map
                    const normalizedBounds = that._map.wrapLatLngBounds(bounds);
                    const normalizedPosition = position.wrap();
                    // account for worldCopyJump
                    const positionMinus360 = L.latLng(normalizedPosition.lat, normalizedPosition.lng - 360);
                    const positionPlus360 = L.latLng(normalizedPosition.lat, normalizedPosition.lng + 360);
                    if (
                        !normalizedBounds.contains(normalizedPosition) &&
                        !normalizedBounds.contains(positionMinus360) &&
                        !normalizedBounds.contains(positionPlus360)
                    ) {
                        return;
                    }
                }

                var sinCos = sinCosFromLatLonSegment(segment),
                    sin = sinCos[0],
                    cos = sinCos[1],
                    transformMatrix;

                if (sin > 0) {
                    transformMatrix = [sin, -cos, cos, sin, 0, 0];
                } else {
                    transformMatrix = [-sin, cos, -cos, -sin, 0, 0];
                }
                ticks.push({position: position, distanceValue: distanceValue, transformMatrix: transformMatrix});
            }

            let step;
            for (step of steps) {
                if (step >= minTicksIntervalMeters) {
                    break;
                }
            }

            var lastTickMeasure = 0,
                lastPointMeasure = 0,
                points = this._latlngs,
                points_n = points.length,
                nextPointMeasure,
                segmentLength;
            if (points_n < 2) {
                return ticks;
            }

            for (var i = 1; i < points_n; i++) {
                segmentLength = points[i].distanceTo(points[i - 1]);
                nextPointMeasure = lastPointMeasure + segmentLength;
                if (nextPointMeasure >= lastTickMeasure + step) {
                    while (lastTickMeasure + step <= nextPointMeasure) {
                        lastTickMeasure += step;
                        addTick(
                            pointOnSegmentAtDistance(points[i - 1], points[i], lastTickMeasure - lastPointMeasure),
                            [points[i - 1], points[i]],
                            lastTickMeasure
                        );
                    }
                }
                lastPointMeasure = nextPointMeasure;
            }
            // remove last mark if it is close to track end
            if (lastPointMeasure - lastTickMeasure < minTicksIntervalMeters / 2) {
                ticks.pop();
            }
            // special case: if track is versy short, do not add starting mark
            if (lastPointMeasure > minTicksIntervalMeters / 2) {
                addTick(points[0], [points[0], points[1]], 0);
            }
            addTick(points[points_n - 1], [points[points_n - 2], points[points_n - 1]], lastPointMeasure);
            return ticks;
        },

        updateTicks: function() {
            if (!this._map) {
                return;
            }
            if (!this.options.measureTicksShown) {
                this._clearTicks();
                return;
            }
            var bounds = this._map.getBounds().pad(1),
                rad = Math.PI / 180,
                dpi = 96,
                mercatorMetersPerPixel = 20003931 / (this._map.project([180, 0]).x),
                referencePoint = this.getLatLngs().length ? this.getBounds().getCenter() : this._map.getCenter(),
                realMetersPerPixel = mercatorMetersPerPixel * Math.cos(referencePoint.lat * rad),
                mapScale = 1 / dpi * 2.54 / 100 / realMetersPerPixel,
                minTicksIntervalMeters = this.options.minTicksIntervalMm / mapScale / 1000,
                ticks = this.getTicksPositions(minTicksIntervalMeters, bounds),
                oldTicks = this._ticks;
            this._ticks = {};
            ticks.forEach(function(tick) {
                    var oldMarker = oldTicks[tick.distanceValue.toString()];
                    this._addTick(tick, oldMarker);
                    if (oldMarker) {
                        delete oldTicks[tick.distanceValue.toString()];
                    }
                }.bind(this)
            );
            Object.values(oldTicks).forEach((tick) => this._map.removeLayer(tick));
        },

        getLength: function() {
            var points = this._latlngs,
                points_n = points.length,
                length = 0;

            for (var i = 1; i < points_n; i++) {
                length += points[i].distanceTo(points[i - 1]);
            }
            return length;
        }
    }
);

L.measuredLine = function(latlngs, options) {
    return new L.MeasuredLine(latlngs, options);
};
