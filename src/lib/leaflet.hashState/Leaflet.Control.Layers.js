import L from 'leaflet';
import './leaflet.hashState';

L.Control.Layers.include(L.Mixin.HashState);

L.Control.Layers.include({
        stateChangeEvents: ['baselayerchange', 'overlayadd', 'overlayremove'],
        stateChangeEventsSource: '_map',

        serializeState: function(e) {
            const state = [];

            this._map.eachLayer((layer) => {
                    let key = layer.options.code;
                    if (key) {
                        state.push(key);
                    }
                }
            );
            return state;
        },

        unserializeState: function(values) {
            if (!values || values.length === 0) {
                return false;
            }

            for (let layer of this._layers) {
                if (values.includes(layer.layer.options.code)) {
                    this._map.addLayer(layer.layer);
                } else {
                    this._map.removeLayer(layer.layer);
                }
            }
            return true;
        }
    }
);

