import logging from '~/lib/logging';

function openPopupWindow(url, width, uniqName = null) {
    var left, top, height,
        screenLeft = screen.availLeft || 0,
        bordersWidth = 8;
    // if browser window is in the right half of screen, place new window on left half
    if (window.screenX - screenLeft - bordersWidth * 1.5 > width) {
        left = window.screenX - width - bordersWidth * 1.5;
        // if browser window is in the left half of screen, place new window on right half
    } else if (window.screenX + window.outerWidth + width + bordersWidth * 1.5 < screenLeft + screen.availWidth) {
        left = window.screenX + window.outerWidth + bordersWidth;
        // if screen is small or browser window occupies whole screen, place new window on top of current window
    } else {
        left = window.screenX + window.outerWidth / 2 - width / 2;
        if (left < 0) {
            left = 0;
        }
    }
    top = window.screenY;
    height = window.innerHeight;
    var features = 'width=' + width + ',height=' + height + ',left=' + left + ',top=' + top;
    features += ',resizable,scrollbars';
    const eventId = logging.randId();
    url = `https://nakarte.me/r/?url=${encodeURIComponent(url)}&event=${eventId}`;
    let error;
    let isClosed;
    let win;
    try {
        win = window.open(url, uniqName, features);
    } catch (e) {
        error = e;
    }
    if (win) {
        isClosed = win.closed;
    }
    logging.logEvent('openPopupWindow', {win: Boolean(win), error, isClosed, eventId});
}

export {openPopupWindow};
