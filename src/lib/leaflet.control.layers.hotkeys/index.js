import L from 'leaflet';
import './style.css';

function getLayerHotkey(layer) {
    if (!layer || !layer.options) {
        return null;
    }
    let hotkey = layer.options.hotkey;
    if (hotkey) {
        return hotkey;
    }
    hotkey = layer.options.code;
    if (hotkey && hotkey.length === 1) {
        return hotkey;
    }
    return null;
}

function extendLayerName(name, layer) {
    if (layer.options) {
        const hotkey = getLayerHotkey(layer);
        if (hotkey) {
            name += `<span class="layers-control-hotkey">${hotkey}</span>`;
        }
    }
    return name;
}

function enableHotKeys(control) {
    const originalOnAdd = control.onAdd;
    const originalOnRemove = control.onRemove;
    const originalAddItem = control._addItem;

    if (control._hotKeysEnabled) {
        return control;
    }

    L.Util.extend(control, {
            _hotKeysEnabled: true,

            _addItem: function(obj) {
                if (!L.Browser.touch || !L.Browser.mobile) {
                    obj = L.Util.extend({}, obj);
                    obj.name = extendLayerName(obj.name, obj.layer);
                }
                return originalAddItem.call(this, obj);
            },

            onAdd: function(map) {
                var result = originalOnAdd.call(this, map);
                this._addHotketEvents();
                return result;
            },

            onRemove: function(map) {
                L.DomEvent.off(document, 'keyup', this._onHotkeyUp, this);
                L.DomEvent.off(document, 'keydown', this.onKeyDown, this);
                originalOnRemove.call(this, map);
            },

            _addHotKetEvents: function() {
                L.DomEvent.on(document, 'keyup', this._onHotkeyUp, this);
                L.DomEvent.on(document, 'keydown', this.onKeyDown, this);
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
                if (
                    (targetTag === 'input' && ['text', 'search'].includes(e.target.type)) ||
                    targetTag === 'textarea' ||
                    pressedKey !== e.keyCode
                ) {
                    return;
                }
                const key = String.fromCharCode(e.keyCode);
                for (let layer of this._layers) {
                    let layerId = L.stamp(layer.layer);
                    const layerHotkey = getLayerHotkey(layer.layer);
                    if (layerHotkey === key) {
                        const inputs = this._form.getElementsByTagName('input');
                        for (let input of [...inputs]) {
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
    for (let layer of control._layers) {
        layer.name = extendLayerName(layer.name, layer.layer);
    }
    control._addHotKetEvents();
    control._update();
    return control;
}

export default enableHotKeys;

