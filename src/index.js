import Raven from 'raven-js';
import './index.css';
import App from './App'
import config from './config';

Raven.config(config.sentryDSN).install();
window.addEventListener('unhandledrejection', (e) => {
    const err = e.reason;
    if (err.name) {
        err.name = 'Uncaught in promise: ' + err.name;
    }
    Raven.captureException(err);
});

App.setUp();

