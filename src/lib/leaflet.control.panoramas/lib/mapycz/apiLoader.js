import loadScript from 'load-script';

let _smap = null;
let _pending = null;

function getLoader() {
    const loaderUrl = 'https://api.mapy.cz/loader.js';
    return new Promise((resolve, reject) => {
        loadScript(loaderUrl, (error) => {
            if (error) {
                reject(error);
            } else {
                resolve(window.Loader);
            }
        });
    });
}

function loadApi(loader) {
    return new Promise((resolve) => {
        loader.async = true;
        loader.load(null, {pano: true}, () => {
            resolve(window.SMap);
        });
    });
}

function getSMap() {
    if (_smap) {
        return _smap;
    }
    if (!_pending) {
        _pending = getLoader().then((loader) => loadApi(loader));
    }
    return _pending;
}

export {getSMap};
