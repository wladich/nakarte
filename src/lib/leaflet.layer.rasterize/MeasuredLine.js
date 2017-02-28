import L from 'leaflet';
import 'lib/leaflet.polyline-measure';

L.Polyline.include({
        _printProgressWeight: 0.1,
        printWidthMm: 1,

        cloneForPrint: function(options) {
            options = L.Util.extend({}, this.options, options);
            const latlngs = this.getLatLngs().map((latlng) => latlng.clone());
            return new L.Polyline(latlngs, options);
        },

        _makelatLngToCanvasPixelTransformer: function(printOptions) {
            const projectedBounds = printOptions.pixelBounds;
            const scale = projectedBounds.getSize().unscaleBy(printOptions.destPixelSize);
            const origin = projectedBounds.min;
            return function(latlng) {
                return L.CRS.EPSG3857.latLngToPoint(latlng, printOptions.zoom).subtract(origin).unscaleBy(scale);
            }
        },


        _drawRaster: function(canvas, printOptions) {
            const latlngs = this.getLatLngs();
            if (!latlngs.length || !this.getBounds().intersects(printOptions.latLngBounds)) {
                return;
            }

            const ctx = canvas.getContext('2d');
            ctx.lineWidth = this.printWidthMm / 25.4 * printOptions.resolution;
            ctx.lineJoin = 'round';
            ctx.strokeStyle = this.options.color;
            const transform = this._makelatLngToCanvasPixelTransformer(printOptions);
            let point;
            ctx.beginPath();

            point = transform(latlngs[0]);
            ctx.moveTo(point.x, point.y);
            for (let i = 1; i < latlngs.length; i++) {
                point = transform(latlngs[i]);
                ctx.lineTo(point.x, point.y);
            }
            ctx.stroke();
            return true;
        },


        getTilesInfo: async function(printOptions) {
            return {
                iterateTilePromises: (function*() {
                    yield {
                        tilePromise: Promise.resolve({
                                draw: (canvas) => this._drawRaster(canvas, printOptions),
                                isOverlay: true
                            }
                        ),
                        abortLoading: () => {
                        }
                    }
                }).bind(this),
                count: 1
            };
        }
    }
);

L.MeasuredLine.include({
        tickFontSizeMm: 2.5,

        cloneForPrint: function(options) {
            options = L.Util.extend({}, this.options, options);
            const latlngs = this.getLatLngs().map((latlng) => latlng.clone());
            return new L.MeasuredLine(latlngs, options);
        },

        _drawRaster: function(canvas, printOptions) {
            if (!L.Polyline.prototype._drawRaster.call(this, canvas, printOptions)) {
                return;
            }
            if (!this.options.measureTicksShown) {
                return;
            }
            const minTicksIntervalMeters = printOptions.scale * 1.5;
            const ctx = canvas.getContext('2d');
            const ticks = this.getTicksPositions(minTicksIntervalMeters);
            const ticksPixelSize = this.tickFontSizeMm / 25.4 * printOptions.resolution;
            const transform = this._makelatLngToCanvasPixelTransformer(printOptions);
            ctx.font = `bold ${ticksPixelSize}px verdana`;
            ctx.fillStyle = this.options.color;
            for (let tick of ticks) {
                let m = tick.transformMatrix;
                let label = '\u2014 ' + Math.round((tick.distanceValue / 10)) / 100 + ' km';
                let position = transform(tick.position);
                ctx.setTransform(m[0], m[1], m[2], m[3], position.x, position.y);
                ctx.fillText(label, 0, ticksPixelSize * 0.3);
                ctx.setTransform(1, 0, 0, 1, 0, 0);
            }
        }
    }
);