import alertify from 'alertify.js';
import './style.css';

function notify(message: string, onOk?: () => void): void {
    alertify.alert(message, onOk);
}

function query(message: string, value?: string): string | null {
    function removeFocusFromInput(): void {
        const activeElement = document.activeElement;
        if (activeElement?.tagName === 'INPUT') {
            (activeElement as HTMLElement).blur();
        }
    }

    const result = window.prompt(message, value);
    // There is a bug in Chrome on Android: after closing the prompt, it sets focus to last active input element
    setTimeout(removeFocusFromInput, 0);
    return result;
}

export {notify, query};
