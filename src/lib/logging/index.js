import Raven from 'raven-js';

function randId() {
    return Math.random().toString(36).substring(2, 13);
}

const sessionId = randId();

function captureException(e, options) {
    console.log('captureException', e, options);
    Raven.captureException(e, options);
}

function captureMessage(msg, options) {
    console.log('captureMessage', msg, options);
    Raven.captureMessage(msg, options);
}

function captureMessageWithUrl(msg) {
    captureMessage(msg, {extra: {url: window.location.toString()}});
}

function setExtraContext(data) {
    Raven.setExtraContext(data);
}

function captureBreadcrumb(crumb) {
    Raven.captureBreadcrumb(crumb);
}

function captureBreadcrumbWithUrl(crumb) {
    const data = Object.assign(crumb.data || {}, {'url': window.location.toString()});
    crumb = Object.assign({}, crumb, {data});
    captureBreadcrumb(crumb);
}

function logEvent(eventName, extra) {
    const url = 'https://nakarte.me/event';

    const data = {event: eventName.toString()};
    data.data = Object.assign({}, extra, {
        beacon: true,
        session: sessionId,
        address: window.location.toString()
    });
    let s = JSON.stringify(data);
    try {
        navigator.sendBeacon(url, s);
    } catch (e) {
        data.data.beacon = false;
        s = JSON.stringify(data);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://nakarte.me/event');
        xhr.send(s);
    }
}



export default {captureMessage, captureException, setExtraContext, captureBreadcrumbWithUrl, captureBreadcrumb,
    captureMessageWithUrl, logEvent, randId};