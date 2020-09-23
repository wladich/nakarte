import L from 'leaflet';
import './style.css';

function stopContainerEvents(container) {
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);
    L.DomEvent.on(container, 'mousemove contextmenu', L.DomEvent.stop);
}

L.Control.include({
    _stopContainerEvents: function() {
        stopContainerEvents(this._container);
    }
});

function makeButton(containerClass, title, iconClass, noControlClass) {
    let cls = 'leaflet-bar leaflet-control-single-button';
    if (!noControlClass) {
        cls += ' leafletControl';
    }
    if (containerClass) {
        cls += ' ' + containerClass;
    }
    const container = L.DomUtil.create('div', cls);
    stopContainerEvents(container);
    const link = L.DomUtil.create('a', null, container);
    link.href = '#';
    L.DomEvent.on(link, 'click', L.DomEvent.preventDefault);
    if (title) {
        link.title = title;
    }
    const icon = L.DomUtil.create('div', iconClass, link);
    return {container, link, icon};
}

function makeButtonWithBar(containerClass, title, iconClass) {
    let cls = 'leaflet-control button-with-bar';
    if (containerClass) {
        cls += ' ' + containerClass;
    }
    const container = L.DomUtil.create('div', cls);
    const {container: buttonContainer, link, icon} = makeButton(null, title, iconClass, true);
    container.appendChild(buttonContainer);

    const barContainer = L.DomUtil.create('div', 'leaflet-bar bar', container);
    stopContainerEvents(barContainer);
    return {container, buttonContainer, link, icon, barContainer};
}

export {stopContainerEvents, makeButton, makeButtonWithBar};
