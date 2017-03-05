import './style.css';
import logging from 'lib/logging';

function showNotification(message, mouseEvent) {
    var el = document.createElement('div');
    el.innerHTML = message;
    el.className = 'copy-clipboard-notification';
    document.body.appendChild(el);
    var w = el.offsetWidth,
        h = el.offsetHeight,
        x = mouseEvent.clientX - w - 8,
        y = mouseEvent.clientY - h / 2;
    if (x < 0) {
        x = 0
    }
    if (y < 0) {
        y = 0
    }
    el.style.top = y + 'px';
    el.style.left = x + 'px';
    setTimeout(function() {
        document.body.removeChild(el);
    }, 1000);

}

function copyToClipboard(s, mouseEvent) {
    try {
        var ta = document.createElement('textarea');
        ta.value = s;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        showNotification('Copied', mouseEvent);
    } catch (e) {
        logging.captureException(e, {extra: {description: 'clipborad to copy failed'}});
        prompt("Copy to clipboard: Ctrl+C, Enter", s);
    } finally {
        document.body.removeChild(ta);
    }
}

export default copyToClipboard;