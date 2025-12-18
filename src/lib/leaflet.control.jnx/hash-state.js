import L from 'leaflet';
import '~/lib/leaflet.hashState/leaflet.hashState';

L.Control.JNX.include(L.Mixin.HashState);
L.Control.JNX.include({
        stateChangeEvents: ['settingschange'],

        serializeState: function() {
            let state;
            if (this._areaSelector) {
                const bounds = this._areaSelector.getBounds();
                state = [
                    bounds.getSouth().toFixed(5),
                    bounds.getWest().toFixed(5),
                    bounds.getNorth().toFixed(5),
                    bounds.getEast().toFixed(5),
                    this.zoomLevel() ?? '',
                    this.fixZoom() ? '1' : '0',
                ];
            }
            return state;
        },

        unserializeState: function(values) {
            function validateFloat(value) {
                value = parseFloat(value);
                if (isNaN(value)) {
                    throw new Error('INVALID VALUE');
                }
                return value;
            }

            function validateFloatRange(value, min, max) {
                value = validateFloat(value);
                if (value < min || value > max) {
                    throw new Error('INVALID VALUE');
                }
                return value;
            }

            if (values && values.length >= 4) {
                let south, west, north, east;
                try {
                        south = validateFloatRange(values[0], -86, 86);
                        west = validateFloat(values[1]);
                        north = validateFloatRange(values[2], -86, 86);
                        east = validateFloat(values[3]);
                } catch (e) {
                    if (e.message === 'INVALID VALUE') {
                        return false;
                    }
                    throw e;
                }
                this.setAreaSelector([[south, west], [north, east]]);

                let zoomLevel = parseInt(values[4], 10);
                if (!this.zoomChoices()?.[zoomLevel]) {
                    zoomLevel = null;
                }
                this.zoomLevel(zoomLevel);

                this.fixZoom(values[5] === '1');

                return true;
            }
            return false;
        }
    }
);
