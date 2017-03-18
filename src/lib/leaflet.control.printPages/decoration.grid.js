import {PrintStaticLayer} from './decorations';

class Grid extends PrintStaticLayer {
    lineThicknessMm = 0.2;
    minGridIntervalMm = 15;

    fontSizeMm = 3;
    font = 'verdana';
    paddingMm = 1;

    intervals = [1, 1.5, 2, 3.3, 5, 7.5,
        10, 15, 20, 33, 50, 75,
        100, 150, 200, 333, 500, 750,
        1000, 1500, 2000, 3333, 5000, 7500,
        10000, 15000, 20000, 33333, 50000, 75000,
        100000, 150000, 200000, 333333, 500000, 750000,
        1000000, 1500000, 2000000, 3333333, 5000000, 7500000];

    getGridInterval(printOptions) {
        const minGridIntervalM = this.minGridIntervalMm / 10 * printOptions.scale;
        let intervalM;
        for (intervalM of this.intervals) {
            if (intervalM > minGridIntervalM) {
                break
            }
        }
        return {intervalM, intervalMm: intervalM / printOptions.scale * 10};
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
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        const lineThickness = this.lineThicknessMm / 25.4 * printOptions.resolution;
        const {intervalMm, intervalM} = this.getGridInterval(printOptions);
        const intervalPx = intervalMm / 25.4 * printOptions.resolution;
        ctx.lineWidth = lineThickness;
        ctx.strokeStyle = '#ccc';
        const width = printOptions.destPixelSize.x;
        const height = printOptions.destPixelSize.y;
        for (let x = 0; x <= width; x += intervalPx) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        for (let y = height; y >= 0; y -= intervalPx) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
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