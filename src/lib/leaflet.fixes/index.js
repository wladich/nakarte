import L from 'leaflet';
import './style.css';
import {fixVectorMarkerWorldJump} from './fixWorldCopyJump';

function fixAll() {
    fixPanAnimationBug();
    fixTouchDetection();
    fixMapKeypressEvent();
    fixVectorDrawWhileAnimation();
    fixVectorMarkerWorldJump()
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

function fixVectorDrawWhileAnimation() {
    if (L.Renderer.__animationFixed) {
        return;
    }

    const resetInterval = 300;

    const originalGetEvents = L.Renderer.prototype.getEvents;

    const onZoom = function() {
        const now = Date.now();
        if (!this._lastReset || (now - this._lastReset > resetInterval)) {
            this._reset();
            this._lastReset = now;
        } else {
            L.Renderer.prototype._onZoom.call(this);
        }

    };

    const onMove = function() {
        const now = Date.now();
        if (!this._lastReset || (now - this._lastReset > resetInterval)) {
            this._reset();
            this._lastReset = now;
        }
    };

    const getEvents = function() {
        const result = originalGetEvents.call(this);
        result.move = onMove;
        result.zoom = onZoom;
        return result;
    };

    L.Renderer.prototype.getEvents = getEvents;
    L.Renderer.__animationFixed = true;
}


export {fixAll}
