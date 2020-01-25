import L from 'leaflet';
import {getDeclination} from '~/lib/magnetic-declination';
import {PrintStaticLayer} from './decorations';

function radians(degrees) {
    return degrees * Math.PI / 180;
}

function movePoint(p, angle, dist) {
    angle = radians(angle);
    return L.point(p.x + Math.sin(angle) * dist, p.y - Math.cos(angle) * dist);
}

class MagneticMeridians extends PrintStaticLayer {
    lineThicknessMm = 0.2;
    lineIntervalMm = 50;
    samplingIntervalMm = 15;
    color = '#66c2ff';
    overlaySolid = false;

    _makeCanvasToLatLngTransformer(printOptions) {
        const projectedBounds = printOptions.pixelBounds;
        const scale = projectedBounds.getSize().unscaleBy(printOptions.destPixelSize);
        const origin = projectedBounds.min;
        return function(pixel) {
            return L.CRS.EPSG3857.pointToLatLng(pixel.scaleBy(scale).add(origin), printOptions.zoom);
        };
    }

    _drawRaster(canvas, printOptions) {
        const toLatLng = this._makeCanvasToLatLngTransformer(printOptions);
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.lineThicknessMm / 25.4 * printOptions.resolution;
        const intervalPx = this.lineIntervalMm / 25.4 * printOptions.resolution;
        const samplingPx = this.samplingIntervalMm / 25.4 * printOptions.resolution;
        const pageDiagonal = Math.sqrt(
            printOptions.destPixelSize.x * printOptions.destPixelSize.x +
            printOptions.destPixelSize.y * printOptions.destPixelSize.y
        );
        const maxSegments = pageDiagonal / 2 / samplingPx;

        function drawLine(p, directionDown) {
            ctx.moveTo(p.x, p.y);

            for (let i = 0; i <= maxSegments; i++) {
                let latLng = toLatLng(p);
                let declination = getDeclination(latLng.lat, latLng.lng);
                if (declination === null) {
                    break;
                }
                if (directionDown) {
                    declination += 180;
                }
                p = movePoint(p, declination, samplingPx);
                ctx.lineTo(p.x, p.y);
            }
        }

        const center = printOptions.destPixelSize.divideBy(2);
        const maxLines = pageDiagonal / 2 / intervalPx;

        drawLine(center);
        drawLine(center, true);

        let p = center;
        for (let i = 0; i <= maxLines; i++) {
            let latLng = toLatLng(p);
            let declination = getDeclination(latLng.lat, latLng.lng);
            if (declination === null) {
                declination = 0;
            }
            p = movePoint(p, declination + 90, intervalPx);
            drawLine(p);
            drawLine(p, true);
        }
        p = center;
        for (let i = 0; i <= maxLines; i++) {
            let latLng = toLatLng(p);
            let declination = getDeclination(latLng.lat, latLng.lng);
            if (declination === null) {
                declination = 0;
            }
            p = movePoint(p, declination - 90, intervalPx);
            drawLine(p);
            drawLine(p, true);
        }

        ctx.stroke();
    }
}

export {MagneticMeridians};
