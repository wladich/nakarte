function localStorageWorks() {
    try {
        window.localStorage.setItem('_testDummy', 'TEST');
        return window.localStorage.getItem('_testDummy') === 'TEST';
    } catch (e) {
        return false;
    }
}

let storage; // eslint-disable-line import/no-mutable-exports

if (localStorageWorks()) {
    storage = window.localStorage;
} else {
    let _storage = {};
    storage = {
        length: 0,

        key: function(n) {
            return Object.keys(_storage)[n];
        },

        removeItem: function(key) {
            delete _storage[key];
        },

        getItem: function(key) {
            return storage[key];
        },

        setItem: function(key, value) {
            storage[key] = value;
        },

        clear: function() {
            _storage = {};
        }
    };
}

export default storage;
