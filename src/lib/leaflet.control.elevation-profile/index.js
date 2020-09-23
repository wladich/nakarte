import L from 'leaflet';
import './elevation-profile.css';
import {ElevationProvider} from '~/lib/elevations';
import '~/lib/leaflet.control.commons';
import {notify} from '~/lib/notifications';
import * as logging from '~/lib/logging';
import {DragEvents} from '~/lib/leaflet.events.drag';

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
    // FIXME: we should place markers along projected line to avoid transformation distortions
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

const ElevationProfile = L.Class.extend({
        options: {
            samplingInterval: 50,
            sightLine: false
        },

        includes: L.Mixin.Events,

        initialize: function(map, latlngs, options) {
            L.setOptions(this, options);
            this.path = latlngs;
            var samples = this.samples = pathRegularSamples(this.path, this.options.samplingInterval);
            samples = samples.map((latlng) => latlng.wrap());
            if (!samples.length) {
                notify('Track is empty');
                return;
            }
            var that = this;
            this.horizZoom = 1;
            this.dragStart = null;
            new ElevationProvider().get(samples)
                .then(function(values) {
                        that.values = values;
                        that._addTo(map);
                    }
                )
                .catch((e) => {
                    logging.captureException(e, 'error getting elevation');
                    notify(`Failed to get elevation data: ${e.message}`);
                });
            this.values = null;
        },

        _onWindowResize: function() {
            this._resizeGraph();
        },

        _resizeGraph: function() {
            const newSvgWidth = this.drawingContainer.clientWidth * this.horizZoom;
            if (this.svgWidth < this.drawingContainer.clientWidth) {
                this.svgWidth = newSvgWidth;
                this.svg.setAttribute('width', this.svgWidth + 'px');
                this.updateGraph();
                this.updateGraphSelection();
            }
        },

        _addTo: function(map) {
            this._map = map;
            var container = this._container = L.DomUtil.create('div', 'elevation-profile-container');
            L.Control.prototype._stopContainerEvents.call(this);
            this._map._controlContainer.appendChild(container);
            this.setupContainerLayout();
            this.updateGraph();
            const icon = L.divIcon({
                    className: 'elevation-profile-marker',
                    html:
                        '<div class="elevation-profile-marker-icon"></div>' +
                        '<div class="elevation-profile-marker-label"></div>'
                }
            );
            this.trackMarker = L.marker([1000, 0], {interactive: false, icon: icon});
            this.polyline = L.polyline(this.path, {weight: 30, opacity: 0}).addTo(map);
            this.polyline.on('mousemove', this.onLineMouseMove, this);
            this.polyline.on('mouseover', this.onLineMouseEnter, this);
            this.polyline.on('mouseout', this.onLineMouseLeave, this);
            this.polyLineSelection = L.polyline([], {weight: 20, opacity: 0.5, color: 'yellow', lineCap: 'butt'});
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
            // We should handle mouseenter event, but due to a
            // bug in Chrome (https://bugs.chromium.org/p/chromium/issues/detail?id=846738)
            // this event is emitted while resizing window by dragging right window frame
            // which causes cursor to appeat while resizing
            L.DomEvent.on(svg, 'mousemove', this.onSvgEnter, this);
            L.DomEvent.on(svg, 'mouseleave', this.onSvgLeave, this);
            L.DomEvent.on(svg, 'mousewheel', this.onSvgMouseWheel, this);
            this.svgDragEvents = new DragEvents(this.svg, {dragButtons: [0, 2], stopOnLeave: true});
            this.svgDragEvents.on('dragstart', this.onSvgDragStart, this);
            this.svgDragEvents.on('dragend', this.onSvgDragEnd, this);
            this.svgDragEvents.on('drag', this.onSvgDrag, this);
            this.svgDragEvents.on('click', this.onSvgClick, this);
            L.DomEvent.on(svg, 'dblclick', this.onSvgDblClick, this);
            L.DomEvent.on(window, 'resize', this._onWindowResize, this);
        },

        removeFrom: function(map) {
            if (this.abortLoading) {
                this.abortLoading();
            }
            if (!this._map) {
                return this;
            }
            this._map._controlContainer.removeChild(this._container);
            map.removeLayer(this.polyline);
            map.removeLayer(this.trackMarker);
            map.removeLayer(this.polyLineSelection);
            L.DomEvent.off(window, 'resize', this._onWindowResize, this);
            this._map = null;
            this.fire('remove');
            return this;
        },

        onSvgDragStart: function(e) {
            if (e.dragButton === 0) {
                // FIXME: restore hiding when we make display of selection on map
                // this.cursorHide();
                this.polyLineSelection.addTo(this._map).bringToBack();
                this.selStartIndex = this.roundedSampleIndexFromMouseEvent(e);
            }
        },

        graphContainerOffsetFromMouseEvent: function(e) {
            if (e.originalEvent) {
                e = e.originalEvent;
            }
            let x = e.clientX - this.svg.getBoundingClientRect().left;
            if (x < 0) {
                x = 0;
            }
            if (x > this.svgWidth - 1) {
                x = this.svgWidth - 1;
            }
            return x;
        },

        sampleIndexFromMouseEvent: function(e) {
            const x = this.graphContainerOffsetFromMouseEvent(e);
            return x / (this.svgWidth - 1) * (this.values.length - 1);
        },

        roundedSampleIndexFromMouseEvent: function(e) {
            return Math.round(this.sampleIndexFromMouseEvent(e));
        },

        setTrackMarkerLabel: function(label) {
            const icon = this.trackMarker._icon;
            if (!icon) {
                return;
            }
            icon.getElementsByClassName('elevation-profile-marker-label')[0].innerHTML = label;
        },

        setGraphSelection: function(cursorIndex) {
            this.selMinInd = Math.min(cursorIndex, this.selStartIndex);
            this.selMaxInd = Math.max(cursorIndex, this.selStartIndex);

            if (this.selMinInd < 0) {
                this.selMinInd = 0;
            }
            if (this.selMaxInd > this.values.length - 1) {
                this.selMaxInd = this.values.length - 1;
            }
            this.updateGraphSelection();
            L.DomUtil.removeClass(this.graphSelection, 'elevation-profile-cursor-hidden');
        },

        updateGraphSelection: function() {
            const selStart = this.selMinInd * (this.svgWidth - 1) / (this.values.length - 1);
            const selEnd = this.selMaxInd * (this.svgWidth - 1) / (this.values.length - 1);
            this.graphSelection.style.left = selStart + 'px';
            this.graphSelection.style.width = (selEnd - selStart) + 'px';
        },

        onSvgDragEnd: function(e) {
            if (e.dragButton === 0) {
                this.cursorShow();
                this.setGraphSelection(this.roundedSampleIndexFromMouseEvent(e));
                var stats = this.calcProfileStats(this.values.slice(this.selMinInd, this.selMaxInd + 1));
                this.updatePropsDisplay(stats);
                L.DomUtil.addClass(this.propsContainer, 'elevation-profile-properties-selected');
            }
            if (e.dragButton === 2) {
                this.drawingContainer.scrollLeft -= e.dragMovement.x;
            }
        },

        onSvgDrag: function(e) {
            if (e.dragButton === 0) {
                this.setGraphSelection(this.roundedSampleIndexFromMouseEvent(e));
                this.polyLineSelection.setLatLngs(this.samples.slice(this.selMinInd, this.selMaxInd + 1));
            }
            if (e.dragButton === 2) {
                this.drawingContainer.scrollLeft -= e.dragMovement.x;
            }
        },

        onSvgClick: function(e) {
            const button = e.originalEvent.button;
            if (button === 0) {
                this.dragStart = null;
                L.DomUtil.addClass(this.graphSelection, 'elevation-profile-cursor-hidden');
                L.DomUtil.removeClass(this.propsContainer, 'elevation-profile-properties-selected');
                this._map.removeLayer(this.polyLineSelection);
                if (this.stats) {
                    this.updatePropsDisplay(this.stats);
                }
            }
            if (button === 2) {
                this.setMapPositionAtIndex(this.roundedSampleIndexFromMouseEvent(e));
            }
        },

        onSvgDblClick: function(e) {
            this.setMapPositionAtIndex(this.roundedSampleIndexFromMouseEvent(e));
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

            var ind = this.sampleIndexFromMouseEvent(e);

            var newScrollLeft = this.drawingContainer.scrollLeft +
                this.graphContainerOffsetFromMouseEvent(e) * (this.horizZoom / oldHorizZoom - 1);
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
            let d;
            if (stats.noData) {
                d = {
                    maxElev: '-',
                    minElev: '-',
                    startElev: '-',
                    endElev: '-',
                    change: '-',
                    ascentAngleStr: '-',
                    descentAngleStr: '-',
                    ascent: '-',
                    descent: '-',
                    startApprox: '',
                    endApprox: '',
                    approx: '',
                    incomplete: 'No elevation data',
                };
            } else {
                d = {
                    maxElev: Math.round(stats.max),
                    minElev: Math.round(stats.min),
                    startElev: Math.round(stats.start),
                    endElev: Math.round(stats.end),
                    change: Math.round(stats.finalAscent),
                    ascentAngleStr: isNaN(stats.angleAvgAscent) ? '-' : L.Util.template('{avg} / {max}&deg;',
                            {avg: stats.angleAvgAscent, max: stats.angleMaxAscent}
                        ),
                    descentAngleStr: isNaN(stats.angleAvgDescent) ? '-' : L.Util.template('{avg} / {max}&deg;',
                            {avg: stats.angleAvgDescent, max: stats.angleMaxDescent}
                        ),
                    ascent: Math.round(stats.ascent),
                    descent: Math.round(stats.descent),
                    dist: (stats.distance / 1000).toFixed(1),
                    startApprox: stats.dataLostAtStart > 0.02 ? '~ ' : '',
                    endApprox: stats.dataLostAtEnd > 0.02 ? '~ ' : '',
                    approx: stats.dataLost > 0.02 ? '~ ' : '',
                    incomplete: stats.dataLost > 0.02 ? 'Some elevation data missing' : '',
                };
            }
            d.dist = (stats.distance / 1000).toFixed(1);

            this.propsContainer.innerHTML = `
                <table>
                <tr><td>Max elevation:</td><td>${d.maxElev}</td></tr>
                <tr><td>Min elevation:</td><td>${d.minElev}</td></tr>
                <tr class="start-group"><td>Start elevation:</td><td>${d.startApprox}${d.startElev}</td></tr>
                <tr><td>Finish elevation:</td><td>${d.endApprox}${d.endElev}</td></tr>
                <tr><td>Start to finish elevation change:</td><td>${d.startApprox || d.endApprox}${d.change}</td></tr>
                <tr class="start-group"><td>Avg / Max ascent inclination:</td><td>${d.ascentAngleStr}</td></tr>
                <tr><td>Avg / Max descent inclination:</td><td>${d.descentAngleStr}</td></tr>
                <tr class="start-group"><td>Total ascent:</td><td>${d.approx}${d.ascent}</td></tr>
                <tr><td>Total descent:</td><td>${d.approx}${d.descent}</td></tr>
                <tr class="start-group"><td>Distance:</td><td>${d.dist} km</td></tr>
                <tr><td colspan="2" style="text-align: center">${d.incomplete}</td></tr>
                </table>
                `;
        },

        calcGridValues: function(minValue, maxValue) {
            var ticksNs = [3, 4, 5],
                tickSteps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000],
                ticks = [],
                i, j, k, ticksN, tickStep, tick1, tick2,
                matchFound = false;

            for (i = 0; i < tickSteps.length; i++) {
                tickStep = tickSteps[i];
                for (j = 0; j < ticksNs.length; j++) {
                    ticksN = ticksNs[j];
                    tick1 = Math.floor(minValue / tickStep);
                    tick2 = Math.ceil(maxValue / tickStep);
                    if ((tick2 - tick1) < ticksN) {
                        matchFound = true;
                        break;
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
                    if (filtered[i] === null) {
                        continue;
                    }
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

        calcProfileStats: function(values) {
            const stats = {
                distance: (values.length - 1) * this.options.samplingInterval
            };
            const notNullValues = values.filter((value) => value !== null);
            if (notNullValues.length === 0) {
                stats.noData = true;
                return stats;
            }
            stats.min = Math.min(...notNullValues);
            stats.max = Math.max(...notNullValues);
            let firstNotNullIndex = true,
                lastNotNullIndex = true,
                firstNotNullValue,
                lastNotNullValue;
            for (let i = 0; i < values.length; i++) {
                let value = values[i];
                if (value !== null) {
                    firstNotNullValue = value;
                    firstNotNullIndex = i;
                    break;
                }
            }
            for (let i = values.length - 1; i >= 0; i--) {
                let value = values[i];
                if (value !== null) {
                    lastNotNullValue = value;
                    lastNotNullIndex = i;
                    break;
                }
            }
            stats.finalAscent = lastNotNullValue - firstNotNullValue;

            const ascents = [],
                descents = [];
            let prevNotNullValue = values[firstNotNullIndex],
                prevNotNullIndex = firstNotNullIndex;
            for (let i = firstNotNullIndex + 1; i <= lastNotNullIndex; i++) {
                let value = values[i];
                if (value === null) {
                    continue;
                }
                let length = i - prevNotNullIndex;
                let gradient = (value - prevNotNullValue) / length;
                if (gradient > 0) {
                    for (let j = 0; j < length; j++) {
                        ascents.push(gradient);
                    }
                } else if (gradient < 0) {
                    for (let j = 0; j < length; j++) {
                        descents.push(-gradient);
                    }
                }
                prevNotNullIndex = i;
                prevNotNullValue = value;
            }
            function sum(a, b) {
                return a + b;
            }
            if (ascents.length !== 0) {
                stats.gradientAvgAscent = ascents.reduce(sum, 0) / ascents.length / this.options.samplingInterval;
                stats.gradientMinAscent = Math.min(...ascents) / this.options.samplingInterval;
                stats.gradientMaxAscent = Math.max(...ascents) / this.options.samplingInterval;
                stats.angleAvgAscent = gradientToAngle(stats.gradientAvgAscent);
                stats.angleMinAscent = gradientToAngle(stats.gradientMinAscent);
                stats.angleMaxAscent = gradientToAngle(stats.gradientMaxAscent);
            }
            if (descents.length !== 0) {
                stats.gradientAvgDescent = descents.reduce(sum, 0) / descents.length / this.options.samplingInterval;
                stats.gradientMinDescent = Math.min(...descents) / this.options.samplingInterval;
                stats.gradientMaxDescent = Math.max(...descents) / this.options.samplingInterval;
                stats.angleAvgDescent = gradientToAngle(stats.gradientAvgDescent);
                stats.angleMinDescent = gradientToAngle(stats.gradientMinDescent);
                stats.angleMaxDescent = gradientToAngle(stats.gradientMaxDescent);
            }

            stats.start = firstNotNullValue;
            stats.end = lastNotNullValue;
            stats.distance = (values.length - 1) * this.options.samplingInterval;
            stats.dataLostAtStart = firstNotNullIndex / values.length;
            stats.dataLostAtEnd = 1 - lastNotNullIndex / (values.length - 1);
            stats.dataLost = 1 - notNullValues.length / values.length;

            const filterTolerance = 5;
            const filtered = this.filterElevations(values.slice(firstNotNullIndex, lastNotNullIndex), filterTolerance);
            let ascent = 0,
                descent = 0,
                delta;
            for (let i = 1; i < filtered.length; i++) {
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
            const samplingInterval = this.options.samplingInterval;
            const distanceKm = samplingInterval * ind / 1000;
            const distanceStr = `${distanceKm.toFixed(2)} km`;
            const sample1 = this.values[Math.ceil(ind)];
            const sample2 = this.values[Math.floor(ind)];
            let angleStr;
            if (sample1 !== null && sample2 !== null) {
                const gradient = (sample2 - sample1) / samplingInterval;
                angleStr = `${Math.round(Math.atan(gradient) * 180 / Math.PI)}&deg`;
            } else {
                angleStr = '-';
            }

            const x = Math.round(ind / (this.values.length - 1) * (this.svgWidth - 1));
            const indInt = Math.round(ind);
            let elevation = this.values[indInt];
            if (elevation === null) {
                elevation = sample1;
            }
            if (elevation === null) {
                elevation = sample2;
            }
            const elevationStr = (elevation === null) ? '-' : `${elevation} m`;

            const cursorLabel = `${elevationStr}<br>${distanceStr}<br>${angleStr}`;

            this.graphCursorLabel.innerHTML = cursorLabel;

            this.graphCursor.style.left = x + 'px';
            this.graphCursorLabel.style.left = x + 'px';
            if (this.drawingContainer.getBoundingClientRect().left - this.drawingContainer.scrollLeft + x +
                this.graphCursorLabel.offsetWidth >= this.drawingContainer.getBoundingClientRect().right) {
                L.DomUtil.addClass(this.graphCursorLabel, 'elevation-profile-cursor-label-left');
            } else {
                L.DomUtil.removeClass(this.graphCursorLabel, 'elevation-profile-cursor-label-left');
            }

            let markerPos;
            if (ind <= 0) {
                markerPos = this.samples[0];
            } else if (ind >= this.samples.length - 1) {
                markerPos = this.samples[this.samples.length - 1];
            } else {
                const p1 = this.samples[Math.floor(ind)],
                    p2 = this.samples[Math.ceil(ind)],
                    indFrac = ind - Math.floor(ind);
                markerPos = [p1.lat + (p2.lat - p1.lat) * indFrac, p1.lng + (p2.lng - p1.lng) * indFrac];
            }
            this.trackMarker.setLatLng(markerPos);

            this.setTrackMarkerLabel(cursorLabel);
        },

        onSvgMouseMove: function(e) {
            if (!this.values) {
                return;
            }
            this.setCursorPosition(this.sampleIndexFromMouseEvent(e));
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

            var nearestInd = null,
                ind,
                minDist = null,
                mouseLatlng = e.latlng,
                i, sampleLatlng, dist, di;
            let nextDist,
                nextSampleDist,
                prevDist,
                prevSampleDist;
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
                    prevDist = sqrDist(mouseLatlng, this.samples[nearestInd - 1]);
                    prevSampleDist = sqrDist(this.samples[nearestInd], this.samples[nearestInd - 1]);
                }
                if (nearestInd < this.samples.length - 1) {
                    nextDist = sqrDist(mouseLatlng, this.samples[nearestInd + 1]);
                    nextSampleDist = sqrDist(this.samples[nearestInd], this.samples[nearestInd + 1]);
                }

                if (nearestInd === 0) {
                    if (nextDist < minDist + nextSampleDist) {
                        di = (minDist - nextDist) / 2 / nextSampleDist + 1 / 2;
                    } else {
                        di = 0.001;
                    }
                } else if (nearestInd === this.samples.length - 1) {
                    if (prevDist < minDist + prevSampleDist) {
                        di = -((minDist - prevDist) / 2 / prevSampleDist + 1 / 2);
                    } else {
                        di = -0.001;
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
                createSvg(
                    'path',
                    {'d': path, 'stroke-width': '1px', 'stroke': 'green', 'fill': 'none', 'stroke-opacity': '0.5'},
                    svg
                );

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

            let startNewSegment = true;
            for (i = 0; i < this.values.length; i++) {
                let value = this.values[i];
                if (value === null) {
                    startNewSegment = true;
                    continue;
                }
                path.push(startNewSegment ? 'M' : 'L');
                x = i * horizStep;
                y = valueToSvgCoord(value);
                path.push(x + ' ' + y + ' ');
                startNewSegment = false;
            }
            path = path.join('');
            createSvg('path', {'d': path, 'stroke-width': '1px', 'stroke': 'brown', 'fill': 'none'}, svg);
            // sightline
            if (this.options.sightLine) {
                path = L.Util.template('M{x1} {y1} L{x2} {y2}', {
                        x1: 0,
                        x2: this.svgWidth * this.horizZoom,
                        y1: valueToSvgCoord(this.values[0]),
                        y2: valueToSvgCoord(this.values[this.values.length - 1])
                    }
                );
                createSvg(
                    'path',
                    {'d': path, 'stroke-width': '3px', 'stroke': '#94b1ff', 'fill': 'none', 'stroke-opacity': '0.5'},
                    svg
                );
            }
        },

        onCloseButtonClick: function() {
            this.removeFrom(this._map);
        }
    }
);

export {ElevationProfile, calcSamplingInterval};
