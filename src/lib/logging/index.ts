import * as Sentry from '@sentry/browser';
import type * as SentryTypes from '@sentry/types';

function randId(): string {
    return Math.random().toString(36).substring(2, 13);
}

const sessionId = randId();

function captureMessage(msg: string, extra: SentryTypes.Extras = {}): void {
    extra.documentUrl = window.location.toString();
    console.log('captureMessage', msg, extra); // eslint-disable-line no-console
    Sentry.withScope(function (scope) {
        scope.setExtras(extra);
        Sentry.captureMessage(msg);
    });
}

function captureException(e: Error, description?: string): void {
    console.log('captureException', e, description); // eslint-disable-line no-console
    Sentry.withScope(function (scope) {
        if (typeof description !== 'undefined') {
            scope.setTag('description', description);
        }
        scope.setExtra('documentUrl', window.location.toString());
        Sentry.captureException(e);
    });
}

function captureBreadcrumb(message: string, data: {[key: string]: unknown} = {}): void {
    data.documentUrl = window.location.toString();
    Sentry.addBreadcrumb({
        message,
        data,
    });
}

function logEvent(eventName: string, extra?: {[key: string]: unknown}): void {
    const url = 'https://nakarte.me/event';

    const payload = {
        event: eventName.toString(),
        data: {
            ...extra,
            beacon: true,
            session: sessionId,
            address: window.location.toString(),
        },
    };
    let s = JSON.stringify(payload);
    try {
        navigator.sendBeacon(url, s);
    } catch (e: unknown) {
        payload.data.beacon = false;
        s = JSON.stringify(payload);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://nakarte.me/event');
        xhr.send(s);
    }
}

export {captureMessage, captureException, captureBreadcrumb, logEvent, randId};
