function notify(message, level) {
    setTimeout(() => window.alert(message), 0);
}

function prompt(message, value) {
    return window.prompt(message, value);
}

export {notify, prompt};