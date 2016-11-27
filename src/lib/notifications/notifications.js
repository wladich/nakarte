function notify(message, level) {
    window.alert(message);
}

function prompt(message, value) {
    return window.prompt(message, value);
}

function notifyXhrError(xhr, whatWasDownloading, level) {
    const reason = xhr.status === 0 ? 'network error' : `server response is ${xhr.status}`;
    const message = `Failed to download ${whatWasDownloading}: ${reason}`;
    notify(message, level);
}

export {notify, prompt, notifyXhrError};