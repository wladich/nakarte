function notify(message, level) {
    setTimeout(() => window.alert(message), 0);
}

function prompt(message, value) {
    return window.prompt(message, value);
}

function formatXhrError(xhr, whatWasDownloading) {
    const reason = xhr.status === 0 ? 'network error' : `server response is ${xhr.status}`;
    const message = `Failed to download ${whatWasDownloading}: ${reason}`;
    return message;
}

function notifyXhrError(xhr, whatWasDownloading, level) {
    const message = formatXhrError(xhr, whatWasDownloading);
    notify(message, level);
}

export {notify, prompt, notifyXhrError, formatXhrError};