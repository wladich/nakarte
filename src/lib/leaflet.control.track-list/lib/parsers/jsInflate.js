import tynyInflate from 'tiny-inflate';
import {stringToArrayBuffer, arrayBufferToString} from '~/lib/binary-strings';

function jsInflate(compressed, originalSize) {
    if (originalSize === 0) {
        return '';
    }
    const out = new Uint8Array(originalSize);
    tynyInflate(new Uint8Array(stringToArrayBuffer(compressed)), out);
    return arrayBufferToString(out);
}

export default jsInflate;
