import loadScript from 'load-script';

let _panorama = null;
let _pending = null;

function getPanorama() {
    if (_panorama) {
        return Promise.resolve(_panorama);
    }
    if (!_pending) {
        _pending = new Promise((resolve, reject) => {
            loadScript('https://api.mapy.cz/js/panorama/v1/panorama.js', (error) => {
                if (error) {
                    reject(error);
                } else {
                    _panorama = window.Panorama;
                    resolve(_panorama);
                }
            });
        });
    }
    return _pending;
}

export {getPanorama};
