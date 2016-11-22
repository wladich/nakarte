function openPopup (url, width) {
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
    // to open single instance replace null with some string
    window.open(url, null, features)
        .focus();
}

export default openPopup;
