import alertify from 'alertify.js';
import './style.css';

function notify(message) {
    alertify.alert(message);
}

function prompt(message, value) {
    return window.prompt(message, value);
}

export {notify, prompt};
