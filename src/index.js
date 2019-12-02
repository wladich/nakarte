import Raven from 'raven-js';
import './index.css';
import App from './App'
import config from './config';

function getUid() {
    const cookie = document.cookie;
    const cookieUid = cookie.match(/\buid=([^;]+)/)[1];
    const uidRaw = atob(cookieUid);
    const l = [];
    for (let i = 0; i < uidRaw.length; i++) {
        l.push(uidRaw.charCodeAt(i));
    }
    const l2 = [];
    l2.push(...l.slice(0, 4).reverse());
    l2.push(...l.slice(4, 8).reverse());
    l2.push(...l.slice(8, 12).reverse());
    l2.push(...l.slice(12).reverse());
    const uid = l2.map((c) => ("0" + c.toString(16)).slice(-2)).join('').toUpperCase();
    return uid;
}

if (NODE_ENV === 'production') {
    Raven.config(config.sentryDSN, {release: RELEASE_VER}).install();
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

console.log('Version:', RELEASE_VER);

let uid;
try {
    uid = getUid()} catch (e) {
    // ignore error
}
console.log('UID:', uid);

Raven.setUserContext({
        uid: uid,
        cookie: document.cookie
    }
);

Raven.context(function() {
    App.setUp();
});

