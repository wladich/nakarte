function arrayItemsEqual(l1, l2) {
    l1 = l1 || [];
    l2 = l2 || [];
    if (l1.length !== l2.length)
        return false;
    for (var i = 0; i < l1.length; i++) {
        if (l1[i] !== l2[i]) {
            return false;
        }
    }
    return true;
}

const hashState = {
    _listeners: [],
    _state: {},

    addEventListener: function(key, callback) {
        for (let [k, c] of this._listeners) {
            if (k === key && c === callback) {
                return;
            }
        }
        this._listeners.push([key, callback]);
    },

    removeEventListener: function(key, callback) {
        this._listeners.forEach(([k, c], i) => {
                if (k === key && c === callback) {
                    this._listeners.splice(i, 1);
                    return;
                }
            }
        );
    },

    updateState: function(key, values) {
        this._state[key] = values;
        this._saveStateToHash();
    },

    getState: function(key) {
        return this._state[key];
    },

    _parseHash: function() {
        let hash = location.hash;
        const args = {},
             i = hash.indexOf('#');
        if (i >= 0) {
            hash = hash.substr(i + 1).trim();
            let m, key, value;
            for (let pair of hash.split('&')) {
                m = /(.+?)=(.+)/.exec(pair);
                if (m) {
                    [, key, value] = m;
                    value = value.split('/');
                    value = value.map(decodeURIComponent);
                    args[key] = value;
                }
            }
        }
        return args;
    },

    _saveStateToHash: function() {
        var stateItems = [];
        for (let key of Object.keys(this._state)) {
            if (this._state[key].length) {
                var values = this._state[key].join('/');
                stateItems.push(key + '=' + values);
            }
        }
        var hashString = '#' + stateItems.join('&');
        location.replace(hashString);
    },


    onHashChanged: function() {
        const newState = this._parseHash();
        const changedKeys = {};
        for (let key of Object.keys(newState)) {
            if (!arrayItemsEqual(newState[key], this._state[key])) {
                changedKeys[key] = 1;
            }
        }

        for (let key of Object.keys(this._state)) {
            if (! (key in newState)) {
                changedKeys[key] = 1;
            }
        }

        for (let [key, callback] of this._listeners) {
            if (key in changedKeys) {
                // setTimeout(callback.bind(null, newState[key]), 0);

                callback(newState[key]);
            }
        }
        this._state = newState;
    }
};

window.addEventListener('hashchange', hashState.onHashChanged.bind(hashState));
hashState.onHashChanged();

export default hashState;

