function cached(f) {
    var cache = {};
    return function(arg) {
        if (!(arg in cache)) {
            cache[arg] = f(arg);
        }
        return cache[arg];
    };
}

function iconFromBackgroundImage(className) {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    document.body.appendChild(container);
    const el = document.createElement('div');
    el.className = className;
    container.appendChild(el);
    const st = window.getComputedStyle(el),
        url = st.backgroundImage.replace(/^url\("?/u, '').replace(/"?\)$/u, '');
    let icon = {url: url, center: [-el.offsetLeft, -el.offsetTop]};
    document.body.removeChild(container);
    container.removeChild(el);
    return icon;
}

export default cached(iconFromBackgroundImage);
