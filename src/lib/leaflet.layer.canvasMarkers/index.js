import L from 'leaflet';
import './canvasMarkers.css';
import RBush from 'rbush';
import loadImage from 'image-promise';
import {wrapLatLngToTarget} from '~/lib/leaflet.fixes/fixWorldCopyJump';

/*
 Marker definition:
 {
 latlng: L.Latlng,
 icon: {url: string, center: [x, y]} or function(marker) returning icon,
 label: string or function,
 tooltip: string or function,
 any other fields
 }
 */

function calcIntersectionSum(rect, rects) {
    let sum = 0,
        left, right, top, bottom, rect2;

    for (rect2 of rects) {
        left = Math.max(rect.minX, rect2.minX);
        right = Math.min(rect.maxX, rect2.maxX);
        top = Math.max(rect.minY, rect2.minY);
        bottom = Math.min(rect.maxY, rect2.maxY);
        if (top < bottom && left < right) {
            sum += ((right - left) * (bottom - top));
        }
    }
    return sum;
}

class MarkerRBush extends RBush {
    toBBox(marker) {
        const x = marker.latlng.lng;
        const y = marker.latlng.lat;
        return {
            minX: x,
            minY: y,
            maxX: x,
            maxY: y
        };
    }

    compareMinX(a, b) {
        return a.latlng.lng - b.latlng.lng;
    }

    compareMinY(a, b) {
        return a.latlng.lat - b.latlng.lat;
    }
}

L.Layer.CanvasMarkers = L.GridLayer.extend({
        options: {
            async: true,
            labelFontName: 'Verdana, Arial, sans-serif',
            labelFontSize: 10,
            iconScale: 1,
            pane: 'rasterMarker',
            updateWhenZooming: !L.Browser.mobile,
            iconsOpacity: 1,
            labelShadowWidth: 1,
        },

        initialize: function(markers, options) {
            L.GridLayer.prototype.initialize.call(this, options);
            this.rtree = new MarkerRBush(9);
            this._regions = new RBush();
            this._iconPositions = {};
            this._labelPositions = {};
            this._labelPositionsZoom = null;
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
                setTimeout(() => this.redraw(), 0);
            }
        },

        addMarker: function(marker) {
            // FIXME: adding existing marker must be be noop
            this.rtree.insert(marker);
            this.resetLabels();
            setTimeout(() => this.redraw(), 0);
        },

        removeMarker: function(marker) {
            this.removeMarkers([marker]);
        },

        removeMarkers: function(markers) {
            markers.forEach((marker) => this.rtree.remove(marker));
            this.resetLabels();
            setTimeout(() => this.redraw(), 0);
        },

        updateMarkers: function(markers) {
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

        findLabelPosition: function(iconCenter, iconSize, textWidth, textHeight, pixelExtents) {
            const
                verticalPadding = 0,
                xPositions = [iconCenter[0] + iconSize[0] / 2 + 2, iconCenter[0] - iconSize[0] / 2 - textWidth - 2],
                yPositions = [
                    iconCenter[1] - textHeight / 2 + verticalPadding,
                    iconCenter[1] - textHeight * 0.75 - iconSize[1] / 4 + verticalPadding,
                    iconCenter[1] - textHeight / 4 + iconSize[1] / 4 + verticalPadding,
                    iconCenter[1] - textHeight - iconSize[1] / 2 + verticalPadding,
                    iconCenter[1] + iconSize[1] / 2 + verticalPadding
                ];

            let minIntersectionSum = Infinity;
            let bestX = xPositions[0],
                bestY = yPositions[0];
            for (let x of xPositions) {
                for (let y of yPositions) {
                    const rect = {minX: x, minY: y, maxX: x + textWidth, maxY: y + textHeight};
                    if (pixelExtents && (rect.minX < pixelExtents.tileW || rect.maxX > pixelExtents.tileE ||
                        rect.minY < pixelExtents.tileN || rect.maxY > pixelExtents.tileS)) {
                        continue;
                    }
                    let intersectionSum = calcIntersectionSum(rect, this._regions.search(rect));
                    if (intersectionSum < minIntersectionSum) {
                        minIntersectionSum = intersectionSum;
                        bestX = x;
                        bestY = y;
                        if (minIntersectionSum === 0) {
                            break;
                        }
                    }
                }
                if (minIntersectionSum === 0) {
                    break;
                }
            }
            return [bestX, bestY];
        },

        preloadIcons: function(urls) {
            const newUrls = urls.filter((url) => !(url in this._images));
            if (newUrls.length) {
                return loadImage(newUrls).then((images) => {
                        for (let image of images) {
                            this._images[image.src] = image;
                        }
                    }
                );
            }
            return Promise.resolve();
        },

        createTile: function(coords, done) {
            const canvas = L.DomUtil.create('canvas', 'leaflet-tile');
            canvas.width = this.options.tileSize;
            canvas.height = this.options.tileSize;
            setTimeout(() => {
                    this.drawTile(canvas, coords).then(() => done(null, canvas));
                }, 0
            );
            return canvas;
        },

        selectMarkersForDraw: function({tileN, tileS, tileE, tileW}, zoom, withoutPadding) {
            // FIXME: padding should depend on options.iconScale and fontSize
            if (!this._map) {
                return {};
            }
            const
                iconsHorPad = withoutPadding ? 0 : 520,
                iconsVertPad = withoutPadding ? 0 : 50,
                labelsHorPad = withoutPadding ? 0 : 256,
                labelsVertPad = withoutPadding ? 0 : 20;
            const
                iconsBounds = L.latLngBounds(
                    this._map.unproject(L.point(tileW - iconsHorPad, tileS + iconsHorPad), zoom),
                    this._map.unproject(L.point(tileE + iconsHorPad, tileN - iconsVertPad), zoom)
                ),
                labelsBounds = L.latLngBounds(
                    this._map.unproject(L.point(tileW - labelsHorPad, tileS + labelsHorPad), zoom),
                    this._map.unproject(L.point(tileE + labelsHorPad, tileN - labelsVertPad), zoom)
                );
            const
                iconUrls = [],
                markerJobs = {};

            // used only to preload icons
            const pointsForMarkers = [];
            for (let shift of [-360, 0, 360]) {
                pointsForMarkers.push(...this.rtree.search({
                    minX: iconsBounds.getWest() + shift,
                    minY: iconsBounds.getSouth(),
                    maxX: iconsBounds.getEast() + shift,
                    maxY: iconsBounds.getNorth()
                }));
            }

            // used to place labels
            const pointsForLabels = [];
            for (let shift of [-360, 0, 360]) {
                pointsForLabels.push(...this.rtree.search({
                    minX: labelsBounds.getWest() + shift,
                    minY: labelsBounds.getSouth(),
                    maxX: labelsBounds.getEast() + shift,
                    maxY: labelsBounds.getNorth()
                }));
            }
            const tileMidLongitude = this._map.unproject([(tileE + tileW) / 2, tileN], zoom);

            for (let marker of pointsForMarkers) {
                let latlng = marker.latlng;
                if (this.options.noWrap) {
                    latlng = wrapLatLngToTarget(latlng, tileMidLongitude);
                }
                const p = this._map.project(latlng, zoom);
                let icon = marker.icon;
                if (typeof icon === 'function') {
                    icon = icon(marker);
                }
                iconUrls.push(icon.url);
                let markerId = L.stamp(marker);
                markerJobs[markerId] = {marker: marker, icon: icon, projectedXY: p};
            }
            return {iconUrls, markerJobs, pointsForLabels};
        },

        drawSelectedMarkers: function(canvas, pixelExtents, markerJobs, pointsForLabels, zoom, limitLabelsToImage) {
            const {tileN, tileW, tileS, tileE} = pixelExtents;
            const textHeight = this.options.labelFontSize * this.options.iconScale;
            if (this._labelPositionsZoom !== zoom) {
                this._labelPositionsZoom = zoom;
                this.resetLabels();
            }
            const ctx = canvas.getContext('2d');
            ctx.font = L.Util.template('bold {size}px {name}',
                {name: this.options.labelFontName, size: this.options.labelFontSize * this.options.iconScale}
            );
            for (let [markerId, job] of Object.entries(markerJobs)) {
                let img = this._images[job.icon.url];
                job.img = img;
                const imgW = Math.round(img.width * this.options.iconScale);
                const imgH = Math.round(img.height * this.options.iconScale);
                if (!(markerId in this._iconPositions)) {
                    let x = job.projectedXY.x - job.icon.center[0] * this.options.iconScale;
                    let y = job.projectedXY.y - job.icon.center[1] * this.options.iconScale;
                    x = Math.round(x);
                    y = Math.round(y);
                    this._iconPositions[markerId] = [x, y];
                    this._regions.insert({
                        minX: x,
                        minY: y,
                        maxX: x + imgW,
                        maxY: y + imgH,
                        marker: job.marker,
                        isLabel: false
                    });
                }
                let [x, y] = this._iconPositions[markerId];
                job.iconCenter = [x + imgW / 2, y + imgH / 2];
                job.iconSize = [imgW, imgH];
            }
            for (let marker of pointsForLabels) {
                const markerId = L.stamp(marker);
                const job = markerJobs[markerId];
                let label = job.marker.label;
                if (typeof label === 'function') {
                    label = label(job.marker, zoom);
                }
                if (label) {
                    job.label = label;
                    if (!(markerId in this._labelPositions)) {
                        const textWidth = ctx.measureText(label).width;
                        const p = this.findLabelPosition(job.iconCenter, job.iconSize, textWidth, textHeight,
                            limitLabelsToImage ? pixelExtents : null);
                        this._labelPositions[markerId] = p;
                        let [x, y] = p;
                        this._regions.insert({
                            minX: x,
                            minY: y,
                            maxX: x + textWidth,
                            maxY: y + textHeight,
                            marker: job.marker,
                            isLabel: true
                        });
                    }
                } else {
                    this._labelPositions[markerId] = null;
                }
            }

            const regionsInTile = this._regions.search({minX: tileW, minY: tileN, maxX: tileE, maxY: tileS});
            // draw labels
            for (let region of regionsInTile) {
                if (region.isLabel) {
                    // TODO: set font name ant size in options
                    const markerId = L.stamp(region.marker);
                    const job = markerJobs[markerId];
                    const p = this._labelPositions[markerId];
                    const x = p[0] - tileW;
                    const y = p[1] - tileN;
                    ctx.textBaseline = 'bottom';
                    ctx.shadowColor = '#fff';
                    ctx.strokeStyle = '#fff';
                    ctx.fillStyle = '#000';
                    ctx.lineWidth = 1.2 * this.options.iconScale;
                    ctx.shadowBlur = this.options.labelShadowWidth * this.options.iconScale;
                    ctx.strokeText(job.label, x, y + textHeight);
                    ctx.shadowBlur = 0;
                    ctx.fillText(job.label, x, y + textHeight);
                }
            }
            ctx.globalAlpha = this.options.iconsOpacity;
            // draw icons
            for (let region of regionsInTile) {
                if (!region.isLabel) {
                    const markerId = L.stamp(region.marker);
                    const job = markerJobs[markerId];
                    const p = this._iconPositions[markerId];
                    const x = p[0] - tileW;
                    const y = p[1] - tileN;
                    ctx.drawImage(job.img, x, y, job.iconSize[0], job.iconSize[1]);
                }
            }
            ctx.globalAlpha = 1;
        },

        drawTile: async function(canvas, coords) {
            const
                zoom = coords.z,
                tileSize = this.options.tileSize,
                tileN = coords.y * tileSize,
                tileW = coords.x * tileSize,
                tileS = tileN + tileSize,
                tileE = tileW + tileSize;
            const pixelExtents = {tileN, tileS, tileE, tileW};
            const {iconUrls, markerJobs, pointsForLabels} = this.selectMarkersForDraw(pixelExtents, zoom);
            if (!markerJobs) {
                return;
            }
            await this.preloadIcons(iconUrls);
            this.drawSelectedMarkers(canvas, pixelExtents, markerJobs, pointsForLabels, zoom);
        },

        resetLabels: function() {
            this._iconPositions = {};
            this._labelPositions = {};
            this._regions.clear();
        },

        findMarkerFromMouseEvent: function(e) {
            const
                p = this._map.project(e.latlng.wrap()),
                region = this._regions.search({minX: p.x, minY: p.y, maxX: p.x, maxY: p.y})[0];
            let marker;
            if (region) {
                marker = region.marker;
            } else {
                marker = null;
            }
            return marker;
        },

        onMouseMove: function(e) {
            const marker = this.findMarkerFromMouseEvent(e);
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
            if (!e.marker.tooltip) {
                return;
            }
            let text = e.marker.tooltip;
            if (typeof text === 'function') {
                text = text(e.marker);
                if (!e.marker.tooltip) {
                    return;
                }
            }
            this.toolTip.innerHTML = text;
            const p = this._map.latLngToLayerPoint(e.marker.latlng);
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
                const marker = this._hoverMarker;
                this._hoverMarker = null;
                this.fire('markerleave', {marker});
            }
        },

        onClick: function(e) {
            if (this._map.clickLocked) {
                return;
            }
            const marker = this.findMarkerFromMouseEvent(e);
            if (marker) {
                L.extend(e, {marker: marker});
                this.fire('markerclick', e);
            }
        },

        onRightClick: function(e) {
            const marker = this.findMarkerFromMouseEvent(e);
            if (marker) {
                L.extend(e, {marker: marker});
                this.fire('markercontextmenu', e);
            }
        },

        onAdd: function(map) {
            if (this.options.pane === 'rasterMarker' && !map.getPane('rasterMarker')) {
                map.createPane('rasterMarker').style.zIndex = 550;
            }
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
                this.fire('markerleave', {marker: this._hoverMarker});
            }
            this._map.getPanes().markerPane.removeChild(this.toolTip);
            L.GridLayer.prototype.onRemove.call(this, map);
        }
    }
);
