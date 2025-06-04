import L from 'leaflet';
import './TileLayer';
import './Bing';
import './Yandex';
import './Google';
import './WestraPasses';
import './CanvasMarkers';
import './MeasuredLine';
import './RetinaTileLayer';

function getTempMap(zoom, fullSize, pixelBounds) {
    const container = L.DomUtil.create('div', '', document.body);
    let width, height, center;
    if (fullSize) {
        const size = pixelBounds.getSize();
        width = size.x;
        height = size.y;
        center = pixelBounds.min.add(size.divideBy(2));
        center = L.CRS.EPSG3857.pointToLatLng(center, zoom);
    } else {
        width = 100;
        height = 100;
        center = L.latLng(0, 0);
    }

    Object.assign(container.style, {
            width: `${width}px`,
            height: `${height}px`,
            position: 'absolute',
            left: '0',
            top: '0',
            visibility: 'hidden',
        }
    );

    const map = L.map(container, {fadeAnimation: false, zoomAnimation: false, inertia: false, maxZoom: 18});
    map.setView(center, zoom);
    return map;
}

function disposeMap(map) {
    const container = map._container;
    map.remove();
    L.DomUtil.remove(container);
}

export {getTempMap, disposeMap};
