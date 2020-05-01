import loadScript from 'load-script';
import config from '~/config';

let _google = null;
let _pending = null;

function getGoogle() {
    if (_google) {
        return Promise.resolve(_google);
    }
    if (!_pending) {
        _pending = new Promise((resolve, reject) => {
                loadScript(config.googleApiUrl, (error) => {
                        if (error) {
                            reject(error);
                        } else {
                            _google = window.google;
                            resolve(_google);
                        }
                    }
                );
            }
        );
    }
    return _pending;
}

export default getGoogle;
