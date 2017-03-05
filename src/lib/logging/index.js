import Raven from 'raven-js';

function captureException(e) {
    Raven.captureException(e)
}

function captureMessage(msg) {
    Raven.captureMessage(msg)
}

function setExtraContext(data) {
    Raven.setExtraContext(data)
}

export default {captureMessage, captureException, setExtraContext}