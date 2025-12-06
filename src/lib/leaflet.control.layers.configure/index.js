import L from 'leaflet';
import './style.css';
import enableTopRow from '~/lib/leaflet.control.layers.top-row';
import ko from 'knockout';
import {notify} from '~/lib/notifications';
import * as logging from '~/lib/logging';
import safeLocalStorage from '~/lib/safe-localstorage';
import './customLayer';

function getLayerDefaultHotkey(layer) {
    const layerOptions = layer?.layer.options;
    if (!layerOptions) {
        return null;
    }
    if (layerOptions.hotkey) {
        return layerOptions.hotkey;
    }
    if (layerOptions.code?.length === 1) {
        return layerOptions.code;
    }
    return null;
}

class LayersConfigDialog {
    constructor(builtInLayers, customLayers, withHotkeys, cbOk) {
        this.builtInLayers = builtInLayers;
        this.customLayers = customLayers;
        this.withHotkeys = withHotkeys;
        this.cbOk = cbOk;

        this.visible = ko.observable(false);
        this.layerGroups = ko.observableArray([]);

        this.initWindow();
    }

    allLayers() {
        return [
            ...([].concat(...this.builtInLayers.map((group) => group.layers))),
            ...this.customLayers
        ];
    }

    allLayerModels() {
        return [].concat(...this.layerGroups().map((group) => group.layers()));
    }

    initWindow() {
        const container = this.window =
            L.DomUtil.create('div', 'leaflet-layers-dialog-wrapper');
        L.DomEvent
            .disableClickPropagation(container)
            .disableScrollPropagation(container);
        container.setAttribute('data-bind', "visible: visible");
        container.innerHTML = `
<div class="leaflet-layers-config-window">
    <form>
        <!-- ko foreach: layerGroups -->
            <div class="section-header" data-bind="html: group"></div>
            <!-- ko foreach: layers -->
                <label class="layer-label">
                    <input type="checkbox" class="layer-enabled-checkbox" data-bind="checked: enabled"/>
                    <span data-bind="text: title"></span>
                    <!-- ko if: $root.withHotkeys -->
                    <div class="hotkey-input"
                        title="Change hotkey"
                        tabindex="0"
                        data-bind="
                            text: hotkey,
                            event: {
                                keyup: $root.onHotkeyInput.bind($root),
                                keypress: function() {},
                                click: function(_, e) {e.target.focus()},
                                blur: function() {error(null)},
                            },
                            clickBubble: false,
                            keypressBubble: false,
                            keyupBubble: false">
                    ></div>
                    <div class="error" data-bind="text: error, visible: error"></div>
                    <!-- /ko -->
                </label>
            <!-- /ko -->
        <!-- /ko -->
    </form>
    <div class="buttons-row">
        <div href="#" class="button" data-bind="click: onOkClicked">Ok</div>
        <div href="#" class="button" data-bind="click: onCancelClicked">Cancel</div>
        <div href="#" class="button" data-bind="click: onResetClicked">Reset</div>
    </div>
</div>
                `;
        ko.applyBindings(this, container);
    }

    getWindow() {
        return this.window;
    }

    showDialog() {
        this.updateModelFromLayers();
        this.visible(true);
    }

    updateModelFromLayers() {
        this.layerGroups.removeAll();
        for (const group of this.builtInLayers) {
            this.layerGroups.push({
                group: group.group,
                layers: ko.observableArray(
                    group.layers.map((l) => ({
                        title: l.title,
                        enabled: ko.observable(l.enabled),
                        hotkey: ko.observable(l.layer.hotkey),
                        origLayer: l,
                        error: ko.observable(null),
                    }))
                ),
            });
        }
        if (this.customLayers.length) {
            this.layerGroups.push({
                group: 'Custom layers',
                layers: ko.observableArray(
                    this.customLayers.map((l) => ({
                        title: l.title,
                        enabled: ko.observable(l.enabled),
                        hotkey: ko.observable(l.layer.hotkey),
                        origLayer: l,
                        error: ko.observable(null),
                    }))
                ),
            });
        }
    }

    updateLayersFromModel() {
        for (const layer of this.allLayerModels()) {
            layer.origLayer.enabled = layer.enabled();
            layer.origLayer.layer.hotkey = layer.hotkey();
        }
    }

    getLayersEnabledOnlyInModel() {
        const newLayers = [];
        for (const layer of this.allLayerModels()) {
            if (layer.enabled() && !layer.origLayer.enabled) {
                newLayers.push(layer.origLayer);
            }
        }
        return newLayers;
    }

    onOkClicked() {
        const newEnabledLayers = this.getLayersEnabledOnlyInModel();
        this.updateLayersFromModel();
        this.visible(false);
        this.cbOk(newEnabledLayers);
    }

    onCancelClicked() {
        this.visible(false);
    }

    onResetClicked() {
        for (const layer of this.allLayerModels()) {
            layer.enabled(layer.origLayer.isDefault);
            layer.hotkey(getLayerDefaultHotkey(layer.origLayer));
        }
    }

    displayError(message, layerModel, event) {
        layerModel.error(message);

        setTimeout(() => {
            event.target.parentNode.querySelector('.error')
                .scrollIntoView({block: 'nearest', behavior: 'smooth'});
        }, 0);
    }

    onHotkeyInput(layerModel, event) {
        layerModel.error(null);
        if (['Delete', 'Backspace', 'Space'].includes(event.code)) {
            layerModel.hotkey(null);
            return;
        }

        if (/Enter|Escape/u.test(event.code)) {
            event.target.blur();
            return;
        }

        if (/Alt|Shift|Control|Tab|Lock|Meta|ContextMenu|Lang|Arrow/u.test(event.code)) {
            return;
        }
        const match = /^(Key|Digit)(.)/u.exec(event.code);
        if (!match) {
            this.displayError('Only keys A-Z and 0-9 can be used for hotkeys.', layerModel, event);
            return;
        }
        const newHotkey = match[2];
        for (const layer of this.allLayerModels()) {
            if (layer !== layerModel && layer.hotkey() === newHotkey) {
                this.displayError(`Hotkey "${newHotkey}" is already used by layer "${layer.title}"`, layerModel, event);
                return;
            }
        }
        layerModel.hotkey(newHotkey);
    }
}

function enableConfig(control, {layers, customLayersOrder}, options = {withHotkeys: true}) {
    if (control._configEnabled) {
        return;
    }

    enableTopRow(control);

    const originalOnAdd = control.onAdd;
    const originalUnserializeState = control.unserializeState;
    const originalAddItem = control._addItem;

    L.Util.extend(control, {
            _configEnabled: true,
            _builtinLayersByGroup: layers,
            _builtinLayers: [].concat(...layers.map((group) => group.layers)),
            _customLayers: [],
            _withHotkeys: options.withHotkeys,

            onAdd: function(map) {
                const container = originalOnAdd.call(this, map);
                this.__injectConfigButton();
                this.initLayersConfigWindow();
                this.loadSettings();
                return container;
            },

            allLayers: function() {
                return [...this._builtinLayers, ...this._customLayers];
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

            migrateSetting: function() {
                let oldSettings;
                let newSettings;
                try {
                    oldSettings = JSON.parse(safeLocalStorage.getItem('layersEnabled'));
                } catch {
                    // consider empty
                }
                try {
                    newSettings = JSON.parse(safeLocalStorage.getItem('leafletLayersSettings'));
                } catch {
                    // consider empty
                }

                if (!oldSettings || newSettings) {
                    return;
                }

                const layersSettings = [];
                for (let [code, isEnabled] of Object.entries(oldSettings)) {
                    layersSettings.push({
                        code,
                        isCustom: Boolean(code.match(/^-cs(.+)$/u)),
                        enabled: isEnabled,
                    });
                }
                const settings = {layers: layersSettings};
                safeLocalStorage.setItem('leafletLayersSettings', JSON.stringify(settings));
            },

        loadSettings: function() {
                this.migrateSetting();
                // load settings from storage
                const serialized = safeLocalStorage.getItem('leafletLayersSettings');
                let settings = {};
                if (serialized) {
                    try {
                        settings = JSON.parse(serialized);
                    } catch (e) {
                        logging.captureMessage('Failed to load layers settings from localstorage - invalid json', {
                            "localstorage.leafletLayersSettings": serialized.slice(0, 1000)
                        });
                    }
                }
                const layersSettings = settings.layers ?? [];

                // load custom layers;
                for (const layerSettings of layersSettings) {
                    if (layerSettings.isCustom) {
                        // custom layers can be upgraded in loadCustomLayerFromString and their code will change
                        const newCode = this.loadCustomLayerFromString(String(layerSettings.code));
                        if (newCode) {
                            layerSettings.code = newCode;
                        } else {
                            logging.captureMessage(
                                `Failed to load custom layer from local storage record: "${layerSettings.code}"`
                            );
                        }
                    }
                }

                // apply settings to layers
                const layersSettingsByCode = {};
                layersSettings.forEach((it) => {
                    layersSettingsByCode[it.code] = it;
                });

                for (let layer of this.allLayers()) {
                    const layerSettings = layersSettingsByCode[layer.layer.options.code] ?? {};
                    // if storage is empty enable only default layers
                    // if new default layer appears it will be enabled
                    layer.enabled = layerSettings.enabled ?? layer.isDefault;
                    layer.layer.hotkey = layerSettings.hotkey || getLayerDefaultHotkey(layer);
                }
                this.updateLayers();
            },

            _onConfigButtonClick: function() {
                if (this._layersConfigDialog.visible() || this._customLayerWindow) {
                    return;
                }
                this._layersConfigDialog.showDialog();
            },

            initLayersConfigWindow: function() {
                this._layersConfigDialog = new LayersConfigDialog(
                    this._builtinLayersByGroup,
                    this._customLayers,
                    this._withHotkeys,
                    this.onConfigDialogOkClicked.bind(this),
                );
                this._map._controlContainer.appendChild(this._layersConfigDialog.getWindow());
            },

            onConfigDialogOkClicked: function(addedLayers) {
                this.updateLayers(addedLayers);
            },

            onCustomLayerCreateClicked: function() {
                this.showCustomLayerForm(
                    [
                        {
                            caption: 'Add layer',
                            callback: (fieldValues) => this.onCustomLayerAddClicked(fieldValues)
                        },
                        {
                            caption: 'Cancel',
                            callback: () => this.onCustomLayerCancelClicked()
                        }
                    ],
                    {
                        name: 'Custom layer',
                        url: '',
                        tms: false,
                        maxZoom: 18,
                        isOverlay: false,
                        scaleDependent: false,
                        isTop: true
                    }
                );
            },

            updateLayersListControl: function(addedLayers) {
                const disabledLayers = this.allLayers().filter((l) => !l.enabled);
                disabledLayers.forEach((l) => this._map.removeLayer(l.layer));
                [...this._layers].forEach((l) => this.removeLayer(l.layer));

                let hasBaselayerOnMap = false;
                const enabledLayers = this.allLayers().filter((l) => l.enabled);
                enabledLayers.sort((l1, l2) => l1.order - l2.order);
                enabledLayers.forEach((l) => {
                        l.layer._justAdded = addedLayers && addedLayers.includes(l);
                        const {layer: {options: {isOverlay}}} = l;
                        if (isOverlay) {
                            this.addOverlay(l.layer, l.title);
                        } else {
                            this.addBaseLayer(l.layer, l.title);
                        }
                        if (!isOverlay && this._map.hasLayer(l.layer)) {
                            hasBaselayerOnMap = true;
                        }
                    }
                );
                // если нет активного базового слоя, включить первый, если он есть
                if (!hasBaselayerOnMap) {
                    for (let layer of enabledLayers) {
                        if (!layer.layer.options.isOverlay) {
                            this._map.addLayer(layer.layer);
                            break;
                        }
                    }
                }
            },

            updateLayers: function(addedLayers) {
                this.updateLayersListControl(addedLayers);
                this.saveSettings();
            },

            saveSettings: function() {
                const layersSettings = [];

                for (let layer of this.allLayers()) {
                    layersSettings.push({
                        code: layer.layer.options.code,
                        isCustom: layer.isCustom,
                        enabled: layer.enabled,
                        hotkey: layer.layer.hotkey,
                    });
                }
                const settings = {layers: layersSettings};
                safeLocalStorage.setItem('leafletLayersSettings', JSON.stringify(settings));
            },

            unserializeState: function(values) {
                if (values) {
                    values = values.map((code) => {
                        let newCode = this.loadCustomLayerFromString(code);
                        return newCode || code;
                    });
                    for (let layer of this.allLayers()) {
                        if (layer.layer.options && values.includes(layer.layer.options.code)) {
                            layer.enabled = true;
                        }
                    }
                    this.updateLayers();
                }
                return originalUnserializeState.call(this, values);
            },

            showCustomLayerForm: function(buttons, fieldValues) {
                if (this._customLayerWindow || this._configWindowVisible) {
                    return;
                }
                this._customLayerWindow =
                    L.DomUtil.create('div', 'leaflet-layers-dialog-wrapper', this._map._controlContainer);

                L.DomEvent
                    .disableClickPropagation(this._customLayerWindow)
                    .disableScrollPropagation(this._customLayerWindow);

                let customLayerWindow = L.DomUtil.create('div', 'custom-layers-window', this._customLayerWindow);
                let form = L.DomUtil.create('form', '', customLayerWindow);
                L.DomEvent.on(form, 'submit', L.DomEvent.preventDefault);

                const dialogModel = {
                    name: ko.observable(fieldValues.name),
                    url: ko.observable(fieldValues.url),
                    tms: ko.observable(fieldValues.tms),
                    scaleDependent: ko.observable(fieldValues.scaleDependent),
                    maxZoom: ko.observable(fieldValues.maxZoom),
                    isOverlay: ko.observable(fieldValues.isOverlay),
                    isTop: ko.observable(fieldValues.isTop),
                    buttons: buttons,
                    buttonClicked: function buttonClicked(callbackN) {
                        const fieldValues = {
                            name: dialogModel.name().trim(),
                            url: dialogModel.url().trim(),
                            tms: dialogModel.tms(),
                            scaleDependent: dialogModel.scaleDependent(),
                            maxZoom: dialogModel.maxZoom(),
                            isOverlay: dialogModel.isOverlay(),
                            isTop: dialogModel.isTop()
                        };
                        buttons[callbackN].callback(fieldValues);
                    }
                };

/* eslint-disable max-len */
                const formHtml = `
<p><a class="doc-link" href="https://leafletjs.com/reference-1.0.3.html#tilelayer" target="_blank">See Leaflet TileLayer documentation for url format</a></p>
<label>Layer name<br/>
<span class="hint">Maximum 40 characters</span><br/>
<input maxlength="40" class="layer-name" data-bind="value: name"/></label><br/>
<label>Tile url template<br/><textarea data-bind="value: url" class="layer-url"></textarea></label><br/>
<label><input type="radio" name="overlay" data-bind="checked: isOverlay, checkedValue: false">Base layer</label><br/>
<label><input type="radio" name="overlay" data-bind="checked: isOverlay, checkedValue: true">Overlay</label><br/>
<hr/>
<label><input type="radio" name="top-or-bottom"
        data-bind="checked: isTop, checkedValue: false, enable: isOverlay">Place below other layers</label><br/>
<label><input type="radio" name="top-or-bottom"
        data-bind="checked: isTop, checkedValue: true, enable: isOverlay">Place above other layers</label><br/>
<hr/>
<label><input type="checkbox" data-bind="checked: scaleDependent"/>Content depends on scale(like OSM or Google maps)</label><br/>
<label><input type="checkbox" data-bind="checked: tms" />TMS rows order</label><br />

<label>Max zoom<br>
<select data-bind="options: [9,10,11,12,13,14,15,16,17,18], value: maxZoom"></select></label>
<div data-bind="foreach: buttons">
    <a class="button" data-bind="click: $root.buttonClicked.bind(null, $index()), text: caption"></a>
</div>`;
/* eslint-enable max-len */
                form.innerHTML = formHtml;
                ko.applyBindings(dialogModel, form);
            },

            _addItem: function(obj) {
                var label = originalAddItem.call(this, obj);
                if (obj.layer.__customLayer) {
                    const editButton = L.DomUtil.create('div', 'custom-layer-edit-button icon-edit', label.children[0]);
                    editButton.title = 'Edit layer';
                    L.DomEvent.on(editButton, 'click', (e) =>
                        this.onCustomLayerEditClicked(obj.layer.__customLayer, e)
                    );
                }
                if (obj.layer._justAdded) {
                    L.DomUtil.addClass(label, 'leaflet-layers-configure-just-added-1');
                    setTimeout(() => {
                        L.DomUtil.addClass(label, 'leaflet-layers-configure-just-added-2');
                    }, 0);
                }
                return label;
            },

            serializeCustomLayer: function(fieldValues) {
                let s = JSON.stringify(fieldValues);
                s = s.replace(/[\u007f-\uffff]/ug,
                    function(c) {
                        return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
                    }
                );

                function encodeUrlSafeBase64(s) {
                    return btoa(s)
                        .replace(/\+/ug, '-')
                        .replace(/\//ug, '_');
                }

                return '-cs' + encodeUrlSafeBase64(s);
            },

            customLayerExists: function(fieldValues, ignoreLayer) {
                const serialized = this.serializeCustomLayer(fieldValues);
                for (let layer of this._customLayers) {
                    if (layer !== ignoreLayer && layer.serialized === serialized) {
                        return layer;
                    }
                }
                return false;
            },

            checkCustomLayerValues: function(fieldValues) {
                if (!fieldValues.url) {
                    return {error: 'Url is empty'};
                }
                if (!fieldValues.name) {
                    return {error: 'Name is empty'};
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
                this._customLayers.push(layer);
                this.hideCustomLayerForm();
                this.updateLayers();
            },

            createCustomLayer: function(fieldValues) {
                const serialized = this.serializeCustomLayer(fieldValues);
                const tileLayer = new L.Layer.CustomLayer(fieldValues.url, {
                        isOverlay: fieldValues.isOverlay,
                        tms: fieldValues.tms,
                        maxNativeZoom: fieldValues.maxZoom,
                        scaleDependent: fieldValues.scaleDependent,
                        print: true,
                        jnx: true,
                        code: serialized,
                        noCors: true,
                        isTop: fieldValues.isTop
                    }
                );

                const customLayer = {
                    title: fieldValues.name,
                    isDefault: false,
                    isCustom: true,
                    serialized: serialized,
                    layer: tileLayer,
                    order:
                        (fieldValues.isOverlay && fieldValues.isTop) ? customLayersOrder.top : customLayersOrder.bottom,
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
                    {
                        caption: 'Save',
                        callback: (fieldValues) => this.onCustomLayerChangeClicked(layer, fieldValues),
                    },
                    {caption: 'Delete', callback: () => this.onCustomLayerDeleteClicked(layer)},
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

                const newLayer = this.createCustomLayer(newFieldValues);
                newLayer.layer.hotkey = layer.layer.hotkey;
                this._customLayers.splice(this._customLayers.indexOf(layer), 1, newLayer);
                const newLayerVisible = (
                    this._map.hasLayer(layer.layer) &&
                    // turn off layer if changing from overlay to baselayer
                    (!layer.layer.options.isOverlay || newLayer.layer.options.isOverlay)
                );
                if (newLayerVisible) {
                    this._map.addLayer(newLayer.layer);
                }
                this._map.removeLayer(layer.layer);
                this.updateLayers();
                if (newLayerVisible) {
                    newLayer.layer.fire('add');
                }
                this.hideCustomLayerForm();
            },

            onCustomLayerDeleteClicked: function(layer) {
                this._map.removeLayer(layer.layer);
                this._customLayers.splice(this._customLayers.indexOf(layer), 1);
                this.updateLayers();
                this.hideCustomLayerForm();
            },

            loadCustomLayerFromString: function(s) {
                let fieldValues;
                const m = s.match(/^-cs(.+)$/u);
                if (m) {
                    s = m[1].replace(/-/ug, '+').replace(/_/ug, '/');
                    try {
                        s = atob(s);
                        fieldValues = JSON.parse(s);
                    } catch (e) {
                        // ignore malformed data
                    }

                    if (fieldValues) {
                        // upgrade
                        if (fieldValues.isTop === undefined) {
                            fieldValues.isTop = true;
                        }
                        if (!this.customLayerExists(fieldValues)) {
                            this._customLayers.push(this.createCustomLayer(fieldValues));
                        }
                        return this.serializeCustomLayer(fieldValues);
                    }
                }
                return null;
            }
        }
    );
}

export default enableConfig;
