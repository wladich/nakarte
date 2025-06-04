import './style.css';
import L from 'leaflet';

function raiseControlsOnFocus(map) {
    const selectors = [
        '.leaflet-top.leaflet-right',
        '.leaflet-bottom.leaflet-right',
        '.leaflet-top.leaflet-left',
        '.leaflet-bottom.leaflet-left'
    ];
    let elements = map._container.querySelectorAll(selectors.join(','));

    function raise(target) {
        for (let cornerDiv of elements) {
            if (cornerDiv === target) {
                L.DomUtil.addClass(cornerDiv, 'leaflet-controls-corner-raised');
            } else {
                L.DomUtil.removeClass(cornerDiv, 'leaflet-controls-corner-raised');
            }
        }
    }

    [...elements].forEach((el) => L.DomEvent.on(el, 'mouseenter', raise.bind(null, el)));
}

export default raiseControlsOnFocus;
