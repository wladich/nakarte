import alertify from 'alertify.js';
import './style.css';

function notify(message, level) {
    alertify.alert(message);
}

function confirm(message, accept, decline) {
    alertify.confirm(message, accept, decline);
}

function prompt(message, value) {
    return window.prompt(message, value);
}

export {notify, confirm, prompt};