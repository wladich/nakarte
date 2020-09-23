import {PrintStaticLayer} from './decorations';

function pageScaleRange(printOptions) {
    const pageSize = printOptions.destPixelSize.divideBy(printOptions.resolution / 25.4);
    const bounds = printOptions.latLngBounds;
    const southLen = bounds.getSouthEast().distanceTo(bounds.getSouthWest());
    const northLen = bounds.getNorthEast().distanceTo(bounds.getNorthWest());
    const nScale = Math.round(northLen / pageSize.x * 10);
    const sScale = Math.round(southLen / pageSize.x * 10);
    return {
        min: Math.min(nScale, sScale, printOptions.scale),
        max: Math.max(nScale, sScale, printOptions.scale)
    };
}

function formatScale(nominalScale, scaleRange) {
    const threshold = 0.05;
    if (
        Math.abs(nominalScale - scaleRange.min) / nominalScale > threshold ||
        Math.abs(nominalScale - scaleRange.max) / nominalScale > threshold
    ) {
        let unit;
        scaleRange = {...scaleRange};
        if (scaleRange.min >= 1000) {
            scaleRange.min /= 1000;
            scaleRange.max /= 1000;
            unit = 'km';
        } else {
            unit = 'm';
        }
        return `${scaleRange.min} – ${scaleRange.max} ${unit} in 1 cm`;
    }
    let unit;
    if (nominalScale >= 1000) {
        nominalScale /= 1000;
        unit = 'km';
    } else {
        unit = 'm';
    }
    return `${nominalScale} ${unit} in 1 cm`;
}

class OverlayScale extends PrintStaticLayer {
    fontSizeMm = 3;
    font = 'verdana';
    paddingMm = 1;
    overlaySolid = true;

    _drawRaster(canvas, printOptions) {
        const ctx = canvas.getContext('2d');
        let caption = formatScale(printOptions.scale, pageScaleRange(printOptions));
        if (printOptions.pagesCount > 1) {
            caption += ` | Page ${printOptions.pageLabel} / ${printOptions.pagesCount}`;
        }
        const fontSize = this.fontSizeMm / 25.4 * printOptions.resolution;
        const padding = this.paddingMm / 25.4 * printOptions.resolution;
        ctx.font = `${fontSize}px ${this.font}`;
        const textWidth = ctx.measureText(caption).width;
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(0, 0, textWidth + 2 * padding, fontSize + 2 * padding);
        ctx.fillStyle = '#000000';
        ctx.fillText(caption, padding, fontSize + padding);
    }
}

export {OverlayScale};
