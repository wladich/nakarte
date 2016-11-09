import L from 'leaflet';

// https://github.com/Leaflet/Leaflet/issues/3575

const originalStep = L.PosAnimation.prototype._step

function _step() {
    return originalStep.call(this, true);
}

export default function fixAnimationBug() {
    if (L.PosAnimation.prototype._step !== _step) {
        L.PosAnimation.prototype._step = _step;
    }
}