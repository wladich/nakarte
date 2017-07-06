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
import {fixAll} from 'lib/leaflet.fixes'
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
import 'lib/leaflet.control.layers.events';
import 'lib/leaflet.control.jnx';
import 'lib/leaflet.control.jnx/hash-state';
import 'lib/leaflet.control.azimuth';


function setUp() {
    fixAll();

    const map = L.map('map', {
            zoomControl: false,
            fadeAnimation: false,
            attributionControl: false,
            inertiaMaxSpeed: 1500,
            worldCopyJump: true,
            maxZoom: 18
        }
    );
    map.enableHashState('m', [10, 55.75185, 37.61856]);

    const tracklist = new L.Control.TrackList();

    /////////// controls top-left corner

    new L.Control.Caption(`<a href="${config.newsUrl}">News</a> | <a href="mailto:${config.email}">nakarte@nakarte.tk</a>`, {
            position: 'topleft'
        }
    ).addTo(map);

    new L.Control.Scale({imperial: false, position: 'topleft'}).addTo(map);

    L.control.zoom().addTo(map);

    new L.Control.TrackList.Ruler(tracklist).addTo(map);

    new L.Control.Panoramas(document.getElementById('street-view'))
        .addTo(map)
        .enableHashState('n2');

    new L.Control.Coordinates({position: 'topleft'}).addTo(map);

    const azimuthControl = new L.Control.Azimuth({position: 'topleft'}).addTo(map);

    /////////// controls top-right corner

    const layersControl = L.control.layers(null, null, {collapsed: false})
        .addTo(map);
    enableLayersControlHotKeys (layersControl);
    enableLayersControlAdaptiveHeight(layersControl);
    enableLayersMinimize(layersControl);
    enableLayersConfig(layersControl, getLayers());
    layersControl.enableHashState('l');

    /////////// controls bottom-left corner

    const printControl = new L.Control.PrintPages({position: 'bottomleft'})
        .addTo(map)
        .enableHashState('p');
    if (!printControl.hasPages()) {
        printControl.setMinimized();
    }

    new L.Control.JNX(layersControl, {position: 'bottomleft'})
        .addTo(map)
        .enableHashState('j');

    /////////// controls bottom-right corner

    tracklist.addTo(map);
    if (!hashState.getState('nktk')) {
        tracklist.loadTracksFromStorage();
    }
    tracklist.enableHashState('nktk');


    ////////// adaptive layout

    if (L.Browser.mobile) {
        layersControl.setMinimized();
        if (!tracklist.hasTracks()) {
            tracklist.setMinimized();
        }
    }

    if (L.Browser.mobile) {
        map.on('mousedown dragstart', () => layersControl.setMinimized())
    }

    raiseControlsOnFocus(map);

    //////////// save state at unload

    L.DomEvent.on(window, 'beforeunload', () => tracklist.saveTracksToStorage());

    ////////// track list and azimuth measure interaction

    tracklist.on('startedit', () => azimuthControl.setEnabled(false));
    tracklist.on('elevation-shown', () => azimuthControl.hideProfile());
    azimuthControl.on('enabled', () => {
        tracklist.stopEditLine();
    });
    azimuthControl.on('elevation-shown', () => tracklist.hideElevationProfile());
}

export default {setUp};
