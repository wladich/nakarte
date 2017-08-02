import L from 'leaflet';
import './elevation-profile.css';
import {fetch} from 'lib/xhr-promise';
import config from 'config';
import 'lib/leaflet.control.commons';
import {notify} from 'lib/notifications';
import logging from 'lib/logging';

function calcSamplingInterval(length) {
    var targetPointsN = 2000;
    var maxPointsN = 9999;
    var samplingIntgerval = length / targetPointsN;
    if (samplingIntgerval < 10) {
        samplingIntgerval = 10;
    }
    if (samplingIntgerval > 50) {
        samplingIntgerval = 50;
    }
    if (length / samplingIntgerval > maxPointsN) {
        samplingIntgerval = length / maxPointsN;
    }
    return samplingIntgerval;
}

function createSvg(tagName, attributes, parent) {
    var element = document.createElementNS('http://www.w3.org/2000/svg', tagName);
    if (attributes) {
        var keys = Object.keys(attributes),
            key, value;
        for (var i = 0; i < keys.length; i++) {
            key = keys[i];
            value = attributes[key];
            element.setAttribute(key, value);
        }
    }
    if (parent) {
        parent.appendChild(element);
    }
    return element;
}

function pointOnSegmentAtDistance(p1, p2, dist) {
    //FIXME: we should place markers along projected line to avoid transformation distortions
    var q = dist / p1.distanceTo(p2),
        x = p1.lng + (p2.lng - p1.lng) * q,
        y = p1.lat + (p2.lat - p1.lat) * q;
    return L.latLng(y, x);
}


function gradientToAngle(g) {
    return Math.round(Math.atan(g) * 180 / Math.PI);
}

function pathRegularSamples(latlngs, step) {
    if (!latlngs.length) {
        return [];
    }
    var samples = [],
        lastSampleDist = 0,
        lastPointDistance = 0,
        nextPointDistance = 0,
        segmentLength, i;

    samples.push(latlngs[0]);
    for (i = 1; i < latlngs.length; i++) {
        segmentLength = latlngs[i].distanceTo(latlngs[i - 1]);
        nextPointDistance = lastPointDistance + segmentLength;
        if (nextPointDistance >= lastSampleDist + step) {
            while (lastSampleDist + step <= nextPointDistance) {
                lastSampleDist += step;
                samples.push(
                    pointOnSegmentAtDistance(latlngs[i - 1], latlngs[i], lastSampleDist - lastPointDistance)
                );
            }
        }
        lastPointDistance = nextPointDistance;
    }
    if (samples.length < 2) {
        samples.push(latlngs[latlngs.length - 1]);
    }
    return samples;
}

function offestFromEvent(e) {
    if (e.offsetX === undefined) {
        var rect = e.target.getBoundingClientRect();
        return {
            offsetX: e.clientX - rect.left,
            offestY: e.clientY - rect.top
        }
    } else {
        return {
            offsetX: e.offsetX,
            offestY: e.offsetY
        }
    }
}

function movementFromEvents(e1, e2) {
    return {
        movementX: e2.clientX - e1.clientX,
        movementY: e2.clientY - e1.clientY
    }
}

var DragEvents = L.Class.extend({
        options: {
            dragTolerance: 2,
            dragButtons: [0]
        },

        includes: L.Mixin.Events,

        initialize: function(eventsSource, eventsTarget, options) {
            options = L.setOptions(this, options);
            if (eventsTarget) {
                this.eventsTarget = eventsTarget;
            } else {
                this.eventsTarget = this;
            }
            this.dragStartPos = [];
            this.prevEvent = [];
            this.isDragging = [];

            L.DomEvent.on(eventsSource, 'mousemove', this.onMouseMove, this);
            L.DomEvent.on(eventsSource, 'mouseup', this.onMouseUp, this);
            L.DomEvent.on(eventsSource, 'mousedown', this.onMouseDown, this);
            L.DomEvent.on(eventsSource, 'mouseleave', this.onMouseLeave, this);
        },

        onMouseDown: function(e) {
            if (this.options.dragButtons.includes(e.button)) {
                e._offset = offestFromEvent(e);
                this.dragStartPos[e.button] = e;
                this.prevEvent[e.button] = e;
                L.DomUtil.disableImageDrag();
                L.DomUtil.disableTextSelection();
            }
        },

        onMouseUp: function(e) {
            L.DomUtil.enableImageDrag();
            L.DomUtil.enableTextSelection();

            if (this.options.dragButtons.includes(e.button)) {
                this.dragStartPos[e.button] = null;
                if (this.isDragging[e.button]) {
                    this.isDragging[e.button] = false;
                    this.fire('dragend', L.extend({dragButton: e.button, origEvent: e},
                        offestFromEvent(e), movementFromEvents(this.prevEvent[e.button], e)
                        )
                    );
                } else {
                    this.fire('click', L.extend({dragButton: e.button, origEvent: e},
                        offestFromEvent(e)
                        )
                    );
                }
            }
        },

        onMouseMove: function(e) {
            var i, button, self = this;

            function exceedsTolerance(button) {
                var tolerance = self.options.dragTolerance;
                return Math.abs(e.clientX - self.dragStartPos[button].clientX) > tolerance ||
                    Math.abs(e.clientY - self.dragStartPos[button].clientY) > tolerance;
            }

            var dragButtons = this.options.dragButtons;
            for (i = 0; i < dragButtons.length; i++) {
                button = dragButtons[i];
                if (this.isDragging[button]) {
                    this.eventsTarget.fire('drag', L.extend({dragButton: button, origEvent: e},
                        offestFromEvent(e), movementFromEvents(this.prevEvent[button], e)
                        )
                    );
                } else if (this.dragStartPos[button] && exceedsTolerance(button)) {
                    this.isDragging[button] = true;
                    this.eventsTarget.fire('dragstart', L.extend(
                        {dragButton: button, origEvent: this.dragStartPos[button]},
                        this.dragStartPos[button]._offset
                        )
                    );
                    this.eventsTarget.fire('drag', L.extend({
                            dragButton: button,
                            origEvent: e,
                            startEvent: self.dragStartPos[button]
                        }, offestFromEvent(e), movementFromEvents(this.prevEvent[button], e)
                        )
                    );
                }
                this.prevEvent[button] = e;
            }
        },

        onMouseLeave: function(e) {
            var i, button;
            var dragButtons = this.options.dragButtons;
            for (i = 0; i < dragButtons.length; i++) {
                button = dragButtons[i];
                if (this.isDragging[button]) {
                    this.isDragging[button] = false;
                    this.fire('dragend', L.extend({dragButton: button, origEvent: e},
                        offestFromEvent(e), movementFromEvents(this.prevEvent[button], e)
                        )
                    );
                }
            }
            this.dragStartPos = {};
        }
    }
);

const ElevationProfile = L.Class.extend({
        options: {
            elevationsServer: config.elevationsServer,
            samplingInterval: 50,
            sightLine: false
        },

        includes: L.Mixin.Events,

        initialize: function(map, latlngs, options) {
            L.setOptions(this, options);
            this.path = latlngs;
            var samples = this.samples = pathRegularSamples(this.path, this.options.samplingInterval);
            if (!samples.length) {
                notify('Track is empty');
                return;
            }
            var self = this;
            this.horizZoom = 1;
            this.dragStart = null;
            this._getElevation(samples)
                .then(function(values) {
                        self.values = values;
                        self._addTo(map);
                    }
                )
                .catch((e) => {
                    logging.captureException(e, {extra: {description: 'while getting elevation'}});
                    notify(`Failed to get elevation data: ${e.message}`);
                    self._addTo(map);
                });
            this.values = null;

        },

        _addTo: function(map) {
            this._map = map;
            var container = this._container = L.DomUtil.create('div', 'elevation-profile-container');
            L.Control.prototype._stopContainerEvents.call(this);
            this._map._controlContainer.appendChild(container);
            this.setupContainerLayout();
            this.updateGraph();
            this.trackMarker = L.marker([1000, 0], {clickable: false, icon: L.divIcon()});
            this.polyline = L.polyline(this.path, {weight: 30, opacity: 0}).addTo(map);
            this.polyline.on('mousemove', this.onLineMouseMove, this);
            this.polyline.on('mouseover', this.onLineMouseEnter, this);
            this.polyline.on('mouseout', this.onLineMouseLeave, this);
            this.polyLineSelection = L.polyline([], {weight: 20, opacity: .5, color: 'yellow', lineCap: 'butt'});
            return this;
        },

        setupContainerLayout: function() {
            var horizZoom = this.horizZoom = 1;
            var container = this._container;
            this.propsContainer = L.DomUtil.create('div', 'elevation-profile-properties', container);
            this.leftAxisLables = L.DomUtil.create('div', 'elevation-profile-left-axis', container);
            this.closeButton = L.DomUtil.create('div', 'elevation-profile-close', container);
            L.DomEvent.on(this.closeButton, 'click', this.onCloseButtonClick, this);
            this.drawingContainer = L.DomUtil.create('div', 'elevation-profile-drawingContainer', container);
            this.graphCursor = L.DomUtil.create('div', 'elevation-profile-cursor elevation-profile-cursor-hidden',
                this.drawingContainer
            );
            this.graphCursorLabel =
                L.DomUtil.create('div', 'elevation-profile-cursor-label elevation-profile-cursor-hidden',
                    this.drawingContainer
                );
            this.graphSelection = L.DomUtil.create('div', 'elevation-profile-selection elevation-profile-cursor-hidden',
                this.drawingContainer
            );
            var svgWidth = this.svgWidth = this.drawingContainer.clientWidth * horizZoom,
                svgHeight = this.svgHeight = this.drawingContainer.clientHeight;
            var svg = this.svg = createSvg('svg', {width: svgWidth, height: svgHeight}, this.drawingContainer);
            L.DomEvent.on(svg, 'mousemove', this.onSvgMouseMove, this);
            L.DomEvent.on(svg, 'mouseenter', this.onSvgEnter, this);
            L.DomEvent.on(svg, 'mouseleave', this.onSvgLeave, this);
            L.DomEvent.on(svg, 'mousewheel', this.onSvgMouseWheel, this);
            this.svgDragEvents = new DragEvents(this.drawingContainer, null, {dragButtons: [0, 2]});
            this.svgDragEvents.on('dragstart', this.onSvgDragStart, this);
            this.svgDragEvents.on('dragend', this.onSvgDragEnd, this);
            this.svgDragEvents.on('drag', this.onSvgDrag, this);
            this.svgDragEvents.on('click', this.onSvgClick, this);
            L.DomEvent.on(svg, 'dblclick', this.onSvgDblClick, this);
        },

        removeFrom: function(map) {
            if (this.abortLoading) {
                this.abortLoading();
            }
            if (!this._map) {
                return;
            }
            this._map._controlContainer.removeChild(this._container);
            map.removeLayer(this.polyline);
            map.removeLayer(this.trackMarker);
            map.removeLayer(this.polyLineSelection);
            this._map = null;
            this.fire('remove');
            return this;
        },

        onSvgDragStart: function(e) {
            if (e.dragButton === 0) {
                // FIXME: restore hiding when we make display of selection on map
                // this.cursorHide();
                this.polyLineSelection.addTo(this._map).bringToBack();
                this.dragStart = e.offsetX;
            }
        },

        xToIndex: function(x) {
            return x / (this.svgWidth - 1) * (this.values.length - 1);
        },

        updateGraphSelection: function(e) {
            if (this.dragStart === null) {
                return;
            }
            var selStart, selEnd;
            if (e) {
                var x = e.offsetX;
                selStart = Math.min(x, this.dragStart);
                selEnd = Math.max(x, this.dragStart);
                this.selStartInd = Math.round(this.xToIndex(selStart));
                this.selEndInd = Math.round(this.xToIndex(selEnd));

                if (this.selStartInd < 0) {
                    this.selStartInd = 0;
                }
                if (this.selEndInd > this.values.length - 1) {
                    this.selEndInd = this.values.length - 1;
                }

            } else {
                selStart = this.selStartInd * (this.svgWidth - 1) / (this.values.length - 1);
                selEnd = this.selEndInd * (this.svgWidth - 1) / (this.values.length - 1);
            }
            this.graphSelection.style.left = selStart + 'px';
            this.graphSelection.style.width = (selEnd - selStart) + 'px';
            L.DomUtil.removeClass(this.graphSelection, 'elevation-profile-cursor-hidden');
        },

        onSvgDragEnd: function(e) {
            if (e.dragButton === 0) {
                this.cursorShow();
                this.updateGraphSelection(e);
                var stats = this.calcProfileStats(this.values.slice(this.selStartInd, this.selEndInd + 1), true);
                this.updatePropsDisplay(stats);
                L.DomUtil.addClass(this.propsContainer, 'elevation-profile-properties-selected');
            }
            if (e.dragButton === 2) {
                this.drawingContainer.scrollLeft -= e.movementX;
            }
        },

        onSvgDrag: function(e) {
            if (e.dragButton === 0) {
                this.updateGraphSelection(e);
                this.polyLineSelection.setLatLngs(this.samples.slice(this.selStartInd, this.selEndInd + 1));
            }
            if (e.dragButton === 2) {
                this.drawingContainer.scrollLeft -= e.movementX;
            }
        },

        onSvgClick: function(e) {
            if (e.dragButton === 0) {
                this.dragStart = null;
                L.DomUtil.addClass(this.graphSelection, 'elevation-profile-cursor-hidden');
                L.DomUtil.removeClass(this.propsContainer, 'elevation-profile-properties-selected');
                this._map.removeLayer(this.polyLineSelection);
                if (this.stats) {
                    this.updatePropsDisplay(this.stats);
                }
            }
            if (e.dragButton === 2) {
                this.setMapPositionAtIndex(Math.round(this.xToIndex(e.offsetX)));
            }
        },

        onSvgDblClick: function(e) {
            this.setMapPositionAtIndex(Math.round(this.xToIndex(e.offsetX)));
        },

        setMapPositionAtIndex: function(ind) {
            var latlng = this.samples[ind];
            if (latlng) {
                this._map.panTo(latlng);
            }
        },

        onSvgMouseWheel: function(e) {
            var oldHorizZoom = this.horizZoom;
            this.horizZoom += L.DomEvent.getWheelDelta(e) > 0 ? 1 : -1;
            if (this.horizZoom < 1) {
                this.horizZoom = 1;
            }
            if (this.horizZoom > 10) {
                this.horizZoom = 10;
            }

            var x = offestFromEvent(e).offsetX;
            var ind = this.xToIndex(x);

            var newScrollLeft = this.drawingContainer.scrollLeft +
                offestFromEvent(e).offsetX * (this.horizZoom / oldHorizZoom - 1);
            if (newScrollLeft < 0) {
                newScrollLeft = 0;
            }

            this.svgWidth = this.drawingContainer.clientWidth * this.horizZoom;
            this.svg.setAttribute('width', this.svgWidth + 'px');
            this.setupGraph();
            if (newScrollLeft > this.svgWidth - this.drawingContainer.clientWidth) {
                newScrollLeft = this.svgWidth - this.drawingContainer.clientWidth;
            }
            this.drawingContainer.scrollLeft = newScrollLeft;

            this.cursorHide();
            this.setCursorPosition(ind);
            this.cursorShow();
            this.updateGraphSelection();
        },


        updateGraph: function() {
            if (!this._map || !this.values) {
                return;
            }

            this.stats = this.calcProfileStats(this.values);
            this.updatePropsDisplay(this.stats);
            this.setupGraph();
        },

        updatePropsDisplay: function(stats) {
            if (!this._map) {
                return;
            }
            this.propsContainer.innerHTML = '';
            var ascentAngleStr = isNaN(stats.angleAvgAscent) ? '-' : L.Util.template('{avg} / {max}&deg;',
                {avg: stats.angleAvgAscent, max: stats.angleMaxAscent}
            );
            var descentAngleStr = isNaN(stats.angleAvgDescent) ? '-' : L.Util.template('{avg} / {max}&deg;',
                {avg: stats.angleAvgDescent, max: stats.angleMaxDescent}
            );

            this.propsContainer.innerHTML =
                '<table>' +
                '<tr><td>Max elevation:</td><td>' + Math.round(stats.max) + '</td></tr>' +
                '<tr><td>Min elevation:</td><td>' + Math.round(stats.min) + '</td></tr>' +
                '<tr class="start-group"><td>Start elevation:</td><td>' + Math.round(stats.start) + '</td></tr>' +
                '<tr><td>Finish elevation:</td><td>' + Math.round(stats.end) + '</td></tr>' +
                '<tr><td>Start to finish elevation change:</td><td>' + Math.round(stats.finalAscent) + '</td></tr>' +
                '<tr class="start-group"><td>Avg / Max ascent inclination:</td><td>' + ascentAngleStr + '</td></tr>' +
                '<tr><td>Avg / Max descent inclination:</td><td>' + descentAngleStr + '</td></tr>' +
                '<tr class="start-group"><td>Total ascent:</td><td>' + Math.round(stats.ascent) + '</td></tr>' +
                '<tr><td>Total descent:</td><td>' + Math.round(stats.descent) + '</td></tr>' +
                '<tr class="start-group"><td>Distance:</td><td>' + (stats.distance / 1000).toFixed(1) + ' km</td></tr>' +
                '</table>'
        },

        calcGridValues: function(minValue, maxValue) {
            var ticksNs = [3, 4, 5],
                tickSteps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000],
                ticks = [],
                i, j, k, ticksN, tickStep, tick1, tick2,
                matchFound=false;

            for (i = 0; i < tickSteps.length; i++) {
                tickStep = tickSteps[i];
                for (j = 0; j < ticksNs.length; j++) {
                    ticksN = ticksNs[j];
                    tick1 = Math.floor(minValue / tickStep);
                    tick2 = Math.ceil(maxValue / tickStep);
                    if ((tick2 - tick1) < ticksN) {
                        matchFound = true;
                        break
                    }
                }
                if (matchFound) {
                    break;
                }
            }
            for (k = tick1; k < tick1 + ticksN; k++) {
                ticks.push(k * tickStep);
            }
            return ticks;

        },

        filterElevations: function(values, tolerance) {
            var filtered = values.slice(0);
            if (filtered.length < 3) {
                return filtered;
            }
            var scanStart, scanEnd, job, linearValue, linearDelta, maxError, maxErrorInd, i, error;
            var queue = [[0, filtered.length - 1]];
            while (queue.length) {
                job = queue.pop();
                scanStart = job[0];
                scanEnd = job[1];
                linearValue = filtered[scanStart];
                linearDelta = (filtered[scanEnd] - filtered[scanStart]) / (scanEnd - scanStart);
                maxError = null;
                maxErrorInd = null;
                for (i = scanStart + 1; i < scanEnd; i++) {
                    linearValue += linearDelta;
                    error = Math.abs(filtered[i] - linearValue);
                    if (error === null || error > maxError) {
                        maxError = error;
                        maxErrorInd = i;
                    }
                }
                if (maxError > tolerance) {
                    if (scanEnd > scanStart + 2) {
                        queue.push([scanStart, maxErrorInd]);
                        queue.push([maxErrorInd, scanEnd]);
                    }
                } else {
                    filtered.splice(scanStart + 1, scanEnd - scanStart - 1);
                }
            }
            return filtered;
        },

        calcProfileStats: function(values, partial) {
            var stats = {},
                gradient, i;
            stats.min = Math.min.apply(null, values);
            stats.max = Math.max.apply(null, values);
            stats.finalAscent = values[values.length - 1] - values[0];
            var ascents = [],
                descents = [];
            for (i = 1; i < values.length; i++) {
                gradient = (values[i] - values[i - 1]);
                if (gradient > 0) {
                    ascents.push(gradient);
                } else if (gradient < 0) {
                    descents.push(-gradient);
                }
            }
            function sum(a, b) {
                return a + b;
            }

            stats.gradientAvgAscent = ascents.reduce(sum, 0) / ascents.length / this.options.samplingInterval;
            stats.gradientMinAscent = Math.min.apply(null, ascents) / this.options.samplingInterval;
            stats.gradientMaxAscent = Math.max.apply(null, ascents) / this.options.samplingInterval;
            stats.gradientAvgDescent = descents.reduce(sum, 0) / descents.length / this.options.samplingInterval;
            stats.gradientMinDescent = Math.min.apply(null, descents) / this.options.samplingInterval;
            stats.gradientMaxDescent = Math.max.apply(null, descents) / this.options.samplingInterval;

            stats.angleAvgAscent = gradientToAngle(stats.gradientAvgAscent);
            stats.angleMinAscent = gradientToAngle(stats.gradientMinAscent);
            stats.angleMaxAscent = gradientToAngle(stats.gradientMaxAscent);
            stats.angleAvgDescent = gradientToAngle(stats.gradientAvgDescent);
            stats.angleMinDescent = gradientToAngle(stats.gradientMinDescent);
            stats.angleMaxDescent = gradientToAngle(stats.gradientMaxDescent);

            stats.start = values[0];
            stats.end = values[values.length - 1];
            stats.distance = (values.length - 1) * this.options.samplingInterval;

            var filterTolerance = 5;
            var filtered = this.filterElevations(values, filterTolerance);
            var ascent = 0,
                descent = 0,
                delta;
            for (i = 1; i < filtered.length; i++) {
                delta = filtered[i] - filtered[i - 1];
                if (delta < 0) {
                    descent += -delta;
                } else {
                    ascent += delta;
                }
            }
            stats.ascent = ascent;
            stats.descent = descent;

            return stats;

        },

        setCursorPosition: function(ind) {
            if (!this._map || !this.values) {
                return;
            }
            var distance = this.options.samplingInterval * ind;
            distance = (distance / 1000).toFixed(2);
            var gradient = (this.values[Math.ceil(ind)] - this.values[Math.floor(ind)]) / this.options.samplingInterval;
            var angle = Math.round(Math.atan(gradient) * 180 / Math.PI);
            gradient = Math.round(gradient * 100);

            var x = Math.round(ind / (this.values.length - 1) * (this.svgWidth - 1));
            var indInt = Math.round(ind);
            var elevation = this.values[indInt];
            this.graphCursorLabel.innerHTML = L.Util.template('{ele} m<br>{dist} km<br>{angle}&deg;',
                {ele: Math.round(elevation), dist: distance, grad: gradient, angle: angle}
            );

            this.graphCursor.style.left = x + 'px';
            this.graphCursorLabel.style.left = x + 'px';
            if (this.drawingContainer.getBoundingClientRect().left - this.drawingContainer.scrollLeft + x +
                this.graphCursorLabel.offsetWidth >= this._container.getBoundingClientRect().right) {
                L.DomUtil.addClass(this.graphCursorLabel, 'elevation-profile-cursor-label-left');
            } else {
                L.DomUtil.removeClass(this.graphCursorLabel, 'elevation-profile-cursor-label-left');
            }

            var markerPos;
            if (ind <= 0) {
                markerPos = this.samples[0];
            } else if (ind >= this.samples.length - 1) {
                markerPos = this.samples[this.samples.length - 1];
            } else {
                var p1 = this.samples[Math.floor(ind)],
                    p2 = this.samples[Math.ceil(ind)],
                    indFrac = ind - Math.floor(ind);
                markerPos = [p1.lat + (p2.lat - p1.lat) * indFrac, p1.lng + (p2.lng - p1.lng) * indFrac];
            }
            this.trackMarker.setLatLng(markerPos);
            var label = L.Util.template('{ele} m<br>{dist} km<br>{angle}&deg;',
                {ele: Math.round(elevation), dist: distance, grad: gradient, angle: angle}
            );
            var icon = L.divIcon({
                    className: 'elevation-profile-marker',
                    html: '<div class="elevation-profile-marker-icon"></div><div class="elevation-profile-marker-label">' +
                    label + '</div>'
                }
            );
            this.trackMarker.setIcon(icon);
        },

        onSvgMouseMove: function(e) {
            if (!this.values) {
                return;
            }
            var x = offestFromEvent(e).offsetX;
            var ind = (x / (this.svgWidth - 1) * (this.values.length - 1));
            this.setCursorPosition(ind);
        },

        cursorShow: function() {
            L.DomUtil.removeClass(this.graphCursor, 'elevation-profile-cursor-hidden');
            L.DomUtil.removeClass(this.graphCursorLabel, 'elevation-profile-cursor-hidden');
            this._map.addLayer(this.trackMarker);
        },

        cursorHide: function() {
            L.DomUtil.addClass(this.graphCursor, 'elevation-profile-cursor-hidden');
            L.DomUtil.addClass(this.graphCursorLabel, 'elevation-profile-cursor-hidden');
            this._map.removeLayer(this.trackMarker);
        },

        onSvgEnter: function() {
            this.cursorShow();
        },

        onSvgLeave: function() {
            this.cursorHide();
        },

        onLineMouseEnter: function() {
            this.cursorShow();
        },

        onLineMouseLeave: function() {
            this.cursorHide();
        },

        onLineMouseMove: function(e) {
            function sqrDist(latlng1, latlng2) {
                var dx = (latlng1.lng - latlng2.lng);
                var dy = (latlng1.lat - latlng2.lat);
                return dx * dx + dy * dy;
            }

            var nearestInd = null, ind,
                minDist = null,
                mouseLatlng = e.latlng,
                i, sampleLatlng, dist, di;
            for (i = 0; i < this.samples.length; i++) {
                sampleLatlng = this.samples[i];
                dist = sqrDist(sampleLatlng, mouseLatlng);
                if (nearestInd === null || dist < minDist) {
                    nearestInd = i;
                    minDist = dist;
                }
            }

            if (nearestInd !== null) {
                ind = nearestInd;
                if (nearestInd > 0) {
                    var prevDist = sqrDist(mouseLatlng, this.samples[nearestInd - 1]),
                        prevSampleDist = sqrDist(this.samples[nearestInd], this.samples[nearestInd - 1]);
                }
                if (nearestInd < this.samples.length - 1) {
                    var nextDist = sqrDist(mouseLatlng, this.samples[nearestInd + 1]),
                        nextSampleDist = sqrDist(this.samples[nearestInd], this.samples[nearestInd + 1]);
                }

                if (nearestInd === 0) {
                    if (nextDist < minDist + nextSampleDist) {
                        di = (minDist - nextDist) / 2 / nextSampleDist + 1 / 2;
                    } else {
                        di = .001;
                    }
                } else if (nearestInd === this.samples.length - 1) {
                    if (prevDist < minDist + prevSampleDist) {
                        di = -((minDist - prevDist) / 2 / prevSampleDist + 1 / 2);
                    } else {
                        di = -0.001
                    }
                } else {
                    if (prevDist < nextDist) {
                        di = -((minDist - prevDist) / 2 / prevSampleDist + 1 / 2);
                    } else {
                        di = (minDist - nextDist) / 2 / nextSampleDist + 1 / 2;
                    }
                }
                if (di < -1) {
                    di = -1;
                }
                if (di > 1) {
                    di = 1;
                }
                this.setCursorPosition(ind + di);
            }

        },


        setupGraph: function() {
            if (!this._map || !this.values) {
                return;
            }


            while (this.svg.hasChildNodes()) {
                this.svg.removeChild(this.svg.lastChild);
            }
            while (this.leftAxisLables.hasChildNodes()) {
                this.leftAxisLables.removeChild(this.leftAxisLables.lastChild);
            }

            var maxValue = Math.max.apply(null, this.values),
                minValue = Math.min.apply(null, this.values),
                svg = this.svg,
                path, i, horizStep, verticalMultiplier, x, y, gridValues, label;


            var paddingBottom = 8 + 16,
                paddingTop = 8;

            gridValues = this.calcGridValues(minValue, maxValue);
            var gridStep = (this.svgHeight - paddingBottom - paddingTop) / (gridValues.length - 1);
            for (i = 0; i < gridValues.length; i++) {
                y = Math.round(i * gridStep - 0.5) + 0.5 + paddingTop;
                path = L.Util.template('M{x1} {y} L{x2} {y}', {x1: 0, x2: this.svgWidth * this.horizZoom, y: y});
                createSvg('path', {d: path, 'stroke-width': '1px', stroke: 'green', fill: 'none', 'stroke-opacity': '0.5'}, svg);

                label = L.DomUtil.create('div', 'elevation-profile-grid-label', this.leftAxisLables);
                label.innerHTML = gridValues[gridValues.length - i - 1];
                label.style.top = (gridStep * i + paddingTop) + 'px';
            }

            horizStep = this.svgWidth / (this.values.length - 1);
            verticalMultiplier =
                (this.svgHeight - paddingTop - paddingBottom) / (gridValues[gridValues.length - 1] - gridValues[0]);

            path = [];
            const valueToSvgCoord = (el) => {
                const y = (el - gridValues[0]) * verticalMultiplier;
                return this.svgHeight - y - paddingBottom;
            };

            for (i = 0; i < this.values.length; i++) {
                path.push(i ? 'L' : 'M');
                x = i * horizStep;
                y = valueToSvgCoord(this.values[i]);
                path.push(x + ' ' + y + ' ');
            }
            path = path.join('');
            createSvg('path', {d: path, 'stroke-width': '1px', stroke: 'brown', fill: 'none'}, svg);
            // sightline
            if (this.options.sightLine) {
                path = L.Util.template('M{x1} {y1} L{x2} {y2}', {
                        x1: 0, x2: this.svgWidth * this.horizZoom,
                        y1: valueToSvgCoord(this.values[0]),
                        y2: valueToSvgCoord(this.values[this.values.length - 1])
                    }
                );
                createSvg('path',
                    {d: path, 'stroke-width': '3px', stroke: '#94b1ff', fill: 'none', 'stroke-opacity': '0.5'}, svg
                );
            }
        },

        _getElevation: function(latlngs) {
            function parseResponse(s) {
                var values = [], v;
                s = s.split('\n');
                for (var i = 0; i < s.length; i++) {
                    if (s[i]) {
                        if (s[i] === 'NULL') {
                            v = 0;
                        } else {
                            v = parseFloat(s[i]);
                        }
                        values.push(v);
                    }
                }
                return values;
            }

            var req = [];
            for (var i = 0; i < latlngs.length; i++) {
                req.push(latlngs[i].lat.toFixed(6) + ' ' + latlngs[i].lng.toFixed(5));
            }
            req = req.join('\n');
            const xhrPromise = fetch(this.options.elevationsServer, {method: 'POST', data: req});
            this.abortLoading = xhrPromise.abort.bind(xhrPromise);
            return xhrPromise.then(
                    function(xhr) {
                        return parseResponse(xhr.responseText);
                    }
                );
        },
        onCloseButtonClick: function() {
            this.removeFrom(this._map);
        }
    }
);

export {ElevationProfile, calcSamplingInterval};