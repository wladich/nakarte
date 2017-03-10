import L from 'leaflet';
import './style.css';
import enableTopRow from 'lib/leaflet.control.layers.top-row';
import ko from 'vendored/knockout';
import {notify} from 'lib/notifications';
import logging from 'lib/logging';
import safeLocalStorage from 'lib/safe-localstorage';

function enableConfig(control, layers) {
    const originalOnAdd = control.onAdd;
    const originalUnserializeState = control.unserializeState;
    const originalAddItem = control._addItem;
    if (control._configEnabled) {
        return;
    }
    enableTopRow(control);

    L.Util.extend(control, {
            _configEnabled: true,
            _allLayersGroups: layers,
            _allLayers: [].concat(...layers.map(group => group.layers)),
            _customLayers: ko.observableArray(),

            onAdd: function(map) {
                const container = originalOnAdd.call(this, map);
                this.__injectConfigButton();
                return container;
            },

            __injectConfigButton: function() {
                const configButton = L.DomUtil.create('div', 'button icon-settings');
                configButton.title = 'Configure layers';
                this._topRow.appendChild(configButton);
                L.DomEvent.on(configButton, 'click', this._onConfigButtonClick, this);

                const newCustomLayerButton = L.DomUtil.create('div', 'button icon-edit');
                newCustomLayerButton.title = 'Add custom layer';
                this._topRow.appendChild(newCustomLayerButton);
                L.DomEvent.on(newCustomLayerButton, 'click', this.onCustomLayerCreateClicked, this);
            },

            _initializeLayersState: function() {
                let storedLayersEnabled = {};
                const serialized = safeLocalStorage.getItem('layersEnabled');
                if (serialized) {
                    try {
                        storedLayersEnabled = JSON.parse(serialized);
                    } catch (e) {
                        logging.captureMessage('Failed to load enabled layers from localstorage - invalid json',{
                            extra: {"localstorage.layersEnabled": serialized.slice(0, 1000)}
                        })
                    }
                }
                // restore custom layers
                Object.keys(storedLayersEnabled).forEach(code => this.loadCustomLayerFromString(code));

                for (let layer of [...this._allLayers, ...this._customLayers()]) {
                    let enabled = storedLayersEnabled[layer.layer.options.code];
                    // if storage is empty enable only default layers
                    // if new default layer appears it will be enabled
                    if (typeof enabled === 'undefined') {
                        enabled = layer.isDefault;
                    }
                    layer.enabled = enabled;
                    layer.checked = ko.observable(enabled);
                    layer.description = layer.description || '';
                }
                this.updateEnabledLayers();
            },

            _onConfigButtonClick: function() {
                this.showLayersSelectWindow()
            },

            _initLayersSelectWindow: function() {
                if (this._configWindow) {
                    return;
                }

                const container = this._configWindow =
                    L.DomUtil.create('div', 'leaflet-layers-dialog-wrapper');
                L.DomEvent
                    .disableClickPropagation(container)
                    .disableScrollPropagation(container);
                container.innerHTML = `
<div class="leaflet-layers-select-window">
    <form>
        <!-- ko foreach: _allLayersGroups -->
            <div class="section-header" data-bind="html: group"></div>
            <!-- ko foreach: layers -->
                <label>
                    <input type="checkbox" data-bind="checked: checked"/>
                    <span data-bind="text: title">
                    </span><!--  ko if: description -->
                    <span data-bind="html: description || ''"></span>
                    <!-- /ko -->
                </label>
            <!-- /ko -->
        <!-- /ko -->
        <div data-bind="if: _customLayers().length" class="section-header">Custom layers</div>
        <!-- ko foreach: _customLayers -->
                <label>
                    <input type="checkbox" data-bind="checked: checked"/>
                    <span data-bind="text: title"></span>
                </label>
        <!-- /ko -->
    </form>
    <div class="buttons-row">
        <div href="#" class="button" data-bind="click: onSelectWindowOkClicked">Ok</div>
        <div href="#" class="button" data-bind="click: onSelectWindowCancelClicked">Cancel</div>
        <div href="#" class="button" data-bind="click: onSelectWindowResetClicked">Reset</div>
    </div>            
</div>
                `;
                ko.applyBindings(this, container);
            },

            showLayersSelectWindow: function() {
                if (this._configWindowVisible) {
                    return;
                }
                [...this._allLayers, ...this._customLayers()].forEach(layer => layer.checked(layer.enabled));
                this._initLayersSelectWindow();
                this._map._controlContainer.appendChild(this._configWindow);
                this._configWindowVisible = true;
            },

            hideSelectWindow: function() {
                if (!this._configWindowVisible) {
                    return;
                }
                this._map._controlContainer.removeChild(this._configWindow);
                this._configWindowVisible = false;
            },

            onSelectWindowCancelClicked: function() {
                this.hideSelectWindow();
            },

            onSelectWindowResetClicked: function() {
                if (!this._configWindow) {
                    return;
                }
                [...this._allLayers, ...this._customLayers()].forEach(layer => layer.checked(layer.isDefault));
            },

            onSelectWindowOkClicked: function() {
                [...this._allLayers, ...this._customLayers()].forEach(layer => layer.enabled = layer.checked());
                this.updateEnabledLayers();
                this.hideSelectWindow();
            },

            onCustomLayerCreateClicked: function() {
                this.showCustomLayerForm([
                        {
                            caption: 'Add layer',
                            callback: (fieldValues) => this.onCustomLayerAddClicked(fieldValues)
                        }, {
                            caption: 'Cancel',
                            callback: () => this.onCustomLayerCancelClicked()
                        }], {
                        name: 'Custom layer',
                        url: '',
                        tms: false,
                        maxZoom: 18,
                        isOverlay: false,
                        scaleDependent: false
                    }
                );
            },

            updateEnabledLayers: function() {
                const disabledLayers = [...this._allLayers, ...this._customLayers()].filter(l => !l.enabled);
                disabledLayers.forEach((l) => this._map.removeLayer(l.layer));
                [...this._layers].forEach((l) => this.removeLayer(l.layer));

                let hasBaselayerOnMap = false;
                const enabledLayers = [...this._allLayers, ...this._customLayers()].filter(l => l.enabled);
                enabledLayers.sort((l1, l2) => l1.order - l2.order);
                enabledLayers.forEach((l) => {
                        l.isOverlay ? this.addOverlay(l.layer, l.title) : this.addBaseLayer(l.layer, l.title);
                        if (!l.isOverlay && this._map.hasLayer(l.layer)) {
                              hasBaselayerOnMap = true;
                        }
                    }
                );
                // если нет активного базового слоя, включить первый, если он есть
                if (!hasBaselayerOnMap) {
                    for (let layer of enabledLayers) {
                        if (!layer.isOverlay) {
                            this._map.addLayer(layer.layer);
                            break;
                        }
                    }
                }
                this.storeEnabledLayers();
            },

            storeEnabledLayers: function() {
                const layersState = {};
                for (let layer of [...this._allLayers, ...this._customLayers()]) {
                    if (layer.isDefault || layer.enabled || layer.isCustom) {
                        layersState[layer.layer.options.code] = layer.enabled;
                    }
                }
                const serialized = JSON.stringify(layersState);
                safeLocalStorage.setItem('layersEnabled', serialized);
            },

            unserializeState: function(values) {
                if (values) {
                    values = values.map((code) => {
                        let newCode = this.loadCustomLayerFromString(code);
                        return newCode || code;
                    });
                    for (let layer of [...this._allLayers, ...this._customLayers()]) {
                        if (layer.layer.options && values.includes(layer.layer.options.code)) {
                            layer.enabled = true;
                        }
                    }
                    this.updateEnabledLayers();
                }
                this.storeEnabledLayers();
                return originalUnserializeState.call(this, values);
            },

            showCustomLayerForm: function(buttons, fieldValues) {
                if (this._customLayerWindow) {
                    return;
                }
                this._customLayerWindow =
                    L.DomUtil.create('div', 'leaflet-layers-dialog-wrapper', this._map._controlContainer);

                L.DomEvent
                    .disableClickPropagation(this._customLayerWindow)
                    .disableScrollPropagation(this._customLayerWindow);

                let customLayerWindow = L.DomUtil.create('div', 'custom-layers-window', this._customLayerWindow);
                let form = L.DomUtil.create('form', '', customLayerWindow);

                let buttonsHtml = '';
                for (let [i, button] of buttons.entries()) {
                    buttonsHtml += `<a class="button" name="btn-${i}">${button.caption}</a>`;
                }
                L.DomEvent.on(form, 'submit', L.DomEvent.preventDefault);
                form.innerHTML = `
<p><a href="http://leafletjs.com/reference-1.0.2.html#tilelayer" target="_blank">See Leaflet TileLayer documentation for url format</a></p>
<label>Layer name<br/>
<input name="name"/></label><br/>
<label>Tile url template<br/>
<textarea name="url" style="width: 100%"></textarea></label><br/>
<label><input type="radio" name="overlay" value="no">Base layer</label><br/>
<label><input type="radio" name="overlay" value="yes">Overlay</label><br/>
<label><input type="checkbox" name="scaleDependent"/>Content depends on scale(like OSM or Google maps)</label><br/>
<label><input type="checkbox" name="tms" />TMS rows order</label><br />

<label>Max zoom<br>
<select name="maxZoom">
<option value="9">9</option>
<option value="10">10</option>
<option value="11">11</option>
<option value="12">12</option>
<option value="13">13</option>
<option value="14">14</option>
<option value="15">15</option>
<option value="16">16</option>
<option value="17">17</option>
<option value="18" selected>18</option>
</select></label>
<br />
${buttonsHtml}`;

                form.name.value = fieldValues.name;
                form.url.value = fieldValues.url;
                form.tms.checked = fieldValues.tms;
                form.scaleDependent.checked = fieldValues.scaleDependent;
                form.maxZoom.value = fieldValues.maxZoom;
                form.overlay[fieldValues.isOverlay ? 1 : 0].checked = true;

                function buttonClicked(callback) {
                    var fieldValues = {
                        name: form.name.value.trim(),
                        url: form.url.value.trim(),
                        tms: form.tms.checked,
                        scaleDependent: form.scaleDependent.checked,
                        maxZoom: form.maxZoom.value,
                        isOverlay: form.querySelector('input[name="overlay"]:checked').value === 'yes'
                    };
                    callback(fieldValues);
                }

                for (let [i, button] of buttons.entries()) {

                    let buttonEl = form.querySelector(`[name="btn-${i}"]`);
                    L.DomEvent.on(buttonEl, 'click', buttonClicked.bind(this, button.callback));
                }

            },

            _addItem: function(obj) {
                var label = originalAddItem.call(this, obj);
                if (obj.layer.__customLayer) {
                    const editButton = L.DomUtil.create('div', 'custom-layer-edit-button icon-edit', label.children[0]);
                    editButton.title = 'Edit layer';
                    L.DomEvent.on(editButton, 'click', (e) => this.onCustomLayerEditClicked(obj.layer.__customLayer, e));
                }
                return label;
            },

            serializeCustomLayer: function(fieldValues) {
                let s = JSON.stringify(fieldValues);
                s = s.replace(/[\u007f-\uffff]/g,
                    function(c) {
                        return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
                    }
                );

                function encodeUrlSafeBase64(s) {
                    return btoa(s)
                        .replace(/\+/g, '-')
                        .replace(/\//g, '_');
                }

                return '-cs' + encodeUrlSafeBase64(s);
            },

            customLayerExists: function(fieldValues, ignoreLayer) {
                const serialized = this.serializeCustomLayer(fieldValues);
                for (let layer of this._customLayers()) {
                    if (layer !== ignoreLayer && layer.serialized === serialized) {
                        return layer;
                    }
                }
                return false;
            },

            checkCustomLayerValues: function(fieldValues) {
                if (!fieldValues.url) {
                    return {'error': 'Url is empty'}
                }
                if (!fieldValues.name) {
                    return {'error': 'Name is empty'}
                }
                return {};
            },

            onCustomLayerAddClicked: function(fieldValues) {
                const error = this.checkCustomLayerValues(fieldValues).error;
                if (error) {
                    notify(error);
                    return;
                }

                const duplicateLayer = this.customLayerExists(fieldValues);
                if (duplicateLayer) {
                    let msg = 'Same layer already exists';
                    if (!duplicateLayer.enabled) {
                        msg += ' but it is hidden. You can enable it in layers setting.';
                    }
                    notify(msg);
                    return;
                }

                const layer = this.createCustomLayer(fieldValues);
                layer.enabled = true;
                layer.checked = ko.observable(true);
                this._customLayers.push(layer);
                this.hideCustomLayerForm();
                this.updateEnabledLayers();
            },


            createCustomLayer: function(fieldValues, position, ignoreExists) {
                const serialized = this.serializeCustomLayer(fieldValues);
                const tileLayer = L.tileLayer(fieldValues.url, {
                        tms: fieldValues.tms,
                        maxNativeZoom: fieldValues.maxZoom,
                        scaleDependent: fieldValues.scaleDependent,
                        print: true,
                        jnx: true,
                        code: serialized,
                        noCors: true
                    }
                );

                const customLayer = {
                    title: fieldValues.name,
                    isOverlay: fieldValues.isOverlay,
                    isDefault: false,
                    isCustom: true,
                    serialized: serialized,
                    layer: tileLayer,
                    order: 10000,
                    fieldValues: fieldValues,
                    enabled: true,
                    checked: ko.observable(true)
                };
                tileLayer.__customLayer = customLayer;
                return customLayer;
            },

            onCustomLayerCancelClicked: function() {
                this.hideCustomLayerForm();
            },

            hideCustomLayerForm: function() {
                if (!this._customLayerWindow) {
                    return;
                }
                this._customLayerWindow.parentNode.removeChild(this._customLayerWindow);
                this._customLayerWindow = null;
            },

            onCustomLayerEditClicked: function(layer, e) {
                L.DomEvent.stop(e);
                this.showCustomLayerForm([
                        {caption: 'Save', callback: (fieldValues) => this.onCustomLayerChangeClicked(layer, fieldValues)},
                        {caption: 'Delete', callback: (fieldValues) => this.onCustomLayerDeletelClicked(layer)},
                        {caption: 'Cancel', callback: () => this.onCustomLayerCancelClicked()}
                    ], layer.fieldValues
                );
            },

            onCustomLayerChangeClicked: function(layer, newFieldValues) {
                const error = this.checkCustomLayerValues(newFieldValues).error;
                if (error) {
                    notify(error);
                    return;
                }
                const duplicateLayer = this.customLayerExists(newFieldValues, layer);
                if (duplicateLayer) {
                    let msg = 'Same layer already exists';
                    if (!duplicateLayer.enabled) {
                        msg += ' but it is hidden. You can enable it in layers setting.';
                    }
                    notify(msg);
                    return;
                }

                const layerPos = this._customLayers.indexOf(layer);
                this._customLayers.remove(layer);

                const newLayer = this.createCustomLayer(newFieldValues);
                this._customLayers.splice(layerPos, 0, newLayer);
                if (this._map.hasLayer(layer.layer) && (!layer.isOverlay || newLayer.isOverlay)) {
                    this._map.addLayer(newLayer.layer);
                }
                this._map.removeLayer(layer.layer);
                this.updateEnabledLayers();
                this.hideCustomLayerForm();
            },

            onCustomLayerDeletelClicked: function(layer) {
                this._map.removeLayer(layer.layer);
                this._customLayers.remove(layer);
                this.updateEnabledLayers();
                this.hideCustomLayerForm();
            },

            loadCustomLayerFromString: function(s) {
                let fieldValues;
                const m = s.match(/^-cs(.+)$/);
                if (m) {
                    s = m[1].replace(/-/g, '+').replace(/_/g, '/');
                    try {
                        s = atob(s);
                        fieldValues = JSON.parse(s);
                    } catch (e) {
                    }

                    if (fieldValues) {
                        if (!this.customLayerExists(fieldValues)) {
                            this._customLayers.push(this.createCustomLayer(fieldValues));
                        }
                        return this.serializeCustomLayer(fieldValues);
                    }

                }
            }


        }
    );
    if (control._map) {
        control.__injectConfigButton()
    }
    control._initializeLayersState();
}


export default enableConfig;