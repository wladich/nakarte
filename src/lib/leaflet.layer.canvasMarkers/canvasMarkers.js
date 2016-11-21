import L from 'leaflet';
import './canvasMarkers.css';
import rbush from 'rbush';

/*
 Marker definition:
 {
 latlng: L.Latlng,
 icon: {url: string, center: [x, y]} or function(marker) returning icon,
 label: sting or function,
 tooltip: string or function,
 any other fields
 }
 */

function cached(f) {
    var cache = {};
    return function(arg) {
        if (!(arg in cache)) {
            cache[arg] = f(arg);
        }
        return cache[arg];
    }
}

function iconFromBackgroundUrl(className) {
    var container = L.DomUtil.create('div', '', document.body),
        el = L.DomUtil.create('div', className, container),
        st = window.getComputedStyle(el),
        url = st.backgroundImage.replace(/^url\("?/, '').replace(/"?\)$/, ''),
        icon;
    container.style.position = 'absolute';
    icon = {'url': url, 'center': [-el.offsetLeft, -el.offsetTop]};
    document.body.removeChild(container);
    container.removeChild(el);
    return icon;
}

L.Util.iconFromBackgroundUrl = cached(iconFromBackgroundUrl);

L.Layer.CanvasMarkers = L.GridLayer.extend({
        options: {
            async: true,
            labelFontName: 'Verdana, Arial, sans-serif',
            labelFontSize: 10,
            iconScale: 1,
            pane: 'rasterMarker'
        },

        initialize: function(markers, options) {
            L.GridLayer.prototype.initialize.call(this, options);
            this.rtree = rbush(9, ['.latlng.lng', '.latlng.lat', '.latlng.lng', '.latlng.lat']);
            this._regions = rbush(9, ['[0]', '[1]', '[2]', '[3]']);
            this._iconPositions = {};
            this._labelPositions = {};
            this._zoom = null;
            this.addMarkers(markers);
            this._images = {};
            this._tileQueue = [];
            this._hoverMarker = null;
            this.on('markerenter', this.onMarkerEnter, this);
            this.on('markerleave', this.onMarkerLeave, this);
        },

        addMarkers: function(markers) {
            if (markers) {
                this.rtree.load(markers);
                this.resetLabels();
                setTimeout(this.redraw.bind(this), 0);
            }
        },

        addMarker: function(marker) {
            // FIXME: adding existing marker must be be noop
            this.rtree.insert(marker);
            this.resetLabels();
            setTimeout(this.redraw.bind(this), 0);
        },

        removeMarker: function(marker) {
            this.removeMarkers([marker]);
        },

        removeMarkers: function(markers) {
            var i, marker, markerId;
            for (i = 0; i < markers.length; i++) {
                marker = markers[i];
                this.rtree.remove(marker);
            }
            this.resetLabels();
            setTimeout(this.redraw.bind(this), 0);
        },

        updateMarkers: function(markers) {
            var i;
            this.removeMarkers(markers);
            this.addMarkers(markers);
        },

        updateMarker: function(marker) {
            this.updateMarkers([marker]);
        },

        setMarkerPosition: function(marker, latlng) {
            this.removeMarker(marker);
            marker.latlng = latlng;
            this.addMarker(marker);
        },

        getMarkers: function() {
            return this.rtree.all();
        },

        findLabelPosition: function(iconCenter, iconSize, textWidth, textHeight) {
            var verticalPadding = 0,
                xPositions = [iconCenter[0] + iconSize[0] / 2 + 2, iconCenter[0] - iconSize[0] / 2 - textWidth - 2],
                yPositions = [iconCenter[1] - textHeight / 2 + verticalPadding,
                    iconCenter[1] - textHeight * .75 - iconSize[1] / 4 + verticalPadding,
                    iconCenter[1] - textHeight / 4 + iconSize[1] / 4 + verticalPadding,
                    iconCenter[1] - textHeight - iconSize[1] / 2 + verticalPadding,
                    iconCenter[1] + iconSize[1] / 2 + verticalPadding
                ], i, j, bestX, bestY, minIntersectionSum, intersectionSum, x, y;

            var self = this;

            function calcIntersectionSum(rect) {
                var regions = self._regions.search({minX: rect[0], minY: rect[1], maxX: rect[2], maxY: rect[3]}),
                    sum = 0,
                    k, left, right, top, bottom, rect2;

                for (k = 0; k < regions.length; k++) {
                    rect2 = regions[k];
                    left = Math.max(rect[0], rect2[0]);
                    right = Math.min(rect[2], rect2[2]);
                    top = Math.max(rect[1], rect2[1]);
                    bottom = Math.min(rect[3], rect2[3]);
                    if (top < bottom && left < right) {
                        sum += ((right - left) * (bottom - top));
                    }
                }
                return sum;
            }

            minIntersectionSum = 1e10;
            for (i = 0; i < xPositions.length; i++) {
                x = xPositions[i];
                for (j = 0; j < yPositions.length; j++) {
                    y = yPositions[j];
                    intersectionSum = calcIntersectionSum([x, y, x + textWidth, y + textHeight]);
                    if (intersectionSum < minIntersectionSum) {
                        minIntersectionSum = intersectionSum;
                        bestX = x;
                        bestY = y;
                        if (intersectionSum === 0) {
                            break;
                        }
                    }
                    if (intersectionSum === 0) {
                        break;
                    }
                }
            }

            return [bestX, bestY];
        },

        _iconPreloadFinished: function() {
            var url;
            for (url in this._images) {
                if (!this._images[url].complete) {
                    return false;
                }
            }
            return true;
        },

        _processTilesQueue: function() {
            while (this._tileQueue.length) {
                (this._tileQueue.pop())();
            }
        },

        preloadIcons: function(urls, cb) {
            this._tileQueue.push(cb);
            var self = this,
                url, i, img;
            for (i = 0; i < urls.length; i++) {
                url = urls[i];
                if (!(url in this._images)) {
                    img = new Image();
                    this._images[url] = img;
                    img.onload = function() {
                        if (self._iconPreloadFinished()) {
                            self._processTilesQueue();
                        }
                    };
                    img.src = url;
                }
            }
            if (self._iconPreloadFinished()) {
                self._processTilesQueue();
            }
        },

        createTile: function(coords) {
            const canvas = L.DomUtil.create('canvas', 'leaflet-tile');
            canvas.width = this.options.tileSize;
            canvas.height = this.options.tileSize;
            this.drawTile(canvas, coords, coords.z);
            return canvas;
        },

        drawTile: function(canvas, tilePoint, zoom) {
            var tileSize = this.options.tileSize,
                tileN = tilePoint.y * tileSize,
                tileW = tilePoint.x * tileSize,
                tileS = tileN + tileSize,
                tileE = tileW + tileSize,

                iconsHorPad = 520,
                iconsVertPad = 50,
                labelsHorPad = 256,
                labelsVertPad = 20,
                iconsBounds = L.latLngBounds(this._map.unproject([tileW - iconsHorPad, tileS + iconsHorPad], zoom),
                    this._map.unproject([tileE + iconsHorPad, tileN - iconsVertPad], zoom)
                ),
                labelsBounds = L.latLngBounds(this._map.unproject([tileW - labelsHorPad, tileS + labelsHorPad], zoom),
                    this._map.unproject([tileE + labelsHorPad, tileN - labelsVertPad], zoom)
                ),
                iconUrls = [],
                markerJobs = {},
                marker, p, icon, markerId, img;

            var markers = this.rtree.search(
                {
                    minX: iconsBounds.getWest(),
                    minY: iconsBounds.getSouth(),
                    maxX: iconsBounds.getEast(),
                    maxY: iconsBounds.getNorth()
                }
            );

            for (var i = 0; i < markers.length; i++) {
                marker = markers[i];
                p = this._map.project(marker.latlng, zoom);
                icon = marker.icon;
                if (typeof icon === 'function') {
                    icon = icon(marker);
                }
                iconUrls.push(icon.url);
                markerId = L.stamp(marker);
                markerJobs[markerId] = {marker: marker, icon: icon, projectedXY: p};
            }
            var self = this;
            this.preloadIcons(iconUrls, function() {
                    if (!self._map) {
                        return;
                    }
                    var textHeight = self.options.labelFontSize,
                        markerId, i, regionsInTile, isLabel, job, x, y, imgW, imgH,
                        label, textWidth, ctx, p;
                    if (self._zoom != zoom) {
                        self._zoom = zoom;
                        self.resetLabels();
                    }
                    ctx = canvas.getContext('2d');
                    ctx.font = L.Util.template('bold {size}px {name}',
                        {'name': self.options.labelFontName, 'size': self.options.labelFontSize}
                    );
                    for (markerId in markerJobs) {
                        job = markerJobs[markerId];
                        img = self._images[job.icon.url];
                        job.img = img;
                        imgW = Math.round(img.width * self.options.iconScale);
                        imgH = Math.round(img.height * self.options.iconScale);
                        if (!(markerId in self._iconPositions)) {
                            x = job.projectedXY.x - job.icon.center[0] * self.options.iconScale;
                            y = job.projectedXY.y - job.icon.center[1] * self.options.iconScale;
                            x = Math.round(x);
                            y = Math.round(y);
                            self._iconPositions[markerId] = [x, y];
                            self._regions.insert([x, y, x + imgW, y + imgH, job.marker, false]);
                        }
                        p = self._iconPositions[markerId];
                        x = p[0];
                        y = p[1];
                        job.iconCenter = [x + imgW / 2, y + imgH / 2];
                        job.iconSize = [imgW, imgH];
                    }
                markers = self.rtree.search({
                        minX: labelsBounds.getWest(), minY: labelsBounds.getSouth(),
                        maxX: labelsBounds.getEast(), maxY: labelsBounds.getNorth()
                    }
                );
                    for (i = 0; i < markers.length; i++) {
                        marker = markers[i];
                        markerId = L.stamp(marker);
                        job = markerJobs[markerId];
                        label = job.marker.label;
                        if (label) {
                            if (typeof label === 'function') {
                                label = label(job.marker);
                            }
                            job.label = label;
                            if (!(markerId in self._labelPositions)) {
                                textWidth = ctx.measureText(label).width;
                                p = self.findLabelPosition(job.iconCenter, job.iconSize, textWidth, textHeight);
                                self._labelPositions[markerId] = p;
                                x = p[0];
                                y = p[1];
                                self._regions.insert([x, y, x + textWidth, y + textHeight, job.marker, true]);
                            }
                        } else {
                            self._labelPositions[markerId] = null;
                        }
                    }

                    regionsInTile = self._regions.search({minX: tileW, minY: tileN, maxX: tileE, maxY: tileS});
                    for (i = 0; i < regionsInTile.length; i++) {
                        isLabel = regionsInTile[i][5];
                        if (isLabel) {
                            //TODO: set font name ant size in options
                            marker = regionsInTile[i][4];
                            markerId = L.stamp(marker);
                            job = markerJobs[markerId];
                            p = self._labelPositions[markerId];
                            x = p[0] - tileW;
                            y = p[1] - tileN;
                            ctx.textBaseline = 'bottom';
                            ctx.shadowColor = '#fff';
                            ctx.strokeStyle = '#fff';
                            ctx.fillStyle = '#000';
                            ctx.lineWidth = 1;
                            ctx.shadowBlur = 2;
                            ctx.strokeText(job.label, x, y + textHeight);
                            ctx.shadowBlur = 0;
                            ctx.fillText(job.label, x, y + textHeight);
                        }
                    }
                    for (i = 0; i < regionsInTile.length; i++) {
                        isLabel = regionsInTile[i][5];
                        if (!isLabel) {
                            marker = regionsInTile[i][4];
                            markerId = L.stamp(marker);
                            job = markerJobs[markerId];
                            p = self._iconPositions[markerId];
                            x = p[0] - tileW;
                            y = p[1] - tileN;
                            ctx.drawImage(job.img, x, y, job.iconSize[0], job.iconSize[1]);
                        }
                    }
                    // setTimeout(() => callback(canvas), 0);
                }
            );
            return this;
        },

        resetLabels: function() {
            this._iconPositions = {};
            this._labelPositions = {};
            this._regions.clear();
        },

        findMarkerFromMouseEvent: function(e) {
            var p = this._map.project(e.latlng),
                region = this._regions.search({minX: p.x, minY: p.y, maxX: p.x, maxY: p.y})[0],
                marker;
            if (region) {
                marker = region[4];
            } else {
                marker = null;
            }
            return marker;
        },

        onMouseMove: function(e) {
            var marker = this.findMarkerFromMouseEvent(e);
            if (this._hoverMarker !== marker) {
                if (this._hoverMarker) {
                    this.fire('markerleave', {marker: this._hoverMarker});
                }
                if (marker) {
                    this.fire('markerenter', {marker: marker});
                }
                this._hoverMarker = marker;
            }
        },

        showTooltip: function(e) {
            var text;
            if (!e.marker.tooltip) {
                return;
            }
            text = e.marker.tooltip;
            if (typeof text === 'function') {
                text = text(e.marker);
                if (!e.marker.tooltip) {
                    return;
                }
            }
            this.toolTip.innerHTML = text;
            var p = this._map.latLngToLayerPoint(e.marker.latlng);
            L.DomUtil.setPosition(this.toolTip, p);
            L.DomUtil.addClass(this.toolTip, 'canvas-marker-tooltip-on');
        },

        onMarkerEnter: function(e) {
            this._map._container.style.cursor = 'pointer';
            this.showTooltip(e);

        },

        onMarkerLeave: function() {
            this._map._container.style.cursor = '';
            L.DomUtil.removeClass(this.toolTip, 'canvas-marker-tooltip-on');
        },

        onMouseOut: function() {
            if (this._hoverMarker) {
                this._hoverMarker = null;
                this.fire('markerleave', {marker: this._hoverMarker});
            }
        },

        onClick: function(e) {
            var marker = this.findMarkerFromMouseEvent(e);
            if (marker) {
                L.extend(e, {marker: marker});
                this.fire('markerclick', e);
            }
        },

        onRightClick: function(e) {
            var marker = this.findMarkerFromMouseEvent(e);
            if (marker) {
                L.extend(e, {marker: marker});
                this.fire('markercontextmenu', e);
            }
        },

        onAdd: function(map) {
            map.createPane('rasterMarker').style.zIndex = 550;
            L.GridLayer.prototype.onAdd.call(this, map);
            map.on('mousemove', this.onMouseMove, this);
            map.on('mouseout', this.onMouseOut, this);
            map.on('click', this.onClick, this);
            map.on('contextmenu', this.onRightClick, this);
            this.toolTip = L.DomUtil.create('div', 'canvas-marker-tooltip', this._map.getPanes().markerPane);
        },

        onRemove: function(map) {
            this._map.off('mousemove', this.onMouseMove, this);
            this._map.off('mouseout', this.onMouseOut, this);
            this._map.off('click', this.onClick, this);
            this._map.off('contextmenu', this.onRightClick, this);
            if (this._hoverMarker) {
                this._hoverMarker = null;
                this.fire('markerleave', {marker: this._hoverMarker})
            }
            this._map.getPanes().markerPane.removeChild(this.toolTip);
            L.GridLayer.prototype.onRemove.call(this, map);
        }
    }
);
