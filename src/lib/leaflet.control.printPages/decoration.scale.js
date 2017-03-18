import {PrintStaticLayer} from './decorations';

class OverlayScale extends PrintStaticLayer {
    fontSizeMm = 3;
    font = 'verdana';
    paddingMm = 1;

    _drawRaster(canvas, printOptions) {
        const ctx = canvas.getContext('2d');
        let scale = Math.round(printOptions.scale);
        let unit = 'm';
        if (scale >= 1000) {
            scale /= 1000;
            unit = 'km'
        }
        let caption = `${scale} ${unit} in 1 cm`;
        if (printOptions.pagesCount > 1) {
            caption += ` | Page ${printOptions.pageLabel} / ${printOptions.pagesCount}`;
        }
        const fontSize = this.fontSizeMm / 25.4 * printOptions.resolution;
        const padding = this.paddingMm / 25.4 * printOptions.resolution;
        ctx.font = `${fontSize}px ${this.font}`;
        const textWidth = ctx.measureText(caption).width;
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, textWidth + 2 * padding, fontSize + 2 * padding);
        ctx.fillStyle = '#000000';
        ctx.fillText(caption, padding, fontSize + padding);
    }
}

export {OverlayScale};