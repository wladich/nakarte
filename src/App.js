import './App.css';
import './leaflet-fixes.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {MapWithSidebars} from '~/lib/leaflet.map.sidebars';
import '~/lib/leaflet.control.printPages/control';
import '~/lib/leaflet.control.caption';
import config from './config';
import '~/lib/leaflet.control.coordinates';
import enableLayersControlHotKeys from '~/lib/leaflet.control.layers.hotkeys';
import '~/lib/leaflet.hashState/Leaflet.Map';
import '~/lib/leaflet.hashState/Leaflet.Control.Layers';
import {fixAll} from '~/lib/leaflet.fixes';
import './adaptive.css';
import '~/lib/leaflet.control.panoramas';
import '~/lib/leaflet.control.track-list/track-list';
import '~/lib/leaflet.control.track-list/control-ruler';
import '~/lib/leaflet.control.track-list/track-list.hash-state';
import '~/lib/leaflet.control.track-list/track-list.localstorage';
import enableLayersControlAdaptiveHeight from '~/lib/leaflet.control.layers.adaptive-height';
import enableLayersMinimize from '~/lib/leaflet.control.layers.minimize';
import enableLayersConfig from '~/lib/leaflet.control.layers.configure';
import raiseControlsOnFocus from '~/lib/leaflet.controls.raise-on-focus';
import {getLayers} from './layers';
import '~/lib/leaflet.control.layers.events';
import '~/lib/leaflet.control.jnx';
import '~/lib/leaflet.control.jnx/hash-state';
import '~/lib/leaflet.control.azimuth';
import {hashState, bindHashStateReadOnly} from '~/lib/leaflet.hashState/hashState';
import {LocateControl} from '~/lib/leaflet.control.locate';
import {notify} from '~/lib/notifications';
import ZoomDisplay from '~/lib/leaflet.control.zoom-display';
import * as logging from '~/lib/logging';
import safeLocalStorage from '~/lib/safe-localstorage';
import {ExternalMaps} from '~/lib/leaflet.control.external-maps';
import {SearchControl} from '~/lib/leaflet.control.search';
import '~/lib/leaflet.placemark';

const locationErrorMessage = {
    0: 'Your browser does not support geolocation.',
    1: 'Geolocation is blocked for this site. Please, enable in browser setting.',
    2: 'Failed to acquire position for unknown reason.',
};

const minimizeStateAuto = 0;
const minimizeStateMinimized = 1;
const minimizeStateExpanded = 2;

function setUp() { // eslint-disable-line complexity
    const startInfo = {
        href: window.location.href,
        localStorageKeys: Object.keys(safeLocalStorage),
        mobile: L.Browser.mobile,
    };
    fixAll();

    function validateMinimizeState(state) {
        state = Number(state);
        if (state === minimizeStateMinimized || state === minimizeStateExpanded) {
            return state;
        }
        return minimizeStateAuto;
    }
    const minimizeState = hashState.getState('min') ?? [];
    const minimizeControls = {
        tracks: validateMinimizeState(minimizeState[0]),
        layers: validateMinimizeState(minimizeState[1]),
        print: validateMinimizeState(minimizeState[2]),
        search: validateMinimizeState(minimizeState[3]),
    };

    const map = new MapWithSidebars('map', {
            zoomControl: false,
            fadeAnimation: false,
            attributionControl: false,
            inertiaMaxSpeed: 1500,
            worldCopyJump: true,
            maxZoom: 18
        }
    );

    const tracklist = new L.Control.TrackList({
        keysToExcludeOnCopyLink: ['q', 'r']
    });

    /* controls top-left corner */

    new L.Control.Caption(config.caption, {
            position: 'topleft'
        }
    ).addTo(map);

    new ZoomDisplay().addTo(map);

    const searchOptions = {
        position: 'topleft',
        stackHorizontally: true,
        maxMapWidthToMinimize: 620,
    };
    if (minimizeControls.search === minimizeStateMinimized) {
        searchOptions.maxMapHeightToMinimize = Infinity;
        searchOptions.maxMapWidthToMinimize = Infinity;
    } else if (minimizeControls.search === minimizeStateExpanded) {
        searchOptions.maxMapHeightToMinimize = 0;
        searchOptions.maxMapWidthToMinimize = 0;
    }
    const searchControl = new SearchControl(searchOptions)
        .addTo(map)
        .enableHashState('q');
    map.getPlacemarkHashStateInterface().enableHashState('r');

    new L.Control.Scale({
        imperial: false,
        position: 'topleft',
        stackHorizontally: true
    }).addTo(map);

    new ExternalMaps({position: 'topleft'}).addTo(map);

    new L.Control.TrackList.Ruler(tracklist).addTo(map);

     const panoramas = new L.Control.Panoramas()
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
    let {valid: validPositionInHash} = map.validateState(hashState.getState('m'));
    map.enableHashState('m', [config.defaultZoom, ...config.defaultLocation]);

    /* controls top-right corner */

    const layersControl = L.control.layers(null, null, {collapsed: false})
        .addTo(map);
    enableLayersControlHotKeys(layersControl);
    enableLayersControlAdaptiveHeight(layersControl);
    enableLayersMinimize(layersControl);
    enableLayersConfig(layersControl, getLayers());
    layersControl.enableHashState('l');

    /* controls bottom-left corner */

    const attribution = L.control.attribution({
        position: 'bottomleft',
        prefix: false,
    });
    map.on('resize', function() {
        if (map.getSize().y > 567) {
            map.addControl(attribution);
            // Hack to keep control at the bottom of the map
            const container = attribution._container;
            const parent = container.parentElement;
            parent.appendChild(container);
        } else {
            map.removeControl(attribution);
        }
    });
    if (map.getSize().y > 567) {
        map.addControl(attribution);
    }

    const printControl = new L.Control.PrintPages({position: 'bottomleft'})
        .addTo(map)
        .enableHashState('p');
    if (
        minimizeControls.print === minimizeStateMinimized ||
        (minimizeControls.print === minimizeStateAuto && !printControl.hasPages())
    ) {
        printControl.setMinimized();
    }

    const jnxControl = new L.Control.JNX(layersControl, {position: 'bottomleft'})
        .addTo(map)
        .enableHashState('j');

    /* controls bottom-right corner */

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

    if (hashState.hasKey('autoprofile') && hasTrackParamsInHash) {
        tracklist.once('loadedTracksFromParam', () => {
            const track = tracklist.tracks()[0];
            if (track) {
                tracklist.showElevationProfileForTrack(track);
            }
        });
    }

    // This is not quite correct: minimizeControls should have effect only during loading, but the way it is
    // implemented, it will affect expanding when loading track from hash param during session.
    // But as parameter is expected to be found only when site is embedded using iframe,
    // the latter scenario is not very probable.
    if (minimizeControls.tracks !== minimizeStateMinimized) {
        tracklist.on('loadedTracksFromParam', () => tracklist.setExpanded());
    }

    for (let param of tracksHashParams) {
        bindHashStateReadOnly(param, tracklist.loadTrackFromParam.bind(tracklist, param));
    }
    startInfo.tracksAfterLoadFromHash = trackNames();

    /* set map position */

    if (!validPositionInHash) {
        if (hasTrackParamsInHash) {
            tracklist.whenLoadDone(() => tracklist.setViewToAllTracks(true));
        } else {
            locateControl.moveMapToCurrentLocation(config.defaultZoom);
        }
    }

    /* adaptive layout */

    if (
        minimizeControls.layers === minimizeStateAuto && L.Browser.mobile ||
        minimizeControls.layers === minimizeStateMinimized
    ) {
        layersControl.setMinimized();
    }

    if (L.Browser.mobile) {
        map.on('mousedown dragstart', () => layersControl.setMinimized());
    }

    if (
        minimizeControls.tracks === minimizeStateAuto && L.Browser.mobile && !tracklist.hasTracks() ||
        minimizeControls.tracks === minimizeStateMinimized
    ) {
        tracklist.setMinimized();
    }

    raiseControlsOnFocus(map);

    /* save state at unload */

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

    /* track list and azimuth measure interaction */

    tracklist.on('startedit', () => azimuthControl.disableControl());
    tracklist.on('elevation-shown', () => azimuthControl.hideProfile());
    azimuthControl.on('enabled', () => {
        tracklist.stopEditLine();
    });
    azimuthControl.on('elevation-shown', () => tracklist.hideElevationProfile());

    /* setup events logging */

    function getLayerLoggingInfo(layer) {
        if (layer.meta) {
            return {title: layer.meta.title};
        } else if (layer.__customLayer) {
            return {custom: true, title: layer.__customLayer.title, url: layer._url};
        }
        return null;
    }

    function getLatLngBoundsLoggingInfo(latLngBounds) {
        return {
            west: latLngBounds.getWest(),
            south: latLngBounds.getSouth(),
            east: latLngBounds.getEast(),
            north: latLngBounds.getNorth(),
        };
    }

    function getErrorLoggingInfo(error) {
        return error
            ? {
                  name: error.name,
                  message: error.message,
                  stack: error.stack,
              }
            : null;
    }

    function logUsedMaps() {
        const layers = [];
        map.eachLayer((layer) => {
            const layerInfo = getLayerLoggingInfo(layer);
            if (layerInfo) {
                layers.push(layerInfo);
            }
        });
        const bounds = map.getBounds();
        logging.logEvent('activeLayers', {
            layers,
            view: getLatLngBoundsLoggingInfo(bounds),
        });
    }

    L.DomEvent.on(document, 'mousemove click touchend', L.Util.throttle(logUsedMaps, 30000));

    printControl.on('mapRenderEnd', function(e) {
        logging.logEvent('mapRenderEnd', {
            eventId: e.eventId,
            success: e.success,
            error: getErrorLoggingInfo(e.error),
        });
    });

    printControl.on('mapRenderStart', function(e) {
        const layers = [];
        map.eachLayer((layer) => {
            const layerInfo = getLayerLoggingInfo(layer);
            if (layer.options?.print && layerInfo) {
                layers.push({
                    ...getLayerLoggingInfo(layer),
                    scaleDependent: layer.options.scaleDependent
                });
            }
        });
        logging.logEvent('mapRenderStart', {
            eventId: e.eventId,
            action: e.action,
            scale: e.scale,
            resolution: e.resolution,
            pages: e.pages.map((page) => getLatLngBoundsLoggingInfo(page.latLngBounds)),
            zooms: e.zooms,
            layers
        });
    });

    jnxControl.on('tileExportStart', function(e) {
        logging.logEvent('tileExportStart', {
            eventId: e.eventId,
            layer: getLayerLoggingInfo(e.layer),
            zoom: e.zoom,
            bounds: getLatLngBoundsLoggingInfo(e.bounds),
        });
    });

    jnxControl.on('tileExportEnd', function(e) {
        logging.logEvent('tileExportEnd', {
            eventId: e.eventId,
            success: e.success,
            error: getErrorLoggingInfo(e.error),
        });
    });

    searchControl.on('resultreceived', function(e) {
        logging.logEvent('SearchProviderSelected', {
            provider: e.provider,
            query: e.query,
        });
        if (e.provider === 'Links' && e.result.error) {
            logging.logEvent('SearchLinkError', {
                query: e.query,
                result: e.result,
            });
        }
        if (e.provider === 'Coordinates') {
            logging.logEvent('SearchCoordinates', {
                query: e.query,
                result: e.result,
            });
        }
    });

    logging.logEvent('start', startInfo);
    logUsedMaps();
}

export {setUp};
