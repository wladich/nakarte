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



function setUp() {
    fixAnimationBug();
    const map = L.map('map', {
            zoomControl: false,
            fadeAnimation: false,
            attributionControl: false,
            inertiaMaxSpeed: 1500,
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


    new L.Control.PrintPages().addTo(map);
    new L.Control.Coordinates().addTo(map);
}

export default {setUp};
