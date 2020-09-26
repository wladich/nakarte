import alertify from 'alertify.js';
import './style.css';

function notify(message, onOk) {
    alertify.alert(message, onOk);
}

function query(message, value) {
    function removeFocusFromInput() {
        const activeElement = document.activeElement;
        if (activeElement?.tagName === 'INPUT') {
            activeElement.blur();
        }
    }

    const result = window.prompt(message, value);
    // There is a bug in Chrome on Android: after closing the prompt, it sets focus to last active input element
    setTimeout(removeFocusFromInput, 0);
    return result;
}

export {notify, query};
