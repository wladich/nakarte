import './App.css';
import './leaflet-fixes.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'lib/leaflet.control.printPages/control'
import 'lib/leaflet.control.caption'
import config from './config'
import 'lib/leaflet.control.coordinates';
import enableLayersControlHotKeys from 'lib/leaflet.control.layers.hotkeys';
import 'lib/leaflet.hashState/Leaflet.Map';
import 'lib/leaflet.hashState/Leaflet.Control.Layers';
import fixAnimationBug from 'lib/leaflet.fixAnimationBug'
import './adaptive.css';
import 'lib/leaflet.control.panoramas';
import 'lib/leaflet.control.track-list/track-list';
import 'lib/leaflet.control.track-list/control-ruler';
import 'lib/leaflet.control.track-list/track-list.hash-state';
import 'lib/leaflet.control.track-list/track-list.localstorage';
import enableLayersControlAdaptiveHeight from 'lib/leaflet.control.layers.adaptive-height';
import enableLayersMinimize from 'lib/leaflet.control.layers.minimize';
import enableLayersConfig from 'lib/leaflet.control.layers.configure';
import hashState from 'lib/leaflet.hashState/hashState';
import raiseControlsOnFocus from 'lib/leaflet.controls.raise-on-focus';
import getLayers from 'layers';



function setUp() {
    fixAnimationBug();

    const map = L.map('map', {
            zoomControl: false,
            fadeAnimation: false,
            attributionControl: false,
            easeLinearity: 0.2,
            inertiaMaxSpeed: 1500,
            worldCopyJump: true
        }
    );
    map.enableHashState('m', [10, 55.75185, 37.61856]);

    const tracklist = new L.Control.TrackList();

    /////////// controls top-left corner

    new L.Control.Caption(`<a href="http://about.nakarte.tk">News</a> | <a href=mailto:${config.email}">nakarte@nakarte.tk</a>`, {
            position: 'topleft'
        }
    ).addTo(map);

    L.control.zoom().addTo(map);

    new L.Control.TrackList.Ruler(tracklist).addTo(map);

    new L.Control.Panoramas(document.getElementById('street-view'))
        .addTo(map)
        .enableHashState('n');

    new L.Control.Coordinates({position: 'topleft'}).addTo(map);

    /////////// controls top-right corner

    const layersControl = L.control.layers(null, null, {collapsed: false})
        .addTo(map);
    enableLayersControlHotKeys (layersControl);
    enableLayersControlAdaptiveHeight(layersControl);
    enableLayersMinimize(layersControl);
    enableLayersConfig(layersControl, getLayers());
    layersControl.enableHashState('l');

    /////////// controls bottom-left corner

    new L.Control.PrintPages({position: 'bottomleft'}).addTo(map);

    /////////// controls bottom-right corner

    tracklist.addTo(map);
    if (!hashState.getState('nktk')) {
        tracklist.loadTracksFromStorage();
    }
    tracklist.enableHashState('nktk');

    raiseControlsOnFocus(map);

    L.DomEvent.on(window, 'beforeunload', () => tracklist.saveTracksToStorage());
}

export default {setUp};
