import L from 'leaflet';
import './style.css';
import enableTopRow from 'lib/leaflet.control.layers.top-row';
import ko from 'knockout';


function enableConfig(control, layers) {
    const originalOnAdd = control.onAdd;
    const originalUnserializeState = control.unserializeState;
    if (control._configEnabled) {
        return;
    }
    enableTopRow(control);

    L.Util.extend(control, {
            configEnabled: true,
            _allLayersGroups: layers,
            _allLayers: [].concat(...layers.map(group => group.layers)),

            onAdd: function(map) {
                const container = originalOnAdd.call(this, map);
                this.__injectConfigButton();
                return container;
            },

            __injectConfigButton: function() {
                const configButton = L.DomUtil.create('div', 'button-config');
                configButton.innerHTML = 'More layers';
                this._topRow.appendChild(configButton);
                L.DomEvent.on(configButton, 'click', this._onConfigButtonClick, this);
            },

            _initializeLayersState: function() {
                let storedLayersEnabled = {};
                if (window.localStorage) {
                    const serialized = window.localStorage.getItem('layersEnabled');
                    if (serialized) {
                        try {
                            storedLayersEnabled = JSON.parse(serialized);
                        } catch (e) {
                        }
                    }
                }
                for (let layer of this._allLayers) {
                    // TODO: check if state is stored in localStorage, else
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
                this.storeEnabledLayers();
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
                    L.DomUtil.create('div', 'leaflet-layers-select-window-wrapper');
                L.DomEvent.disableClickPropagation(container);
                if (!L.Browser.touch) {
                    L.DomEvent.disableScrollPropagation(container);
                }
                container.innerHTML = `
<div class="leaflet-layers-select-window">
    <form data-bind="foreach: _allLayersGroups">
        <div class="section-header" data-bind="html: group"></div>
        <!-- ko foreach: layers -->
            <label>
                <input type="checkbox" data-bind="checked: checked"/>
                <span data-bind="text: title">
                </span><!--  ko if: description -->: 
                <span data-bind="html: description || ''"></span>
                <!-- /ko -->
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
                this._allLayers.forEach(layer => layer.checked(layer.enabled));
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
                this._allLayers.forEach(layer => layer.checked(layer.isDefault))
            },

            onSelectWindowOkClicked: function() {
                this._allLayers.forEach(layer => layer.enabled = layer.checked())
                this.updateEnabledLayers();
                this.hideSelectWindow();
                this.storeEnabledLayers();
            },

            updateEnabledLayers: function() {
                const layersOnMap = [];
                while (this._layers.length) {
                    let layer = this._layers[0];
                    if (this._map.hasLayer(layer.layer)) {
                        layersOnMap.push(layer.layer);
                    }
                    this.removeLayer(layer.layer);
                    this._map.removeLayer(layer.layer);
                }

                let hasBaselayerOnMap = false;
                const enabledLayers = [];
                for (let layer of this._allLayers) {
                    if (layer.enabled) {
                        enabledLayers.push(layer);
                    }
                }
                enabledLayers.sort((l1, l2) => l1.order - l2.order);
                enabledLayers.forEach((l) => {
                        l.isOverlay ? this.addOverlay(l.layer, l.title) : this.addBaseLayer(l.layer, l.title);
                        if (layersOnMap.includes(l.layer)) {
                            this._map.addLayer(l.layer);
                            hasBaselayerOnMap = hasBaselayerOnMap || !l.isOverlay;
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

            },

            storeEnabledLayers: function() {
                if (!window.localStorage) {
                    return;
                }
                const layersState = {};
                for (let layer of this._allLayers) {
                    if (layer.isDefault || layer.enabled) {
                        layersState[layer.layer.options.code] = layer.enabled;
                    }
                }
                const serialized = JSON.stringify(layersState);
                localStorage.setItem('layersEnabled', serialized);
            },

            unserializeState: function(values) {
                if (values) {
                    for (let layer of this._allLayers) {
                        if (layer.layer.options && values.includes(layer.layer.options.code)) {
                            layer.enabled = true;
                        }
                    }
                    this.updateEnabledLayers();
                }
                this.storeEnabledLayers();
                return originalUnserializeState.call(this, values);
            }

        }
    );
    if (control._map) {
        control.__injectConfigButton()
    }
    control._initializeLayersState();
}


export default enableConfig;