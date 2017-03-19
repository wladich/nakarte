import {PrintStaticLayer} from './decorations';
import L from 'leaflet';


function radians(degrees) {
    return degrees * Math.PI / 180;
}

class Grid extends PrintStaticLayer {
    lineThicknessMm = 0.2;
    minGridIntervalMm = 15;

    fontSizeMm = 3;
    font = 'verdana';
    paddingMm = 1;

    intervals = [1, 1.5, 2, 3.3, 5, 7.5,
        10, 15, 20, 33, 50, 75,
        100, 150, 200, 333, 500, 750,
        1000, 1500, 2000, 4000, 5000, 7500,
        10000, 15000, 20000, 40000, 50000, 75000,
        100000, 150000, 200000, 400000, 500000, 750000,
        1000000, 1500000, 2000000, 4000000, 5000000, 7500000];

    getGridInterval(printOptions) {
        const minGridIntervalM = this.minGridIntervalMm / 10 * printOptions.scale;
        let intervalM;
        for (intervalM of this.intervals) {
            if (intervalM > minGridIntervalM) {
                break
            }
        }
        return intervalM;
    }

    formatDistance(x) {
        let unit;
        if (x < 1000) {
            unit = 'm';
        } else {
            x /= 1000;
            unit = 'km';
        }
        if (x % 1) {
            x = x.toFixed(1);
        }
        return `${x} ${unit}`;
    }

    _drawRaster(canvas, printOptions) {
        const metersPerDegree = L.Projection.SphericalMercator.R * Math.PI / 180;
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        const lineThickness = this.lineThicknessMm / 25.4 * printOptions.resolution;
        ctx.lineWidth = lineThickness;
        ctx.strokeStyle = '#ccc';

        const intervalM = this.getGridInterval(printOptions);
        const width = printOptions.destPixelSize.x;
        const height = printOptions.destPixelSize.y;
        const mercatorBounds = L.bounds(
            L.Projection.SphericalMercator.project(printOptions.latLngBounds.getNorthWest()),
            L.Projection.SphericalMercator.project(printOptions.latLngBounds.getSouthEast())
        );
        const canvasToMercatorScale = mercatorBounds.getSize().unscaleBy(printOptions.destPixelSize);
        const rows = [];
        let y = height;
        while (true) {
            let yMerc = mercatorBounds.max.y - y * canvasToMercatorScale.y;
            let lat = L.Projection.SphericalMercator.unproject(L.point(0, yMerc)).lat;
            rows.push({lat, y});
            if (y < 0) {
                break
            }
            let lat2 = lat + intervalM / metersPerDegree;
            let yMerc2 = L.Projection.SphericalMercator.project(L.latLng(lat2, 0)).y;
            y = (mercatorBounds.max.y - yMerc2) / canvasToMercatorScale.y;
        }
        for ({y} of rows) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        const pageCanvasCenterX = printOptions.destPixelSize.x / 2;
        for (let direction of [-1, 1]) {
            let colN = 0;
            while (true) {
                let firstRow = true;
                let hasPointInPage = false;
                for (let {lat, y} of rows) {
                    let dx = colN * intervalM / Math.cos(radians(lat)) / canvasToMercatorScale.x;
                    if (dx < pageCanvasCenterX) {
                        hasPointInPage = true;
                    }
                    if (firstRow) {
                        ctx.moveTo(pageCanvasCenterX + dx * direction, y);
                    } else {
                        ctx.lineTo(pageCanvasCenterX + dx * direction, y);
                    }
                    firstRow = false;
                }
                if (!hasPointInPage) {
                    break
                }
                colN += 1;
            }
        }
        ctx.stroke();

        const caption = 'Grid ' + this.formatDistance(intervalM);
        const fontSize = this.fontSizeMm / 25.4 * printOptions.resolution;
        const padding = this.paddingMm / 25.4 * printOptions.resolution;
        ctx.font = `${fontSize}px ${this.font}`;
        const textWidth = ctx.measureText(caption).width;
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, height - fontSize - 2 * padding, textWidth + 2 * padding, fontSize + 2 * padding);
        ctx.fillStyle = '#000000';
        ctx.fillText(caption, padding, height - padding);
    }
}

export {Grid};