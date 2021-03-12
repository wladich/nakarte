import L from 'leaflet';
import './leaflet.hashState';

L.Control.Layers.include(L.Mixin.HashState);

L.Control.Layers.include({
        stateChangeEvents: ['baselayerchange', 'overlayadd', 'overlayremove'],
        stateChangeEventsSource: '_map',

        serializeState: function() {
            const keys = [];
            this._map.eachLayer((layer) => {
                    let key = layer.options.code;
                    if (key) {
                        keys.push([key, layer.options.zIndex]);
                    }
                }
            );
            keys.sort((k1, k2) => k1[1] - k2[1]);
            const state = keys.map((k) => k[0]);
            return state;
        },

        unserializeState: function(values) {
            if (!values || values.length === 0) {
                return false;
            }

            let hasBaselayer;
            for (let layer of this._layers) {
                if (layer.layer.options && values.includes(layer.layer.options.code) && !layer.overlay) {
                    hasBaselayer = true;
                    break;
                }
            }

            if (!hasBaselayer) {
                return false;
            }

            for (let layer of this._layers) {
                if (layer.layer.options && !values.includes(layer.layer.options.code)) {
                    this._map.removeLayer(layer.layer);
                }
            }
            for (let layer of this._layers) {
                if (layer.layer.options && values.includes(layer.layer.options.code)) {
                    this._map.addLayer(layer.layer);
                }
            }
            return true;
        }
    }
);

