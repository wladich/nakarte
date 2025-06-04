class Cache {
    constructor(maxSize) {
        this._maxSize = maxSize;
        this._store = {};
        this._size = 0;
    }

    get(key) {
        if (key in this._store) {
            const value = this._store[key];
            delete this._store[key];
            this._store[key] = value;
            return {value, found: true};
        }
        return {found: false};
    }

    put(key, value) {
        if (key in this._store) {
            delete this._store[key];
        } else {
            this._size += 1;
        }
        this._store[key] = value;
        if (this._size > this._maxSize) {
            delete this._store[Object.keys(this._store)[0]];
            this._size -= 1;
        }
    }
}

export {Cache};
