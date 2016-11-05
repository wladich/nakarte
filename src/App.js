import './App.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import layers from './layers';
import './lib/control.printPages/control'
import './lib/control.caption/caption'
import config from './config'
import './lib/control.coordinates/coordinates';
import './lib/control.layers.hotkeys/control.Layers-hotkeys';

function setUp() {
    const map = L.map('map', {
        zoomControl: false,
        fadeAnimation: false,
        center:[55.75185, 37.61856],
        zoom: 10
    });

    new L.Control.Caption(`<a href=mailto:${config.email}">nakarte@nakarte.tk</a>`, {
        position: 'topleft'
    }).addTo(map);
    L.control.zoom().addTo(map);

    {
        let baseLayers = layers.getBaseMaps();
        const layersControl = L.control.layers(baseLayers, layers.getOverlays(), {collapsed: false}).addTo(map);
        map.addLayer(baseLayers['OpenStreetMap']);
    }

    new L.Control.PrintPages().addTo(map);
    new L.Control.Coordinates().addTo(map);

    // const hashState = L.HashState();
    // hashState.bind(map);
    // hashState.bind(layersControl);
    
    // let p = L.polyline([[0, 0], [20, 20]]);
    // p.addTo(map);
    // map.on('contextmenu', () => {
    //     map.flyTo([10, 20], 13, {duration: 1});
    // });
}

export default {setUp};
