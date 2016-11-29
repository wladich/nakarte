import L from 'leaflet';
import hashState from './hashState';

L.Mixin.HashState = {
    enableHashState: function(key, defaultInitialState = null) {
        this._hashStateKey = key;
        const eventSource = this.stateChangeEventsSource ? this[this.stateChangeEventsSource] : this;

        // setup event listeners
        this.stateChangeEvents.forEach((event) => {
                eventSource.on(event, this._onControlStateChanged, this);
            }
        );

        hashState.addEventListener(key, (state) => this._onExternalStateChanged(state));

        // initialize control state from hash

        const state = hashState.getState(key) || defaultInitialState;
        this._ignoreStateChange = true;
        if (!this.unserializeState(state) && !this.unserializeState(defaultInitialState)) { // state from hash is invalid, update hash from default state
            hashState.updateState(key, this.serializeState());
        }
        hashState.updateState(this._hashStateKey, this.serializeState());
        this._ignoreStateChange = false;

        return this;
    },

    _onControlStateChanged: function() {
        if (this._ignoreStateChange) {
            return;
        }
        hashState.updateState(this._hashStateKey, this.serializeState());
    },

    _onExternalStateChanged: function(state) {
        this._ignoreStateChange = true;
        if (!this.unserializeState(state)) { // state from hash is invalid, update hash from component state
            hashState.updateState(this._hashStateKey, this.serializeState());
        }
        this._ignoreStateChange = false;
    }


    // TODO: disableHashState
};