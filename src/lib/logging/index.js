import * as Sentry from '@sentry/browser';

function randId() {
    return Math.random().toString(36).substring(2, 13);
}

const sessionId = randId();

function captureMessage(msg, extra = {}) {
    extra.url = window.location.toString();
    console.log('captureMessage', msg, extra); // eslint-disable-line no-console
    Sentry.withScope(function(scope) {
        scope.setExtras(extra);
        Sentry.captureMessage(msg);
    });
}

function captureException(e, description) {
    console.log('captureException', e, description); // eslint-disable-line no-console
    Sentry.withScope(function(scope) {
        if (description) {
            scope.setTag('description', description);
        }
        scope.setExtra('url', window.location.toString());
        Sentry.captureException(e);
    });
}
function captureBreadcrumb(message, data = {}) {
    data.url = window.location.toString();
    Sentry.addBreadcrumb({
        message, data
    });
}

function logEvent(eventName, extra) {
    const url = 'https://nakarte.me/event';

    const data = {event: eventName.toString()};
    data.data = {
        ...extra,
        beacon: true,
        session: sessionId,
        address: window.location.toString()
    };
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

export {captureMessage, captureException, captureBreadcrumb, logEvent, randId};
