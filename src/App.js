import './App.css';
import './leaflet-fixes.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import layers from './layers';
import 'lib/leaflet.control.printPages/control'
import 'lib/leaflet.control.caption/caption'
import config from './config'
import 'lib/leaflet.control.coordinates/coordinates';
import 'lib/leaflet.control.layers.hotkeys/control.Layers-hotkeys';
import 'lib/leaflet.hashState/Leaflet.Map';
import 'lib/leaflet.hashState/Leaflet.Control.Layers';
import fixAnimationBug from 'lib/leaflet.fixAnimationBug/leaflet.fixAnimationBug'
import './adaptive.css';
import 'lib/leaflet.control.panoramas/panoramas';

function autoSizeControl(map, control) {
    // для контрола Layers есть аналогичная функция при разворачивании из кнопки.
    // если делать collapsable: true надо сделать патч, отключающий её там
    const margin = 50;
    control.getContainer().style.maxHeight = (map.getSize().y - margin) + 'px';
}

function raiseControlsOnMouse(controls) {
    const selectors = ['.leaflet-top.leaflet-right', '.leaflet-bottom.leaflet-right', '.leaflet-top.leaflet-left',
        '.leaflet-bottom.leaflet-left'];
    let elements = selectors.map(document.querySelector.bind(document));

    function raise(target) {
        for (let cornerDiv of elements) {
            if (cornerDiv === target) {
                L.DomUtil.addClass(cornerDiv, 'nakarte-controls-raised');
            } else {
                L.DomUtil.removeClass(cornerDiv, 'nakarte-controls-raised');
            }
        }
    }

    elements.forEach((el) => L.DomEvent.on(el, 'mouseenter', raise.bind(null, el)));
}

function setUp() {
    fixAnimationBug();

    const map = L.map('map', {
            zoomControl: false,
            fadeAnimation: false,
            attributionControl: false,
            easeLinearity: 0.2,
            inertiaMaxSpeed: 1500
        }
    );
    map.enableHashState('m', [10, 55.75185, 37.61856]);


    new L.Control.Caption(`<a href=mailto:${config.email}">nakarte@nakarte.tk</a>`, {
            position: 'topleft'
        }
    ).addTo(map);
    L.control.zoom().addTo(map);


    let baseLayers = layers.getBaseMaps();
    const layersControl = L.control.layers(baseLayers, layers.getOverlays(), {collapsed: false}).addTo(map);
    map.addLayer(baseLayers['OpenStreetMap']);
    layersControl.enableHashState('l');


    new L.Control.PrintPages({position: 'bottomleft'}).addTo(map);
    new L.Control.Coordinates().addTo(map);
    const panoramas = new L.Control.Panoramas(document.getElementById('street-view')).addTo(map);

    panoramas.enableHashState('n');
    map.on('resize', autoSizeControl.bind(null, map, layersControl));
    autoSizeControl(map, layersControl);

    raiseControlsOnMouse();
}

export default {setUp};
