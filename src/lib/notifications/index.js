import alertify from 'alertify.js';
import './style.css';

function notify(message, onOk) {
    alertify.alert(message, onOk);
}

function prompt(message, value) {
    return window.prompt(message, value);
}

export {notify, prompt};
