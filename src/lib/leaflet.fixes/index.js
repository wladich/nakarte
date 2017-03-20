import L from 'leaflet';
import './style.css';

function fixAll() {
    fixPanAnimationBug();
    fixTouchDetection();
    fixMapKeypressEvent();
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
    L.Browser.touch &= ((navigator.pointerEnabled && !L.Browser.ie)|| navigator.maxTouchPoints)
}

function fixMapKeypressEvent() {
    const originalHandleDOMEvent = L.Map.prototype._handleDOMEvent;
    L.Map.prototype._handleDOMEvent = function(e) {
        if (e.type === 'keypress' && e.keyCode === 13) {
            this._fireDOMEvent(e, e.type);
        } else {
            originalHandleDOMEvent.call(this, e);
        }
    }
}

export {fixAll}
