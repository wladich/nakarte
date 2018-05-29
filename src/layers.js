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
                    order: 100,
                    isDefault: true,
                    layer: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        {
                            code: 'O',
                            scaleDependent: true,
                            print: true,
                            jnx: true,
                            shortName: 'osm'
                        }
                    )
                },
                {
                    title: 'ESRI Sat',
                    order: 200,
                    isDefault: true,
                    layer: L.tileLayer(
                        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                        {
                            code: 'E',
                            scaleDependent: false,
                            maxNativeZoom: 18,
                            print: true,
                            jnx: true,
                            shortName: 'esri'
                        }
                    )
                },
                {
                    title: 'Yandex map',
                    order: 300,
                    isDefault: true,
                    layer: new L.Layer.Yandex('map',
                        {
                            scaleDependent: true,
                            code: 'Y',
                            print: true,
                            jnx: true,
                            shortName: 'yandex'
                        }
                    )
                },
                {
                    title: 'Yandex Satellite',
                    order: 400,
                    isDefault: true,
                    layer: new L.Layer.Yandex('sat',
                        {
                            scaleDependent: false,
                            code: 'S',
                            print: true,
                            jnx: true,
                            shortName: 'yandex_sat'
                        }
                    )
                },
                {
                    title: 'Google',
                    order: 500,
                    isDefault: true,
                    layer: new L.Layer.Google('ROADMAP',
                        {
                            code: 'G',
                            scaleDependent: true,
                            print: true,
                            jnx: true,
                            shortName: 'google'
                        }
                    )
                },
                {
                    title: 'Google Satellite',
                    order: 600,
                    isDefault: true,
                    layer: new L.Layer.Google('SATELLITE',
                        {
                            code: 'L',
                            scaleDependent: false,
                            print: true,
                            jnx: true,
                            shortName: 'google_sat'
                        }
                    )
                },
                {
                    title: 'Google Terrain',
                    order: 650,
                    isDefault: true,
                    layer: new L.Layer.Google('TERRAIN',
                        {
                            code: 'P',
                            scaleDependent: false,
                            print: true,
                            jnx: true,
                            shortName: 'google_terrain'
                        }
                    )
                },
                {
                    title: 'Bing Sat',
                    order: 700,
                    isDefault: true,
                    layer: new BingLayer(config.bingKey,
                        {
                            code: 'I',
                            scaleDependent: false,
                            print: true,
                            jnx: true,
                            shortName: 'bing'
                        }
                    )
                },

                {
                    title: 'marshruty.ru',
                    order: 800,
                    isDefault: true,
                    layer: L.tileLayer('https://maps.marshruty.ru/ml.ashx?x={x}&y={y}&z={z}&i=1&al=1',
                        {
                            code: 'M',
                            maxNativeZoom: 18,
                            noCors: true,
                            scaleDependent: true,
                            print: true,
                            jnx: true,
                            shortName: 'marshruty'
                        }
                    )
                },
                {
                    title: 'Topomapper 1km',
                    order: 900,
                    isDefault: true,
                    layer: L.tileLayer(
                        'http://144.76.234.108/cgi-bin/tapp/tilecache.py/1.0.0/topomapper_v2/{z}/{x}/{y}.jpg',
                        {
                            code: 'T',
                            scaleDependent: false,
                            maxNativeZoom: 13,
                            noCors: true,
                            print: true,
                            jnx: true,
                            shortName: 'topomapper_1k'
                        }
                    )
                },

                {
                    title: 'Topo 10km',
                    order: 10100,
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.tk/topo001m/{z}/{x}/{y}",
                        {
                            code: 'D',
                            isOverlay: true,
                            tms: true,
                            scaleDependent: false,
                            maxNativeZoom: 9,
                            print: true,
                            jnx: true,
                            shortName: 'topo_10k'
                        }
                    )
                },
                {
                    title: 'GGC 2 km',
                    order: 10200,
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.tk/ggc2000/{z}/{x}/{y}",
                        {
                            code: 'N',
                            isOverlay: true,
                            tms: true,
                            scaleDependent: false,
                            maxNativeZoom: 12,
                            print: true,
                            jnx: true,
                            shortName: 'ggc_2k'
                        }
                    )
                },
                {
                    title: 'ArbaletMO',
                    order: 10300,
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.tk/ArbaletMO/{z}/{x}/{y}",
                        {
                            code: 'A',
                            isOverlay: true,
                            tms: true,
                            scaleDependent: false,
                            maxNativeZoom: 13,
                            print: true,
                            jnx: true,
                            shortName: 'arbalet'
                        }
                    )
                },
                {
                    title: 'Slazav mountains',
                    order: 10400,
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.tk/map_hr/{z}/{x}/{y}",
                        {
                            code: 'Q',
                            isOverlay: true,
                            tms: true,
                            scaleDependent: false,
                            maxNativeZoom: 13,
                            print: true,
                            jnx: true,
                            shortName: 'slazav_mountains'
                        }
                    )
                },
                {
                    title: 'GGC 1km',
                    order: 10500,
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.tk/ggc1000/{z}/{x}/{y}",
                        {
                            code: 'J',
                            isOverlay: true,
                            tms: true,
                            scaleDependent: false,
                            maxNativeZoom: 13,
                            print: true,
                            jnx: true,
                            shortName: 'ggc_1k'
                        }
                    )
                },
                {
                    title: 'Topo 1km',
                    order: 10600,
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.tk/topo1000/{z}/{x}/{y}",
                        {
                            code: 'C',
                            isOverlay: true,
                            tms: true,
                            scaleDependent: false,
                            maxNativeZoom: 13,
                            print: true,
                            jnx: true,
                            shortName: 'topo_1k'
                        }
                    )
                },
                {
                    title: 'GGC 500m',
                    order: 10700,
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.tk/ggc500/{z}/{x}/{y}",
                        {
                            code: 'F',
                            isOverlay: true,
                            tms: true,
                            scaleDependent: false,
                            maxNativeZoom: 14,
                            print: true,
                            jnx: true,
                            shortName: 'ggc_500'
                        }
                    )
                },
                {
                    title: 'Topo 500m',
                    order: 10800,
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.tk/topo500/{z}/{x}/{y}",
                        {
                            code: 'B',
                            isOverlay: true,
                            tms: true,
                            scaleDependent: false,
                            maxNativeZoom: 14,
                            print: true,
                            jnx: true,
                            shortName: 'topo_500'
                        }
                    )
                },
                {
                    title: 'GGC 250m',
                    order: 10900,
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.tk/ggc250/{z}/{x}/{y}",
                        {
                            code: 'K',
                            isOverlay: true,
                            tms: true,
                            scaleDependent: false,
                            maxNativeZoom: 15,
                            print: true,
                            jnx: true,
                            shortName: 'ggc_250'
                        }
                    )
                },
                {
                    title: 'Slazav map',
                    order: 11000,
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.tk/map_podm/{z}/{x}/{y}",
                        {
                            code: 'Z',
                            isOverlay: true,
                            tms: true,
                            scaleDependent: false,
                            maxNativeZoom: 14,
                            print: true,
                            jnx: true,
                            shortName: 'slazav'
                        }
                    )
                },
                {
                    title: 'Races',
                    order: 11050,
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.tk/adraces/{z}/{x}/{y}",
                        {
                            code: 'U',
                            isOverlay: true,
                            isOverlayTransparent: true,
                            tms: true,
                            scaleDependent: false,
                            maxNativeZoom: 15,
                            print: true,
                            jnx: true,
                            shortName: 'races'
                        }
                    )
                },
                {
                    title: 'O-sport',
                    order: 11100,
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.tk/osport/{z}/{x}/{y}",
                        {
                            code: 'R',
                            isOverlay: true,
                            isOverlayTransparent: true,
                            tms: true,
                            scaleDependent: false,
                            maxNativeZoom: 17,
                            print: true,
                            jnx: true,
                            shortName: 'osport'
                        }
                    )
                },
                {
                    title: 'Soviet topo maps grid',
                    order: 11200,
                    isDefault: true,
                    layer: new L.Layer.SovietTopoGrid({
                        code: 'Ng',
                        isOverlay: true,
                        shortName: 'soviet_topo_grid'
                    })
                },
                {
                    title: 'Wikimapia',
                    order: 11300,
                    isDefault: true,
                    layer: new L.Wikimapia({
                        code: 'W',
                        isOverlay: true,
                        shortName: 'wikimapia'
                    })
                },
                {
                    title: 'Mountain passes (Westra)',
                    order: 11400,
                    isDefault: true,
                    layer: new L.Layer.WestraPasses(config.westraDataBaseUrl, {
                            code: 'Wp',
                            isOverlay: true,
                            isOverlayTransparent: true,
                            print: true,
                            scaleDependent: true,
                            shortName: 'westra'
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
                    order: 110,
                    isDefault: false,
                    layer: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
                        {
                            code: 'Otm',
                            maxNativeZoom: 17,
                            scaleDependent: true,
                            print: true,
                            jnx: true,
                            noCors: false,
                            shortName: 'opentopo'
                        }
                    )
                },
                {
                    title: 'OpenCycleMap',
                    description: '<a href="https://www.opencyclemap.org/docs/">(Info and key)</a>',
                    order: 120,
                    isDefault: false,
                    layer: L.tileLayer('https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=' + config.thunderforestKey,
                        {
                            code: 'Ocm',
                            scaleDependent: true,
                            print: true,
                            jnx: true,
                            shortName: 'ocm'
                        }
                    )
                },
                {
                    title: 'OSM Outdoors',
                    order: 130,
                    isDefault: false,
                    layer: L.tileLayer('https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=' + config.thunderforestKey,
                        {
                            code: 'Oso',
                            scaleDependent: true,
                            print: true,
                            jnx: true,
                            shortName: 'osm_outdoors'
                        }
                    )
                },
            ]
        },
        {
            group: 'Topo maps',
            layers: [
                {
                    title: 'Eurasia 25km',
                    description: '1975-80',
                    order: 10090,
                    isDefault: false,
                    layer: L.tileLayer("https://tiles.nakarte.tk/eurasia25km/{z}/{x}/{y}",
                        {
                            code: 'E25m',
                            isOverlay: true,
                            tms: true,
                            maxNativeZoom: 9,
                            print: true,
                            jnx: true,
                            scaleDependent: false,
                            shortName: 'eurasia_25k'
                        }
                    )
                },
                {
                    title: 'Caucasus 1km',
                    order: 10610,
                    isDefault: false,
                    layer: L.tileLayer("https://tiles.nakarte.tk/new_gsh_100k/{z}/{x}/{y}",
                        {
                            code: 'NT1',
                            isOverlay: true,
                            tms: true,
                            maxNativeZoom: 14,
                            print: true,
                            jnx: true,
                            scaleDependent: false,
                            shortName: 'caucasus_1k'
                        }
                    )
                },
                {
                    title: 'Caucasus 500m',
                    order: 10810,
                    isDefault: false,
                    layer: L.tileLayer("https://tiles.nakarte.tk/new_gsh_050k/{z}/{x}/{y}",
                        {
                            code: 'NT5',
                            isOverlay: true,
                            tms: true,
                            maxNativeZoom: 15,
                            print: true,
                            jnx: true,
                            scaleDependent: false,
                            shortName: 'caucasus_500'
                        }
                    )
                },
                {
                    title: 'Topo 250m',
                    order: 10950,
                    isDefault: false,
                    layer: L.tileLayer("https://tiles.nakarte.tk/topo250/{z}/{x}/{y}",
                        {
                            code: 'T25',
                            isOverlay: true,
                            tms: true,
                            maxNativeZoom: 15,
                            print: true,
                            jnx: true,
                            scaleDependent: false,
                            shortName: 'topo_250'
                        }
                    )
                },
                {
                    title: 'Montenegro topo 250m',
                    description: '1970-72',
                    order: 10960,
                    isDefault: false,
                    layer: L.tileLayer("https://tiles.nakarte.tk/montenegro250m/{z}/{x}/{y}",
                        {
                            code: 'MN25',
                            isOverlay: true,
                            tms: true,
                            maxNativeZoom: 15,
                            print: true,
                            jnx: true,
                            scaleDependent: false,
                            shortName: 'montenegro_250'
                        }
                    )
                }
            ]
        },
        {
            group: 'Mountains maps',
            layers: [
                {
                    title: 'Mountains by Aleksey Tsvetkov',
                    description: 'Tian Shan, Dzungaria, <a href="http://pereval.g-utka.ru/">http://pereval.g-utka.ru/</a>',
                    order: 10390,
                    isDefault: false,
                    layer: L.tileLayer("http://map.g-utka.ru/{z}/{x}/{y}.png",
                        // FIXME: сделать minZoom=5, когда перейдём на версию leaflet с поддержкой minNativeZoom
                        {
                            code: 'Mt',
                            isOverlay: true,
                            tms: false,
                            minZoom: 7,
                            minNativeZoom: 7,
                            maxNativeZoom: 15,
                            print: true,
                            jnx: true,
                            scaleDependent: false,
                            noCors: true,
                            shortName: 'tsvetkov_mountains'
                        }
                    )
                }]
        },
        {
            group: 'Miscellaneous',
            layers: [
                {
                    title: 'Bing imagery acquisition dates',
                    order: 11110,
                    isDefault: false,
                    layer: new BingDates({
                        code: 'Bd',
                        isOverlay: true,
                        maxNativeZoom: 18,
                        print: false,
                        jnx: false,
                        scaleDependent: false,
                        noCors: true
                    })
                },
                {
                    title: 'geocaching.su',
                    order: 11500,
                    isDefault: false,
                    layer: new GeocachingSu(config.geocachingSuUrl, {
                        code: 'Gc',
                        isOverlay: true,
                        print: true,
                        jnx: false,
                        shortName: 'geocaching'
                    })
                },
                {
                    title: 'OpenStreetMap GPS traces',
                    order: 11120,
                    isDefault: false,
                    layer: L.tileLayer('https://{s}.gps-tile.openstreetmap.org/lines/{z}/{x}/{y}.png',
                        {
                            code: 'Ot',
                            isOverlay: true,
                            scaleDependent: true,
                            print: true,
                            jnx: false,
                            shortName: 'osm_gps_traces'
                        }
                    )
                },
                {
                    title: 'Strava heatmap (all)',
                    order: 11130,
                    isDefault: false,
                    layer: new StravaHeatmap('https://heatmap-external-{s}.strava.com/tiles-auth/all/hot/{z}/{x}/{y}.png?px=256',
                        {
                            code: 'Sa',
                            isOverlay: true,
                            scaleDependent: true,
                            print: false,
                            jnx: false,
                            subdomains: 'abc',
                            maxNativeZoom: 16,
                            noCors: true
                        }
                    )
                },
                {
                    title: 'Strava heatmap (run)',
                    order: 11131,
                    isDefault: false,
                    layer: new StravaHeatmap('https://heatmap-external-{s}.strava.com/tiles-auth/run/hot/{z}/{x}/{y}.png?px=256',
                        {
                            code: 'Sr',
                            isOverlay: true,
                            scaleDependent: true,
                            print: false,
                            jnx: false,
                            subdomains: 'abc',
                            maxNativeZoom: 16,
                            noCors: true
                        }
                    )
                },
                {
                    title: 'Strava heatmap (ride)',
                    order: 11132,
                    isDefault: false,
                    layer: new StravaHeatmap('https://heatmap-external-{s}.strava.com/tiles-auth/ride/hot/{z}/{x}/{y}.png?px=256',
                        {
                            code: 'Sb',
                            isOverlay: true,
                            scaleDependent: true,
                            print: false,
                            jnx: false,
                            subdomains: 'abc',
                            maxNativeZoom: 16,
                            noCors: true
                        }
                    )
                },
                {
                    title: 'Strava heatmap (winter)',
                    order: 11133,
                    isDefault: false,
                    layer: new StravaHeatmap('https://heatmap-external-{s}.strava.com/tiles-auth/winter/hot/{z}/{x}/{y}.png?px=256',
                        {
                            code: 'Sw',
                            isOverlay: true,
                            scaleDependent: true,
                            print: false,
                            jnx: false,
                            subdomains: 'abc',
                            maxNativeZoom: 16,
                            noCors: true
                        }
                    )
                },
                {
                    title: 'Strava heatmap lowres (all)',
                    order: 11134,
                    isDefault: false,
                    layer: L.tileLayer('https://heatmap-external-{s}.strava.com/tiles/all/hot/{z}/{x}/{y}.png?px=256',
                        {
                            code: 'Sal',
                            isOverlay: true,
                            scaleDependent: true,
                            print: false,
                            jnx: false,
                            subdomains: 'abc',
                            maxNativeZoom: 12,
                            noCors: true
                        }
                    )
                },
                {
                    title: 'Strava heatmap lowres (run)',
                    order: 11135,
                    isDefault: false,
                    layer: L.tileLayer('https://heatmap-external-{s}.strava.com/tiles/run/hot/{z}/{x}/{y}.png?px=256',
                        {
                            code: 'Srl',
                            isOverlay: true,
                            scaleDependent: true,
                            print: false,
                            jnx: false,
                            subdomains: 'abc',
                            maxNativeZoom: 12,
                            noCors: true
                        }
                    )
                },
                {
                    title: 'Strava heatmap lowres (ride)',
                    order: 11136,
                    isDefault: false,
                    layer: L.tileLayer('https://heatmap-external-{s}.strava.com/tiles/ride/hot/{z}/{x}/{y}.png?px=256',
                        {
                            code: 'Sbl',
                            isOverlay: true,
                            scaleDependent: true,
                            print: false,
                            jnx: false,
                            subdomains: 'abc',
                            maxNativeZoom: 12,
                            noCors: true
                        }
                    )
                },
                {
                    title: 'Strava heatmap lowres (winter)',
                    order: 11137,
                    isDefault: false,
                    layer: L.tileLayer('https://heatmap-external-{s}.strava.com/tiles/winter/hot/{z}/{x}/{y}.png?px=256',
                        {
                            code: 'Swl',
                            isOverlay: true,
                            scaleDependent: true,
                            print: false,
                            jnx: false,
                            subdomains: 'abc',
                            maxNativeZoom: 12,
                            noCors: true
                        }
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
                    order: 5000,
                    isDefault: false,
                    layer: L.tileLayer("https://tilesprod.ut.no/tilestache/ut_topo_light/{z}/{x}/{y}.jpg",
                        {
                            code: 'Nu',
                            tms: false,
                            maxNativeZoom: 16,
                            print: true,
                            jnx: true,
                            scaleDependent: true,
                            noCors: false,
                            shortName: 'norway_ut'
                        }
                    )
                },
                {
                    title: 'Norway paper map',
                    order: 10310,
                    isDefault: false,
                    layer: new L.TileLayer.Nordeskart('https://gatekeeper1.geonorge.no/BaatGatekeeper/gk/gk.cache_gmaps?layers=toporaster3&zoom={z}&x={x}&y={y}&gkt={baatToken}',
                        {
                            code: 'Np',
                            isOverlay: true,
                            maxNativeZoom: 16,
                            tms: false,
                            print: true,
                            jnx: true,
                            scaleDependent: true,
                            shortName: 'norway_paper'
                        }
                    )
                },
                {
                    title: 'Norway map',
                    order: 10320,
                    isDefault: false,
                    layer: new L.TileLayer.Nordeskart('https://gatekeeper1.geonorge.no/BaatGatekeeper/gk/gk.cache_gmaps?layers=topo4&zoom={z}&x={x}&y={y}&gkt={baatToken}',
                        {
                            code: 'Nm',
                            isOverlay: true,
                            tms: false,
                            print: true,
                            jnx: true,
                            scaleDependent: true,
                            shortName: 'norway'
                        }
                    )
                },
                {
                    title: 'Norway summer trails',
                    order: 20000,
                    isDefault: false,
                    layer: L.tileLayer("https://tilesprod.ut.no/tilestache/dnt_sommer/{z}/{x}/{y}.png",
                        {
                            code: 'Ns',
                            isOverlay: true,
                            tms: false,
                            print: true,
                            jnx: true,
                            scaleDependent: true,
                            noCors: false,
                            shortName: 'norway_summer'
                        }
                    )
                },
                {
                    title: 'Norway winter trails',
                    order: 20010,
                    isDefault: false,
                    layer: L.tileLayer("https://tilesprod.ut.no/tilestache/dnt_vinter/{z}/{x}/{y}.png",
                        {
                            code: 'Nw',
                            isOverlay: true,
                            tms: false,
                            print: true,
                            jnx: true,
                            scaleDependent: true,
                            noCors: false,
                            shortName: 'norway_winter'
                        }
                    )
                },
                {
                    // Вместо 404 отдают 500 для отсутствующих тайлов
                    title: 'Norway roads',
                    description: '<a href="https://kart.finn.no/">https://kart.finn.no/</a>',
                    order: 5030,
                    isDefault: false,
                    layer: L.tileLayer("https://maptiles1.finncdn.no/tileService/1.0.3/normap/{z}/{x}/{y}.png",
                        {
                            code: 'Nr',
                            tms: false,
                            print: true,
                            jnx: true,
                            scaleDependent: true,
                            noCors: true,
                            shortName: 'norway_roads'
                        }
                    )
                }]
        },
        {
            group: 'Czech <a href="https://mapy.cz">https://mapy.cz</a>',
            layers: [
                {
                    title: 'Czech base',
                    order: 5040,
                    isDefault: false,
                    layer: L.tileLayer("https://m{s}.mapserver.mapy.cz/base-m/{z}-{x}-{y}",
                        {
                            code: 'Czb',
                            tms: false,
                            print: true,
                            jnx: true,
                            subdomains: '1234',
                            scaleDependent: true,
                            shortName: 'czech'
                        }
                    )
                },
                {
                    title: 'Czech tourist',
                    order: 5050,
                    isDefault: false,
                    layer: L.tileLayer("https://m{s}.mapserver.mapy.cz/turist-m/{z}-{x}-{y}",
                        {
                            code: 'Czt',
                            tms: false,
                            print: true,
                            jnx: true,
                            subdomains: '1234',
                            scaleDependent: true,
                            shortName: 'czech_tourist'
                        }
                    )
                },
                {
                    title: 'Czech summer',
                    order: 5060,
                    isDefault: false,
                    layer: L.tileLayer("https://m{s}.mapserver.mapy.cz/turist_aquatic-m/{z}-{x}-{y}",
                        {
                            code: 'Czs',
                            tms: false,
                            print: true,
                            jnx: true,
                            subdomains: '1234',
                            scaleDependent: true,
                            shortName: 'czech_summer'
                        }
                    )
                },
                {
                    title: 'Czech winter',
                    order: 5070,
                    isDefault: false,
                    layer: L.tileLayer("https://m{s}.mapserver.mapy.cz/winter-m/{z}-{x}-{y}",
                        {
                            code: 'Czw',
                            tms: false,
                            print: true,
                            jnx: true,
                            subdomains: '1234',
                            scaleDependent: true,
                            shortName: 'czech_winter'
                        }
                    )
                },
                {
                    title: 'Czech geographical',
                    order: 5080,
                    isDefault: false,
                    layer: L.tileLayer("https://m{s}.mapserver.mapy.cz/zemepis-m/{z}-{x}-{y}",
                        {
                            code: 'Czg',
                            tms: false,
                            print: true,
                            jnx: true,
                            subdomains: '1234',
                            scaleDependent: true,
                            shortName: 'czech_geo'
                        }
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
            const { layer: { options } } = layer
            if (!options) {
                throw new Error('Layer without options: ' + layer.title);
            }
            const {
                code,
                shortName,
                print
            } = options
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

            if (print) {
              if (!shortName) {
                  throw new Error('Layer without shortName: ' + layer.title);
              }
              if (shortNames.has(shortName)) {
                  throw new Error(`Duplicate layer shortName "${shortName}"`);
              }
              shortNames.add(shortName);
            }
        }
    }
    return layers;
}

