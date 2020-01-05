import * as Sentry from '@sentry/browser';
import './index.css';
import App from './App';
import config from './config';

function getUid() {
    const cookie = document.cookie;
    const cookieUid = cookie.match(/\buid=([^;]+)/u)[1];
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
    Sentry.init({
        dsn: config.sentryDSN,
        release: RELEASE_VER});
}

console.log('Version:', RELEASE_VER); // eslint-disable-line no-console

let uid;
try {
    uid = getUid();} catch (e) {
    // ignore error
}
console.log('UID:', uid); // eslint-disable-line no-console

Sentry.configureScope(function(scope) {
    scope.setUser({id: uid});
});


App.setUp();

