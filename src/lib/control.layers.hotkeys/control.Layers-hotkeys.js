import L from 'leaflet'
import './style.css';

const originalOnAdd = L.Control.Layers.prototype.onAdd;
const originalOnRemove = L.Control.Layers.prototype.onRemove;
const originalAddLayer = L.Control.Layers.prototype._addLayer;

L.Control.Layers.include({
        _addLayer: function(layer, name, overlay) {
            if (layer.options) {
                const code = layer.options.code;
                if (code && code.length === 1) {
                    name += `<span class="layers-control-hotkey">${code}</span>`;
                }
            }
            return originalAddLayer.call(this, layer, name, overlay);
        },

        onAdd: function(map) {
            var result = originalOnAdd.call(this, map);
            L.DomEvent.on(document, 'keyup', this._onHotkeyUp, this);
            L.DomEvent.on(document, 'keydown', this.onKeyDown, this);
            return result;
        },

        onRemove: function(map) {
            L.DomEvent.off(document, 'keyup', this._onHotkeyUp, this);
            L.DomEvent.off(document, 'keydown', this.onKeyDown, this);
            originalOnRemove.call(this, map);

        },

        onKeyDown: function(e) {
            if (e.altKey || e.ctrlKey || e.shiftKey) {
                return;
            }
            this._keyDown = e.keyCode;
        },

        _onHotkeyUp: function(e) {
            const pressedKey = this._keyDown;
            this._keyDown = null;
            const targetTag = e.target.tagName.toLowerCase();
            if (('input' === targetTag && e.target.type === 'text')|| 'textarea' === targetTag || pressedKey !== e.keyCode) {
                return;
            }
            const key = String.fromCharCode(e.keyCode);
            for (let layer of this._layers) {
                let layerId = L.stamp(layer.layer);
                if (layer.layer.options && layer.layer.options.code && layer.layer.options.code.toUpperCase() === key) {
                    const inputs = this._form.getElementsByTagName('input');
                    for (let input of inputs) {
                        if (input.layerId === layerId) {
                            input.click();
                            break;
                        }
                    }
                    break;
                }
            }
        }

    }
);


