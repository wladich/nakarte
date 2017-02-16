import L from 'leaflet';

function fixAll() {
    fixPanAnimationBug();
    fixTouchDetection();
    disableGridLayerUpdateWhenZooming();
}

// https://github.com/Leaflet/Leaflet/issues/3575
function fixPanAnimationBug() {
    if (!L.Browser.chrome) {
        return;
    }
    if (L.PosAnimation.prototype.__panAnimationFixed) {
        return;
    }

    const originalStep = L.PosAnimation.prototype._step;
    L.PosAnimation.prototype._step = function() {
        return originalStep.call(this, true);
    };
    L.PosAnimation.prototype.__panAnimationFixed = true;
}

function fixTouchDetection() {
    L.Browser.touch &= (navigator.pointerEnabled || navigator.maxTouchPoints)
}

function disableGridLayerUpdateWhenZooming() {
    L.GridLayer.addInitHook(function() {
            this.options.updateWhenZooming = false;
        }
    );
}

export {fixAll}
