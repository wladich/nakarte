import L from 'leaflet';
import {hashState} from './hashState';
import * as logging from '~/lib/logging';

L.Mixin.HashState = {
    enableHashState: function(key, defaultInitialState = null) {
        this._hashStateKey = key;
        const eventSource = this.stateChangeEventsSource ? this[this.stateChangeEventsSource] : this;

        // setup event listeners
        if (this.stateChangeEvents) {
            this.stateChangeEvents.forEach((event) => {
                    eventSource.on(event, this._onControlStateChanged, this);
                }
            );
        }

        hashState.addEventListener(key, (state) => this._onExternalStateChanged(state));

        // initialize control state from hash

        const state = hashState.getState(key) || defaultInitialState;
        if (!state || !this.unserializeState(state)) {
            this.unserializeState(defaultInitialState);
        }
        hashState.updateState(this._hashStateKey, this.serializeState());
        return this;
    },

    _onControlStateChanged: function() {
        const state = this.serializeState();
        hashState.updateState(this._hashStateKey, state);
    },

    _onExternalStateChanged: function(state) {
        if (!this.unserializeState(state)) { // state from hash is invalid, update hash from component state
            logging.captureMessage(`Invalid state in hash string (key "${this._hashStateKey}")`);
            hashState.updateState(this._hashStateKey, this.serializeState());
        }
    }

    // TODO: disableHashState
};
