import {notify} from '~/lib/notifications';

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
    var newWindow = window.open(url, uniqName, features);
    if (!newWindow || newWindow.closed) {
        notify('Всплывающее окно заблокировано браузером.\n' +
            'Для полноценной работы сайта необходимо разрешить всплывающие окна в настройках браузера для сайта.\n\n' +
            'Pop-up window was blocked by the browser.\n' +
            'If you want to use the full functionality of this site, ' +
            'turn off blocking pop-ups in the browser settings for this site.');
    } else {
        newWindow.focus();
    }
}

export {openPopupWindow};
