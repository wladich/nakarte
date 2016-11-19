import L from "leaflet";
import 'lib/leaflet.layer.yandex/yandex';
import 'lib/leaflet.layer.google/google';
import 'lib/leaflet.layer.bing/bing';
import config from './config';
import 'lib/leaflet.layer.soviet-topomaps-grid/soviet-topomaps-grid';

function getBaseMaps() {
    return {
        'OpenStreetMap': L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {code: 'O', scaleDependent: true, print: true, jnx: true}
        ),
        'ESRI Sat': L.tileLayer(
            'http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            {code: 'E', maxNativeZoom: 17, print: true, jnx: true}
        ),
        'Yandex': new L.Layer.Yandex('map', {scaleDependent: true, code: 'Y', print: true, jnx: true}),
        'Yandex Sat': new L.Layer.Yandex('sat', {scaleDependent: false, code: 'S', print: true, jnx: true}),
        'Google': new L.Layer.Google('ROADMAP', {code: 'G', scaleDependent: true, print: true, jnx: true}),
        'Google Sat': new L.Layer.Google('SATELLITE', {code: 'L', print: true, jnx: true}),
        'Bing Sat': L.bingLayer(config.bingKey, {code: 'I', print: true, jnx: true}),
        'marshruty.ru': L.tileLayer('http://maps.marshruty.ru/ml.ashx?x={x}&y={y}&z={z}&i=1&al=1',
            {code: 'M', maxNativeZoom: 18, noCors: true, scaleDependent: true, print: true, jnx: true}
        ),
        'Topomapper 1km': L.tileLayer(
            'http://144.76.234.107//cgi-bin/ta/tilecache.py/1.0.0/topomapper_v2/{z}/{x}/{y}.jpg',
            {code: 'T', maxNativeZoom: 13, noCors: true, print: true, jnx: true}
        )
    };
}

function getOverlays() {
    return {
        "Topo 10km": new L.TileLayer("http://{s}.tiles.nakarte.tk/topo001m/{z}/{x}/{y}",
            {code: 'D', tms: true, maxNativeZoom: 9, print: true, jnx: true}),
        "GGC 2 km": new L.TileLayer("http://{s}.tiles.nakarte.tk/ggc2000/{z}/{x}/{y}",
            {code: 'N', tms: true, maxNativeZoom: 15, print: true, jnx: true}),
        "ArbaletMO": new L.TileLayer("http://{s}.tiles.nakarte.tk/ArbaletMO/{z}/{x}/{y}",
            {code: 'A', tms: true, maxNativeZoom: 13, print: true, jnx: true}),
        "Slazav mountains": new L.TileLayer("http://{s}.tiles.nakarte.tk/map_hr/{z}/{x}/{y}",
            {code: 'Q', tms: true, maxNativeZoom: 13, print: true, jnx: true}),
        "GGC 1km": new L.TileLayer("http://{s}.tiles.nakarte.tk/ggc1000/{z}/{x}/{y}",
            {code: 'J', tms: true, maxNativeZoom: 13, print: true, jnx: true}),
        "Topo 1km": new L.TileLayer("http://{s}.tiles.nakarte.tk/topo1000/{z}/{x}/{y}",
            {code: 'C', tms: true, maxNativeZoom: 13, print: true, jnx: true}),
        "GGC 500m": new L.TileLayer("http://{s}.tiles.nakarte.tk/ggc500/{z}/{x}/{y}",
            {code: 'F', tms: true, maxNativeZoom: 14, print: true, jnx: true}),
        "Topo 500m": new L.TileLayer("http://{s}.tiles.nakarte.tk/topo500/{z}/{x}/{y}",
            {code: 'B', tms: true, maxNativeZoom: 14, print: true, jnx: true}),
        "GGC 250m": new L.TileLayer("http://{s}.tiles.nakarte.tk/ggc250/{z}/{x}/{y}",
            {code: 'K', tms: true, maxNativeZoom: 15, print: true, jnx: true}),
        "Slazav map": new L.TileLayer("http://{s}.tiles.nakarte.tk/map_podm/{z}/{x}/{y}",
            {code: 'Z', tms: true, maxNativeZoom: 14, print: true, jnx: true}),
        "O-sport": new L.TileLayer("http://{s}.tiles.nakarte.tk/osport/{z}/{x}/{y}",
            {code: 'R', tms: true, maxNativeZoom: 17, print: true, jnx: true}),
        "Soviet topo maps grid": new L.Layer.SovietTopoGrid({code: 'Ng'}),
        // "Wikimapia": new L.Wikimapia({code: 'W', zIndexOffset: 10000}),
        // "Google Street View": new L.GoogleStreetView('street-view', {print: true, code: 'Gs', zIndexOffset: 10000}),
        // "Mountain passes (Westra)": new L.WestraPasses('/westraPasses/', {code: 'Wp', print: true, zIndexOffset: 10000})
    };
}

export default {getBaseMaps, getOverlays};