import Raven from 'raven-js';

function captureException(e, options) {
    console.log('captureException', e, options);
    Raven.captureException(e, options)
}

function captureMessage(msg, options) {
    console.log('captureMessage', msg, options);
    Raven.captureMessage(msg, options)
}

function captureMessageWithUrl(msg) {
    captureMessage(msg, {extra: {url: window.location.toString()}});
}

function setExtraContext(data) {
    Raven.setExtraContext(data)
}

function captureBreadcrumb(crumb) {
    Raven.captureBreadcrumb(crumb)
}

function captureBreadcrumbWithUrl(crumb) {
    const data = Object.assign(crumb.data || {}, {'url': window.location.toString()});
    crumb = Object.assign({}, crumb, {data});
    captureBreadcrumb(crumb);
}

function logEvent(eventName, extra) {
    const data = {event: eventName.toString()};
    if (extra) {
        data['data'] = extra;
    }
    const s = JSON.stringify(data);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://nakarte.me/event');
    xhr.send(s);
}

export default {captureMessage, captureException, setExtraContext, captureBreadcrumbWithUrl, captureBreadcrumb,
    captureMessageWithUrl, logEvent}