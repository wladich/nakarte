function arrayItemsEqual(l1, l2) {
    if (l1.length !== l2.length) {
        return false;
    }
    for (var i = 0; i < l1.length; i++) {
        if (l1[i] !== l2[i]) {
            return false;
        }
    }
    return true;
}

function parseHashParams(s) {
    const args = {},
        i = s.indexOf('#');
    if (i >= 0) {
        s = s.substr(i + 1).trim();
        let m, key, value;
        for (let pair of s.split('&')) {
            m = /^([^=]+?)(?:=(.*))?$/u.exec(pair);
            if (m) {
                [, key, value] = m;
                if (value) {
                    value = value.split('/');
                } else {
                    value = [];
                }
                args[key] = value;
            }
        }
    }
    return args;
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

    updateState: function(key, values) {
        if (values) {
            this._state[key] = values;
        } else {
            delete this._state[key];
        }
        this._saveStateToHash();
    },

    getState: function(key) {
        return this._state[key];
    },

    hasKey: function(key) {
        return this._state.hasOwnProperty(key);
    },

    _saveStateToHash: function() {
        var stateItems = [];
        for (let key of Object.keys(this._state)) {
            if (this._state[key]) {
                if (this._state[key].length) {
                    var values = this._state[key].join('/');
                    stateItems.push(key + '=' + values);
                } else {
                    stateItems.push(key);
                }
            }
        }
        const hash = stateItems.join('&');
        const href = `${location.origin}${location.pathname}${location.search}#${hash}`;
        this._ignoreChanges = true;
        if (href !== location.href) {
            location.replace(href);
        }
        this._ignoreChanges = false;
    },

    onHashChanged: function() {
        if (this._ignoreChanges) {
            return;
        }
        const newState = parseHashParams(location.hash);
        const changedKeys = {};
        for (let key of Object.keys(newState)) {
            if (!(key in this._state) || !arrayItemsEqual(newState[key], this._state[key])) {
                changedKeys[key] = 1;
            }
        }

        for (let key of Object.keys(this._state)) {
            if (!(key in newState)) {
                changedKeys[key] = 1;
            }
        }

        for (let [key, callback] of this._listeners) {
            if (key in changedKeys) {
                callback(newState[key]);
            }
        }
        this._state = newState;
    }
};

function bindHashStateReadOnly(key, target) {
    function onChange() {
        target(hashState.getState(key));
        hashState.updateState(key, null);
    }
    hashState.addEventListener(key, onChange);
    onChange();
}

window.addEventListener('hashchange', hashState.onHashChanged.bind(hashState));
hashState.onHashChanged();

export {hashState, bindHashStateReadOnly, parseHashParams};

