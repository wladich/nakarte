import L from "leaflet";
import 'lib/leaflet.layer.yandex';
import 'lib/leaflet.layer.google';
import {BingLayer} from 'lib/leaflet.layer.bing';
import {BingDates} from 'lib/leaflet.layer.bing/dates';
import config from './config';
import 'lib/leaflet.layer.soviet-topomaps-grid';
import 'lib/leaflet.layer.westraPasses';
import 'lib/leaflet.layer.nordeskart';
// import 'lib/leaflet.layer.tracks-collection';
import 'lib/leaflet.layer.wikimapia';
import {GeocachingSu} from 'lib/leaflet.layer.geocaching-su';
import {StravaHeatmap} from 'lib/leaflet.layer.strava-heatmap';

export default function getLayers() {
    const layers = [
        {
            group: 'Default layers',
            layers: [
                {
                    title: 'OpenStreetMap',
                    description: 'OSM default style',
                    shortName: 'osm',
                    order: 100,
                    isOverlay: false,
                    isDefault: true,
                    layer: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        {code: 'O', scaleDependent: true, print: true, jnx: true}
                    )
                },
                {
                    title: 'ESRI Sat',
                    shortName: 'esri',
                    order: 200,
                    isOverlay: false,
                    isDefault: true,
                    layer: L.tileLayer(
                        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                        {code: 'E', scaleDependent: false, maxNativeZoom: 18, print: true, jnx: true}
                    )
                },
                {
                    title: 'Yandex map',
                    shortName: 'yandex',
                    order: 300,
                    isOverlay: false,
                    isDefault: true,
                    layer: new L.Layer.Yandex('map', {scaleDependent: true, code: 'Y', print: true, jnx: true})
                },
                {
                    title: 'Yandex Satellite',
                    shortName: 'yandex_sat',
                    order: 400,
                    isOverlay: false,
                    isDefault: true,
                    layer: new L.Layer.Yandex('sat', {scaleDependent: false, code: 'S', print: true, jnx: true})
                },
                {
                    title: 'Google',
                    shortName: 'google',
                    order: 500,
                    isOverlay: false,
                    isDefault: true,
                    layer: new L.Layer.Google('ROADMAP', {code: 'G', scaleDependent: true, print: true, jnx: true})
                },
                {
                    title: 'Google Satellite',
                    shortName: 'google_sat',
                    order: 600,
                    isOverlay: false,
                    isDefault: true,
                    layer: new L.Layer.Google('SATELLITE', {code: 'L', scaleDependent: false, print: true, jnx: true})
                },
                {
                    title: 'Google Terrain',
                    shortName: 'google_terrain',
                    order: 650,
                    isOverlay: false,
                    isDefault: true,
                    layer: new L.Layer.Google('TERRAIN', {code: 'P', scaleDependent: false, print: true, jnx: true})
                },
                {
                    title: 'Bing Sat',
                    shortName: 'bing',
                    order: 700,
                    isOverlay: false,
                    isDefault: true,
                    layer: new BingLayer(config.bingKey, {code: 'I', scaleDependent: false, print: true, jnx: true})
                },

                {
                    title: 'marshruty.ru',
                    shortName: 'marshruty',
                    order: 800,
                    isOverlay: false,
                    isDefault: true,
                    layer: L.tileLayer('https://maps.marshruty.ru/ml.ashx?x={x}&y={y}&z={z}&i=1&al=1',
                        {code: 'M', maxNativeZoom: 18, noCors: true, scaleDependent: true, print: true, jnx: true}
                    )
                },
                {
                    title: 'Topomapper 1km',
                    shortName: 'topomapper_1k',
                    order: 900,
                    isOverlay: false,
                    isDefault: true,
                    layer: L.tileLayer(
                        'http://144.76.234.108/cgi-bin/tapp/tilecache.py/1.0.0/topomapper_v2/{z}/{x}/{y}.jpg',
                        {code: 'T', scaleDependent: false, maxNativeZoom: 13, noCors: true, print: true, jnx: true}
                    )
                },

                {
                    title: 'Topo 10km',
                    shortName: 'topo_10k',
                    order: 10100,
                    isOverlay: true,
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.tk/topo001m/{z}/{x}/{y}",
                        {code: 'D', tms: true, scaleDependent: false, maxNativeZoom: 9, print: true, jnx: true}
                    )
                },
                {
                    title: 'GGC 2 km',
                    shortName: 'ggc_2k',
                    order: 10200,
                    isOverlay: true,
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.tk/ggc2000/{z}/{x}/{y}",
                        {code: 'N', tms: true, scaleDependent: false, maxNativeZoom: 12, print: true, jnx: true}
                    )
                },
                {
                    title: 'ArbaletMO',
                    shortName: 'arbalet',
                    order: 10300,
                    isOverlay: true,
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.tk/ArbaletMO/{z}/{x}/{y}",
                        {code: 'A', tms: true, scaleDependent: false, maxNativeZoom: 13, print: true, jnx: true}
                    )
                },
                {
                    title: 'Slazav mountains',
                    shortName: 'slazav_mountains',
                    order: 10400,
                    isOverlay: true,
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.tk/map_hr/{z}/{x}/{y}",
                        {code: 'Q', tms: true, scaleDependent: false, maxNativeZoom: 13, print: true, jnx: true}
                    )
                },
                {
                    title: 'GGC 1km',
                    shortName: 'ggc_1k',
                    order: 10500,
                    isOverlay: true,
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.tk/ggc1000/{z}/{x}/{y}",
                        {code: 'J', tms: true, scaleDependent: false, maxNativeZoom: 13, print: true, jnx: true}
                    )
                },
                {
                    title: 'Topo 1km',
                    shortName: 'topo_1k',
                    order: 10600,
                    isOverlay: true,
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.tk/topo1000/{z}/{x}/{y}",
                        {code: 'C', tms: true, scaleDependent: false, maxNativeZoom: 13, print: true, jnx: true}
                    )
                },
                {
                    title: 'GGC 500m',
                    shortName: 'ggc_500',
                    order: 10700,
                    isOverlay: true,
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.tk/ggc500/{z}/{x}/{y}",
                        {code: 'F', tms: true, scaleDependent: false, maxNativeZoom: 14, print: true, jnx: true}
                    )
                },
                {
                    title: 'Topo 500m',
                    shortName: 'topo_500',
                    order: 10800,
                    isOverlay: true,
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.tk/topo500/{z}/{x}/{y}",
                        {code: 'B', tms: true, scaleDependent: false, maxNativeZoom: 14, print: true, jnx: true}
                    )
                },
                {
                    title: 'GGC 250m',
                    shortName: 'ggc_250',
                    order: 10900,
                    isOverlay: true,
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.tk/ggc250/{z}/{x}/{y}",
                        {code: 'K', tms: true, scaleDependent: false, maxNativeZoom: 15, print: true, jnx: true}
                    )
                },
                {
                    title: 'Slazav map',
                    shortName: 'slazav',
                    order: 11000,
                    isOverlay: true,
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.tk/map_podm/{z}/{x}/{y}",
                        {code: 'Z', tms: true, scaleDependent: false, maxNativeZoom: 14, print: true, jnx: true}
                    )
                },
                {
                    title: 'Races',
                    shortName: 'races',
                    order: 11050,
                    isOverlay: true,
                    isOverlayTransparent: true,
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.tk/adraces/{z}/{x}/{y}",
                        {code: 'U', tms: true, scaleDependent: false, maxNativeZoom: 15, print: true, jnx: true}
                    )
                },
                {
                    title: 'O-sport',
                    shortName: 'osport',
                    order: 11100,
                    isOverlay: true,
                    isOverlayTransparent: true,
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.tk/osport/{z}/{x}/{y}",
                        {code: 'R', tms: true, scaleDependent: false, maxNativeZoom: 17, print: true, jnx: true}
                    )
                },
                {
                    title: 'Soviet topo maps grid',
                    shortName: 'soviet_topo_grid',
                    order: 11200,
                    isOverlay: true,
                    isDefault: true,
                    layer: new L.Layer.SovietTopoGrid({code: 'Ng'})
                },
                {
                    title: 'Wikimapia',
                    shortName: 'wikimapia',
                    order: 11300,
                    isOverlay: true,
                    isDefault: true,
                    layer: new L.Wikimapia({code: 'W'}),
                },
                {
                    title: 'Mountain passes (Westra)',
                    shortName: 'westra',
                    order: 11400,
                    isOverlay: true,
                    isOverlayTransparent: true,
                    isDefault: true,
                    layer: new L.Layer.WestraPasses(config.westraDataBaseUrl, {
                            code: 'Wp',
                            print: true,
                            scaleDependent: true
                        }
                    )
                },
                // {
                //     title: 'Tracks',
                //     order: 1150,
                //     isOverlay: true,
                //     isDefault: true,
                //     layer: new L.TracksCollection({
                //             tms: true,
                //             maxNativeZoom: 12,
                //             code: 'Tc',
                //             print: false,
                //         }
                //     )
                // },
            ]
        },
        {
            group: 'OpenStreetMap alternatives',
            layers: [
                {
                    title: 'OpenTopoMap',
                    shortName: 'opentopo',
                    order: 110,
                    isOverlay: false,
                    isDefault: false,
                    layer: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
                        {code: 'Otm', maxNativeZoom: 17, scaleDependent: true, print: true, jnx: true, noCors: false}
                    )
                },
                {
                    title: 'OpenCycleMap',
                    shortName: 'ocm',
                    description: '<a href="https://www.opencyclemap.org/docs/">(Info and key)</a>',
                    order: 120,
                    isOverlay: false,
                    isDefault: false,
                    layer: L.tileLayer('https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=' + config.thunderforestKey,
                        {code: 'Ocm', scaleDependent: true, print: true, jnx: true}
                    )
                },
                {
                    title: 'OSM Outdoors',
                    shortName: 'osm_outdoors',
                    order: 130,
                    isOverlay: false,
                    isDefault: false,
                    layer: L.tileLayer('https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=' + config.thunderforestKey,
                        {code: 'Oso', scaleDependent: true, print: true, jnx: true}
                    )
                },
            ]
        },
        {
            group: 'Topo maps',
            layers: [
                {
                    title: 'Eurasia 25km',
                    shortName: 'eurasia_25k',
                    description: '1975-80',
                    order: 10090,
                    isOverlay: true,
                    isDefault: false,
                    layer: L.tileLayer("https://tiles.nakarte.tk/eurasia25km/{z}/{x}/{y}",
                        {code: 'E25m', tms: true, maxNativeZoom: 9, print: true, jnx: true, scaleDependent: false}
                    )
                },
                {
                    title: 'Caucasus 1km',
                    shortName: 'caucasus_1k',
                    order: 10610,
                    isOverlay: true,
                    isDefault: false,
                    layer: L.tileLayer("https://tiles.nakarte.tk/new_gsh_100k/{z}/{x}/{y}",
                        {code: 'NT1', tms: true, maxNativeZoom: 14, print: true, jnx: true, scaleDependent: false}
                    )
                },
                {
                    title: 'Caucasus 500m',
                    shortName: 'caucasus_500',
                    order: 10810,
                    isOverlay: true,
                    isDefault: false,
                    layer: L.tileLayer("https://tiles.nakarte.tk/new_gsh_050k/{z}/{x}/{y}",
                        {code: 'NT5', tms: true, maxNativeZoom: 15, print: true, jnx: true, scaleDependent: false}
                    )
                },
                {
                    title: 'Topo 250m',
                    shortName: 'topo_250',
                    order: 10950,
                    isOverlay: true,
                    isDefault: false,
                    layer: L.tileLayer("https://tiles.nakarte.tk/topo250/{z}/{x}/{y}",
                        {code: 'T25', tms: true, maxNativeZoom: 15, print: true, jnx: true, scaleDependent: false}
                    )
                },
                {
                    title: 'Montenegro topo 250m',
                    shortName: 'montenegro_250',
                    description: '1970-72',
                    order: 10960,
                    isOverlay: true,
                    isDefault: false,
                    layer: L.tileLayer("https://tiles.nakarte.tk/montenegro250m/{z}/{x}/{y}",
                        {code: 'MN25', tms: true, maxNativeZoom: 15, print: true, jnx: true, scaleDependent: false}
                    )
                }
            ]
        },
        {
            group: 'Mountains maps',
            layers: [
                {
                    title: 'Mountains by Aleksey Tsvetkov',
                    shortName: 'tsvetkov_mountains',
                    description: 'Tian Shan, Dzungaria, <a href="http://pereval.g-utka.ru/">http://pereval.g-utka.ru/</a>',
                    order: 10390,
                    isOverlay: true,
                    isDefault: false,
                    layer: L.tileLayer("http://map.g-utka.ru/{z}/{x}/{y}.png",
                        // FIXME: сделать minZoom=5, когда перейдём на версию leaflet с поддержкой minNativeZoom
                        {
                            code: 'Mt',
                            tms: false,
                            minZoom: 7,
                            minNativeZoom: 7,
                            maxNativeZoom: 15,
                            print: true,
                            jnx: true,
                            scaleDependent: false,
                            noCors: true
                        }
                    )
                }]
        },
        {
            group: 'Miscellaneous',
            layers: [
                {
                    title: 'Bing imagery acquisition dates',
                    shortName: 'bind_dates',
                    order: 11110,
                    isOverlay: true,
                    isDefault: false,
                    layer: new BingDates({
                        code: 'Bd',
                        maxNativeZoom: 18,
                        print: false,
                        jnx: false,
                        scaleDependent: false,
                        noCors: true
                    })
                },
                {
                    title: 'geocaching.su',
                    shortName: 'geocaching',
                    order: 11500,
                    isOverlay: true,
                    isDefault: false,
                    layer: new GeocachingSu(config.geocachingSuUrl, {
                        code: 'Gc',
                        print: true,
                        jnx: false
                    })
                },
                {
                    title: 'OpenStreetMap GPS traces',
                    shortName: 'osm_gps_traces',
                    order: 11120,
                    isOverlay: true,
                    isDefault: false,
                    layer: L.tileLayer('https://{s}.gps-tile.openstreetmap.org/lines/{z}/{x}/{y}.png',
                        {code: 'Ot', scaleDependent: true, print: true, jnx: false}
                    )
                },
                {
                    title: 'Strava heatmap (all)',
                    shortName: 'strava',
                    order: 11130,
                    isOverlay: true,
                    isDefault: false,
                    layer: new StravaHeatmap('https://heatmap-external-{s}.strava.com/tiles-auth/all/hot/{z}/{x}/{y}.png?px=256',
                        {code: 'Sa', scaleDependent: true, print: false, jnx: false, subdomains: 'abc',
                         maxNativeZoom: 16, noCors: true}
                    )
                },
                {
                    title: 'Strava heatmap (run)',
                    shortName: 'strava_run',
                    order: 11131,
                    isOverlay: true,
                    isDefault: false,
                    layer: new StravaHeatmap('https://heatmap-external-{s}.strava.com/tiles-auth/run/hot/{z}/{x}/{y}.png?px=256',
                        {code: 'Sr', scaleDependent: true, print: false, jnx: false, subdomains: 'abc',
                         maxNativeZoom: 16, noCors: true}
                    )
                },
                {
                    title: 'Strava heatmap (ride)',
                    shortName: 'strava_ride',
                    order: 11132,
                    isOverlay: true,
                    isDefault: false,
                    layer: new StravaHeatmap('https://heatmap-external-{s}.strava.com/tiles-auth/ride/hot/{z}/{x}/{y}.png?px=256',
                        {code: 'Sb', scaleDependent: true, print: false, jnx: false, subdomains: 'abc',
                         maxNativeZoom: 16, noCors: true}
                    )
                },
                {
                    title: 'Strava heatmap (winter)',
                    shortName: 'strava_winter',
                    order: 11133,
                    isOverlay: true,
                    isDefault: false,
                    layer: new StravaHeatmap('https://heatmap-external-{s}.strava.com/tiles-auth/winter/hot/{z}/{x}/{y}.png?px=256',
                        {code: 'Sw', scaleDependent: true, print: false, jnx: false, subdomains: 'abc',
                         maxNativeZoom: 16, noCors: true}
                    )
                },
                {
                    title: 'Strava heatmap lowres (all)',
                    shortName: 'strava_lowres',
                    order: 11134,
                    isOverlay: true,
                    isDefault: false,
                    layer: L.tileLayer('https://heatmap-external-{s}.strava.com/tiles/all/hot/{z}/{x}/{y}.png?px=256',
                        {code: 'Sal', scaleDependent: true, print: false, jnx: false, subdomains: 'abc',
                         maxNativeZoom: 12, noCors: true}
                    )
                },
                {
                    title: 'Strava heatmap lowres (run)',
                    shortName: 'strava_lowres_run',
                    order: 11135,
                    isOverlay: true,
                    isDefault: false,
                    layer: L.tileLayer('https://heatmap-external-{s}.strava.com/tiles/run/hot/{z}/{x}/{y}.png?px=256',
                        {code: 'Srl', scaleDependent: true, print: false, jnx: false, subdomains: 'abc',
                         maxNativeZoom: 12, noCors: true}
                    )
                },
                {
                    title: 'Strava heatmap lowres (ride)',
                    shortName: 'strava_lowres_ride',
                    order: 11136,
                    isOverlay: true,
                    isDefault: false,
                    layer: L.tileLayer('https://heatmap-external-{s}.strava.com/tiles/ride/hot/{z}/{x}/{y}.png?px=256',
                        {code: 'Sbl', scaleDependent: true, print: false, jnx: false, subdomains: 'abc',
                         maxNativeZoom: 12, noCors: true}
                    )
                },
                {
                    title: 'Strava heatmap lowres (winter)',
                    shortName: 'strava_lowres_winter',
                    order: 11137,
                    isOverlay: true,
                    isDefault: false,
                    layer: L.tileLayer('https://heatmap-external-{s}.strava.com/tiles/winter/hot/{z}/{x}/{y}.png?px=256',
                        {code: 'Swl', scaleDependent: true, print: false, jnx: false, subdomains: 'abc',
                         maxNativeZoom: 12, noCors: true}
                    )
                },
            ]
        },

        {
            group: 'Norway <a href="https://www.ut.no/kart/">https://www.ut.no/kart/</a>',
            layers: [
                {
                    // Вместо 404 отдают 500 для отсутствующих тайлов
                    title: 'Norway UT map',
                    shortName: 'norway_ut',
                    order: 5000,
                    isOverlay: false,
                    isDefault: false,
                    layer: L.tileLayer("https://tilesprod.ut.no/tilestache/ut_topo_light/{z}/{x}/{y}.jpg",
                        {code: 'Nu', tms: false, maxNativeZoom: 16, print: true, jnx: true, scaleDependent: true, noCors: false}
                    )
                },
                {
                    title: 'Norway paper map',
                    shortName: 'norway_paper',
                    order: 10310,
                    isOverlay: true,
                    isDefault: false,
                    layer: new L.TileLayer.Nordeskart('https://gatekeeper1.geonorge.no/BaatGatekeeper/gk/gk.cache_gmaps?layers=toporaster3&zoom={z}&x={x}&y={y}&gkt={baatToken}',
                        {code: 'Np', maxNativeZoom: 16, tms: false, print: true, jnx: true, scaleDependent: true}
                    )
                },
                {
                    title: 'Norway map',
                    shortName: 'norway',
                    order: 10320,
                    isOverlay: true,
                    isDefault: false,
                    layer: new L.TileLayer.Nordeskart('https://gatekeeper1.geonorge.no/BaatGatekeeper/gk/gk.cache_gmaps?layers=topo4&zoom={z}&x={x}&y={y}&gkt={baatToken}',
                        {code: 'Nm', tms: false, print: true, jnx: true, scaleDependent: true}
                    )
                },
                {
                    title: 'Norway summer trails',
                    shortName: 'norway_summer',
                    order: 20000,
                    isOverlay: true,
                    isDefault: false,
                    layer: L.tileLayer("https://tilesprod.ut.no/tilestache/dnt_sommer/{z}/{x}/{y}.png",
                        {code: 'Ns', tms: false, print: true, jnx: true, scaleDependent: true, noCors: false}
                    )
                },
                {
                    title: 'Norway winter trails',
                    shortName: 'norway_winter',
                    order: 20010,
                    isOverlay: true,
                    isDefault: false,
                    layer: L.tileLayer("https://tilesprod.ut.no/tilestache/dnt_vinter/{z}/{x}/{y}.png",
                        {code: 'Nw', tms: false, print: true, jnx: true, scaleDependent: true, noCors: false}
                    )
                },
                {
                    // Вместо 404 отдают 500 для отсутствующих тайлов
                    title: 'Norway roads',
                    shortName: 'norway_roads',
                    description: '<a href="https://kart.finn.no/">https://kart.finn.no/</a>',
                    order: 5030,
                    isOverlay: false,
                    isDefault: false,
                    layer: L.tileLayer("https://maptiles1.finncdn.no/tileService/1.0.3/normap/{z}/{x}/{y}.png",
                        {code: 'Nr', tms: false, print: true, jnx: true, scaleDependent: true, noCors: true}
                    )
                }]
        },
        {
            group: 'Czech <a href="https://mapy.cz">https://mapy.cz</a>',
            layers: [
                {
                    title: 'Czech base',
                    shortName: 'czech',
                    order: 5040,
                    isOverlay: false,
                    isDefault: false,
                    layer: L.tileLayer("https://m{s}.mapserver.mapy.cz/base-m/{z}-{x}-{y}",
                        {code: 'Czb', tms: false, print: true, jnx: true, subdomains: '1234', scaleDependent: true}
                    )
                },
                {
                    title: 'Czech tourist',
                    shortName: 'czech_tourist',
                    order: 5050,
                    isOverlay: false,
                    isDefault: false,
                    layer: L.tileLayer("https://m{s}.mapserver.mapy.cz/turist-m/{z}-{x}-{y}",
                        {code: 'Czt', tms: false, print: true, jnx: true, subdomains: '1234', scaleDependent: true}
                    )
                },
                {
                    title: 'Czech summer',
                    shortName: 'czech_summer',
                    order: 5060,
                    isOverlay: false,
                    isDefault: false,
                    layer: L.tileLayer("https://m{s}.mapserver.mapy.cz/turist_aquatic-m/{z}-{x}-{y}",
                        {code: 'Czs', tms: false, print: true, jnx: true, subdomains: '1234', scaleDependent: true}
                    )
                },
                {
                    title: 'Czech winter',
                    shortName: 'czech_winter',
                    order: 5070,
                    isOverlay: false,
                    isDefault: false,
                    layer: L.tileLayer("https://m{s}.mapserver.mapy.cz/winter-m/{z}-{x}-{y}",
                        {code: 'Czw', tms: false, print: true, jnx: true, subdomains: '1234', scaleDependent: true}
                    )
                },
                {
                    title: 'Czech geographical',
                    shortName: 'czech_geo',
                    order: 5080,
                    isOverlay: false,
                    isDefault: false,
                    layer: L.tileLayer("https://m{s}.mapserver.mapy.cz/zemepis-m/{z}-{x}-{y}",
                        {code: 'Czg', tms: false, print: true, jnx: true, subdomains: '1234', scaleDependent: true}
                    )
                }]
        }
    ];
    // TODO: move it to tests
    const codes = {};
    const orders = {};
    const shortNames = new Set();
    for (let group of layers) {
        for (let layer of group.layers) {
            if (!layer.layer.options) {
                throw new Error('Layer without options: ' + layer.title);
            }
            let code = layer.layer.options.code;
            if (!code) {
                throw new Error('Layer without code: ' + layer.title);
            }
            if (code in codes) {
                throw new Error(`Duplicate layer code "${code}"`);
            }
            codes[code] = 1;
            let order = layer.order;
            if (!order) {
                throw new Error('Layer without order: ' + layer.title);
            }
            if (order in orders) {
                throw new Error(`Duplicate layer order "${order}"`);
            }
            orders[order] = 1;
            let shortName = layer.shortName;
            if (!shortName) {
                throw new Error('Layer without shortName: ' + layer.title);
            }
            if (shortNames.has(shortName)) {
                throw new Error(`Duplicate layer shortName "${shortName}"`);
            }
            shortNames.add(shortName);
        }
    }
    return layers;
}

