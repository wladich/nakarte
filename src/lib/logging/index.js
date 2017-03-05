import Raven from 'raven-js';

function captureException(e, options) {
    Raven.captureException(e, options)
}

function captureMessage(msg, options) {
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

export default {captureMessage, captureException, setExtraContext, captureBreadcrumbWithUrl, captureBreadcrumb, captureMessageWithUrl}