import L from 'leaflet';
import hashState from './hashState';

L.Mixin.HashState = {
    enableHashState: function(key, defaultInitialState = null) {
        this._hashStateKey = key;
        const eventSource = this.stateChangeEventsSource ? this[this.stateChangeEventsSource] : this;
        this.stateChangeEvents.forEach((event) => {
                eventSource.on(event, this.updateHashState, this);
            }
        );

        hashState.addEventListener(key, (state) => {
                if (!this.unserializeState(state)) { // state from hash is invalid, update hash from component state
                    hashState.updateState(key, this.serializeState());
                }
            }
        );

        const state = hashState.getState(key) || defaultInitialState;
        if (state) {
            if (!this.unserializeState(state) && !this.unserializeState(defaultInitialState)) { // state from hash is invalid, update hash from default state
                hashState.updateState(key, this.serializeState());
            }
        }
        return this;
    },

    updateHashState: function(state) {
        hashState.updateState(this._hashStateKey, this.serializeState());
    }

    // TODO: disableHashState
};