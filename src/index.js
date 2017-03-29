import Raven from 'raven-js';
import './index.css';
import App from './App'
import config from './config';

/* eslint-disable no-undef */
if (NODE_ENV === 'production') {
    Raven.config(config.sentryDSN, {release: RELEASE_VER}).install();
/* eslint-enable no-undef */
}

const oldOnunhandledrejection = window.onunhandledrejection;

// Not using addEventListener due to https://github.com/zloirock/core-js/issues/205
window.onunhandledrejection = (e) => {
    let result = true;
    if (oldOnunhandledrejection) {
         result = oldOnunhandledrejection(e);
    }
    console.error('Uncaught in promise:', e.reason);
    const err = e.reason;
    if (err && err.name) {
        err.name = 'Uncaught in promise: ' + err.name;
    }
    Raven.captureException(err);
    return result;
};

/* eslint-disable no-undef */
console.log('Version:', RELEASE_VER);
/* eslint-enable no-undef */

App.setUp();

