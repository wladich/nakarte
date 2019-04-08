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
import raiseControlsOnFocus from 'lib/leaflet.controls.raise-on-focus';
import getLayers from 'layers';
import 'lib/leaflet.control.layers.events';
import 'lib/leaflet.control.export';
import 'lib/leaflet.control.export/hash-state';
import 'lib/leaflet.control.azimuth';
import {hashState, bindHashStateReadOnly} from 'lib/leaflet.hashState/hashState';
import {LocateControl} from 'lib/leaflet.control.locate';
import {notify} from 'lib/notifications';
import ZoomDisplay from 'lib/leaflet.control.zoom-display';
import logging from 'lib/logging';
import safeLocalStorage from 'lib/safe-localstorage';

const locationErrorMessage = {
    0: 'Your browser does not support geolocation.',
    1: 'Geolocation is blocked for this site. Please, enable in browser setting.',
    2: 'Failed to acquire position for unknown reason.',
};

function setUp() {
    const startInfo = {
        href: window.location.href,
        localStorageKeys: Object.keys(safeLocalStorage),
        mobile: L.Browser.mobile,
    };
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

    const tracklist = new L.Control.TrackList();

    /////////// controls top-left corner

    new L.Control.Caption(config.caption, {
            position: 'topleft'
        }
    ).addTo(map);


    new ZoomDisplay().addTo(map);

    new L.Control.Scale({
        imperial: false,
        position: 'topleft',
        stackHorizontally: true
    }).addTo(map);

    new L.Control.TrackList.Ruler(tracklist).addTo(map);

    const panoramas = new L.Control.Panoramas(document.getElementById('street-view'))
        .addTo(map)
        .enableHashState('n2');
    L.Control.Panoramas.hashStateUpgrader(panoramas).enableHashState('n');

    new L.Control.Coordinates({position: 'topleft'}).addTo(map);

    const azimuthControl = new L.Control.Azimuth({position: 'topleft'}).addTo(map);

    const locateControl = new LocateControl({
        position: 'topleft',
        showError: function({code, message}) {
            let customMessage = locationErrorMessage[code];
            if (!customMessage) {
                customMessage = `Geolocation error: ${message}`;
            }
            notify(customMessage);
        }
    }).addTo(map);

    const defaultLocation = L.latLng(55.75185, 37.61856);
    const defaultZoom = 10;

    let {lat, lng, zoom, valid: validPositionInHash} = map.validateState(hashState.getState('m'));
    locateControl.moveMapToCurrentLocation(defaultZoom, defaultLocation,
        validPositionInHash ? L.latLng(lat, lng) : null, validPositionInHash ? zoom : null);
    map.enableHashState('m');
    /////////// controls top-right corner

    const layersControl = L.control.layers(null, null, {collapsed: false})
        .addTo(map);
    enableLayersControlHotKeys (layersControl);
    enableLayersControlAdaptiveHeight(layersControl);
    enableLayersMinimize(layersControl);
    enableLayersConfig(layersControl, getLayers());
    layersControl.enableHashState('l');

    /////////// controls bottom-left corner

    new L.Control.export(layersControl, {position: 'bottomleft'})
        .addTo(map)
        .enableHashState('j');

    const printControl = new L.Control.PrintPages({position: 'bottomleft'})
        .addTo(map)
        .enableHashState('p');
    if (!printControl.hasPages()) {
        printControl.setMinimized();
    }

    /////////// controls bottom-right corner

    function trackNames() {
        return tracklist.tracks().map((track) => track.name());
    }
    tracklist.addTo(map);
    const tracksHashParams = tracklist.hashParams();

    let hasTrackParamsInHash = false;
    for (let param of tracksHashParams) {
        if (hashState.hasKey(param)) {
            hasTrackParamsInHash = true;
            break;
        }
    }
    if (!hasTrackParamsInHash) {
        tracklist.loadTracksFromStorage();
    }
    startInfo.tracksAfterLoadFromStorage = trackNames();

    for (let param of tracksHashParams ) {
        bindHashStateReadOnly(param, tracklist.loadTrackFromParam.bind(tracklist, param));
    }
    startInfo.tracksAfterLoadFromHash = trackNames();

    if (!validPositionInHash) {
        tracklist.whenLoadDone(() => tracklist.setViewToAllTracks(true));
    }


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

    L.DomEvent.on(window, 'beforeunload', () => {
        logging.logEvent('saveTracksToStorage begin', {
            localStorageKeys: Object.keys(safeLocalStorage),
            trackNames: trackNames(),
        });
        const t = Date.now();
        let localStorageKeys;
        try {
            tracklist.saveTracksToStorage();
            localStorageKeys = Object.keys(safeLocalStorage);
        } catch (e) {
            logging.logEvent('saveTracksToStorage failed', {error: e});
            return;
        }
        logging.logEvent('saveTracksToStorage done', {
            time: Date.now() - t,
            localStorageKeys
        });
    });

    ////////// track list and azimuth measure interaction

    tracklist.on('startedit', () => azimuthControl.disableControl());
    tracklist.on('elevation-shown', () => azimuthControl.hideProfile());
    azimuthControl.on('enabled', () => {
        tracklist.stopEditLine();
    });
    azimuthControl.on('elevation-shown', () => tracklist.hideElevationProfile());
    logging.logEvent('start', startInfo);
}

export default {setUp};
