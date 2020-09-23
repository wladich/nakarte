function onElementResize(element, cb) {
    if (window.ResizeObserver) {
        const observer = new ResizeObserver(() => cb());
        observer.observe(element);
    } else {
        let width = element.offsetWidth;
        let height = element.offsetHeight;
        setInterval(function () {
            const newWidth = element.offsetWidth;
            const newHeight = element.offsetHeight;
            if (newWidth !== width || newHeight !== height) {
                width = newWidth;
                height = newHeight;
                cb();
            }
        }, 200);
    }
}

export {onElementResize};
