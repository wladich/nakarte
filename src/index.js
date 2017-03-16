import Raven from 'raven-js';
import './index.css';
import App from './App'
import config from './config';

/* eslint-disable no-undef */
if (NODE_ENV === 'production') {
/* eslint-enable no-undef */
    Raven.config(config.sentryDSN).install();
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
    if (err.name) {
        err.name = 'Uncaught in promise: ' + err.name;
    }
    Raven.captureException(err);
    return result;
};

App.setUp();

