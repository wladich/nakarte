import L from "leaflet";
import 'lib/leaflet.layer.yandex';
import 'lib/leaflet.layer.google';
import {BingLayer} from 'lib/leaflet.layer.bing';
import {BingDates} from 'lib/leaflet.layer.bing/dates';
import config from './config';
import 'lib/leaflet.layer.soviet-topomaps-grid';
import 'lib/leaflet.layer.westraPasses';
import 'lib/leaflet.layer.nordeskart';
import 'lib/leaflet.layer.wikimapia';
import {GeocachingSu} from 'lib/leaflet.layer.geocaching-su';
import {StravaHeatmap} from 'lib/leaflet.layer.strava-heatmap';

export default function getLayers() {
    const layers = [
                {
                    title: 'OpenStreetMap',
                    description: 'OSM default style',
                    isDefault: true,
                    layer: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        {
                            code: 'O',
                            isOverlay: false,
                            scaleDependent: true,
                            print: true,
                            jnx: true,
                            shortName: 'osm'
                        }
                    )
                },
                {
                    title: 'ESRI Sat',
                    isDefault: true,
                    layer: L.tileLayer(
                        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                        {
                            code: 'E',
                            isOverlay: false,
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
                    isDefault: true,
                    layer: new L.Layer.Yandex('map',
                        {
                            scaleDependent: true,
                            code: 'Y',
                            isOverlay: false,
                            print: true,
                            jnx: true,
                            shortName: 'yandex'
                        }
                    )
                },
                {
                    title: 'Yandex Satellite',
                    isDefault: true,
                    layer: new L.Layer.Yandex('sat',
                        {
                            scaleDependent: false,
                            code: 'S',
                            isOverlay: false,
                            print: true,
                            jnx: true,
                            shortName: 'yandex_sat'
                        }
                    )
                },
                {
                    title: 'Google',
                    isDefault: true,
                    layer: new L.Layer.Google('ROADMAP',
                        {
                            code: 'G',
                            isOverlay: false,
                            scaleDependent: true,
                            print: true,
                            jnx: true,
                            shortName: 'google'
                        }
                    )
                },
                {
                    title: 'Google Satellite',
                    isDefault: true,
                    layer: new L.Layer.Google('SATELLITE',
                        {
                            code: 'L',
                            isOverlay: false,
                            scaleDependent: false,
                            print: true,
                            jnx: true,
                            shortName: 'google_sat'
                        }
                    )
                },
                {
                    title: 'Google Terrain',
                    isDefault: true,
                    layer: new L.Layer.Google('TERRAIN',
                        {
                            code: 'P',
                            isOverlay: false,
                            scaleDependent: false,
                            print: true,
                            jnx: true,
                            shortName: 'google_terrain'
                        }
                    )
                },
                {
                    title: 'Bing Sat',
                    isDefault: true,
                    layer: new BingLayer(config.bingKey,
                        {
                            code: 'I',
                            isOverlay: false,
                            scaleDependent: false,
                            print: true,
                            jnx: true,
                            shortName: 'bing_sat'
                        }
                    )
                },
                {
                    title: 'marshruty.ru',
                    isDefault: true,
                    layer: L.tileLayer('https://maps.marshruty.ru/ml.ashx?x={x}&y={y}&z={z}&i=1&al=1',
                        {
                            code: 'M',
                            isOverlay: false,
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
                    isDefault: true,
                    layer: L.tileLayer(
                        'http://144.76.234.108/cgi-bin/tapp/tilecache.py/1.0.0/topomapper_v2/{z}/{x}/{y}.jpg',
                        {
                            code: 'T',
                            isOverlay: false,
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
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.me/topo001m/{z}/{x}/{y}",
                        {
                            code: 'D',
                            isOverlay: true,
                            isOverlayTransparent: false,
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
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.me/ggc2000/{z}/{x}/{y}",
                        {
                            code: 'N',
                            isOverlay: true,
                            isOverlayTransparent: false,
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
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.me/ArbaletMO/{z}/{x}/{y}",
                        {
                            code: 'A',
                            isOverlay: true,
                            isOverlayTransparent: false,
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
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.me/map_hr/{z}/{x}/{y}",
                        {
                            code: 'Q',
                            isOverlay: true,
                            isOverlayTransparent: false,
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
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.me/ggc1000/{z}/{x}/{y}",
                        {
                            code: 'J',
                            isOverlay: true,
                            isOverlayTransparent: false,
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
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.me/topo1000/{z}/{x}/{y}",
                        {
                            code: 'C',
                            isOverlay: true,
                            isOverlayTransparent: false,
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
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.me/ggc500/{z}/{x}/{y}",
                        {
                            code: 'F',
                            isOverlay: true,
                            isOverlayTransparent: false,
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
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.me/topo500/{z}/{x}/{y}",
                        {
                            code: 'B',
                            isOverlay: true,
                            isOverlayTransparent: false,
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
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.me/ggc250/{z}/{x}/{y}",
                        {
                            code: 'K',
                            isOverlay: true,
                            isOverlayTransparent: false,
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
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.me/map_podm/{z}/{x}/{y}",
                        {
                            code: 'Z',
                            isOverlay: true,
                            isOverlayTransparent: false,
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
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.me/adraces/{z}/{x}/{y}",
                        {
                            code: 'U',
                            isOverlay: true,
                            isOverlayTransparent: false,
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
                    isDefault: true,
                    layer: L.tileLayer("https://tiles.nakarte.me/osport/{z}/{x}/{y}",
                        {
                            code: 'R',
                            isOverlay: true,
                            isOverlayTransparent: false,
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
                    isDefault: true,
                    layer: new L.Layer.SovietTopoGrid({
                        code: 'Ng',
                        isOverlay: true
                    })
                },
                {
                    title: 'Wikimapia',
                    isDefault: true,
                    layer: new L.Wikimapia({
                        code: 'W',
                        isOverlay: true
                    })
                },
                {
                    title: 'Mountain passes (Westra)',
                    isDefault: true,
                    layer: new L.Layer.WestraPasses(config.westraDataBaseUrl, {
                        code: 'Wp',
                        print: true,
                        scaleDependent: true,
                        isOverlay: true,
                        isOverlayTransparent: true,
                        shortName: 'passes',
                        markersOptions: {
                            isOverlay: true,
                            isOverlayTransparent: true,
                            shortName: 'passes'
                        }
                    })
                },
                {
                    title: 'OpenTopoMap',
                    isDefault: false,
                    layer: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
                        {
                            code: 'Otm',
                            isOverlay: false,
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
                    isDefault: false,
                    layer: L.tileLayer('https://proxy.nakarte.me/https/{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=' + config.thunderforestKey,
                        {
                            code: 'Ocm',
                            isOverlay: false,
                            scaleDependent: true,
                            print: false,
                            jnx: false,
                            shortName: 'opencyclemap'
                        }
                    )
                },
                {
                    title: 'OSM Outdoors',
                    isDefault: false,
                    layer: L.tileLayer('https://proxy.nakarte.me/https/{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=' + config.thunderforestKey,
                        {
                            code: 'Oso',
                            isOverlay: false,
                            scaleDependent: true,
                            print: false,
                            jnx: false,
                            shortName: 'osm_outdoors'
                        }
                    )
                },
                {
                    title: 'Eurasia 25km',
                    description: '1975-80',
                    isDefault: false,
                    layer: L.tileLayer("https://tiles.nakarte.me/eurasia25km/{z}/{x}/{y}",
                        {
                            code: 'E25m',
                            isOverlay: true,
                            isOverlayTransparent: false,
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
                    isDefault: false,
                    layer: L.tileLayer("https://tiles.nakarte.me/new_gsh_100k/{z}/{x}/{y}",
                        {
                            code: 'NT1',
                            isOverlay: true,
                            isOverlayTransparent: false,
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
                    isDefault: false,
                    layer: L.tileLayer("https://tiles.nakarte.me/new_gsh_050k/{z}/{x}/{y}",
                        {
                            code: 'NT5',
                            isOverlay: true,
                            isOverlayTransparent: false,
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
                    isDefault: false,
                    layer: L.tileLayer("https://tiles.nakarte.me/topo250/{z}/{x}/{y}",
                        {
                            code: 'T25',
                            isOverlay: true,
                            isOverlayTransparent: false,
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
                    isDefault: false,
                    layer: L.tileLayer("https://tiles.nakarte.me/montenegro250m/{z}/{x}/{y}",
                        {
                            code: 'MN25',
                            isOverlay: true,
                            isOverlayTransparent: false,
                            tms: true,
                            maxNativeZoom: 15,
                            print: true,
                            jnx: true,
                            scaleDependent: false,
                            shortName: 'montenegro_250'
                        }
                    )
                },
                {
                    title: 'Mountains by Aleksey Tsvetkov',
                    description: 'Tian Shan, Dzungaria, <a href="http://pereval.g-utka.ru/">http://pereval.g-utka.ru/</a>',
                    isDefault: false,
                    layer: L.tileLayer("http://map.g-utka.ru/{z}/{x}/{y}.png",
                        // FIXME: сделать minZoom=5, когда перейдём на версию leaflet с поддержкой minNativeZoom
                        {
                            code: 'Mt',
                            isOverlay: true,
                            isOverlayTransparent: false,
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
                },
                {
                    title: 'Bing imagery acquisition dates',
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
                    isDefault: false,
                    layer: new GeocachingSu(config.geocachingSuUrl, {
                        code: 'Gc',
                        isOverlay: true,
                        isOverlayTransparent: true,
                        print: true,
                        jnx: false,
                        shortName: 'geocaching'
                    })
                },
                {
                    title: 'OpenStreetMap GPS traces',
                    isDefault: false,
                    layer: L.tileLayer('https://{s}.gps-tile.openstreetmap.org/lines/{z}/{x}/{y}.png',
                        {
                            code: 'Ot',
                            isOverlay: true,
                            isOverlayTransparent: true,
                            scaleDependent: true,
                            print: true,
                            jnx: false,
                            shortName: 'osm_gps_traces'
                        }
                    )
                },
                {
                    title: 'Strava heatmap (all)',
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
                {
                    // Вместо 404 отдают 500 для отсутствующих тайлов
                    title: 'Norway UT map',
                    isDefault: false,
                    layer: L.tileLayer("https://tilesprod.ut.no/tilestache/ut_topo_light/{z}/{x}/{y}.jpg",
                        {
                            code: 'Nu',
                            isOverlay: false,
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
                    isDefault: false,
                    layer: new L.TileLayer.Nordeskart('https://gatekeeper1.geonorge.no/BaatGatekeeper/gk/gk.cache_gmaps?layers=toporaster3&zoom={z}&x={x}&y={y}&gkt={baatToken}',
                        {
                            code: 'Np',
                            isOverlay: true,
                            isOverlayTransparent: false,
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
                    isDefault: false,
                    layer: new L.TileLayer.Nordeskart('https://gatekeeper1.geonorge.no/BaatGatekeeper/gk/gk.cache_gmaps?layers=topo4&zoom={z}&x={x}&y={y}&gkt={baatToken}',
                        {
                            code: 'Nm',
                            isOverlay: true,
                            isOverlayTransparent: false,
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
                    isDefault: false,
                    layer: L.tileLayer("https://tilesprod.ut.no/tilestache/dnt_sommer/{z}/{x}/{y}.png",
                        {
                            code: 'Ns',
                            isOverlay: true,
                            isOverlayTransparent: true,
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
                    isDefault: false,
                    layer: L.tileLayer("https://tilesprod.ut.no/tilestache/dnt_vinter/{z}/{x}/{y}.png",
                        {
                            code: 'Nw',
                            isOverlay: true,
                            isOverlayTransparent: true,
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
                    isDefault: false,
                    layer: L.tileLayer("https://maptiles1.finncdn.no/tileService/1.0.3/normap/{z}/{x}/{y}.png",
                        {
                            code: 'Nr',
                            isOverlay: false,
                            tms: false,
                            print: true,
                            jnx: true,
                            scaleDependent: true,
                            noCors: true,
                            shortName: 'norway_roads'
                        }
                    )
                },
                {
                    title: 'Czech base',
                    isDefault: false,
                    layer: L.tileLayer("https://m{s}.mapserver.mapy.cz/base-m/{z}-{x}-{y}",
                        {
                            code: 'Czb',
                            isOverlay: false,
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
                    isDefault: false,
                    layer: L.tileLayer("https://m{s}.mapserver.mapy.cz/turist-m/{z}-{x}-{y}",
                        {
                            code: 'Czt',
                            isOverlay: false,
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
                    isDefault: false,
                    layer: L.tileLayer("https://m{s}.mapserver.mapy.cz/turist_aquatic-m/{z}-{x}-{y}",
                        {
                            code: 'Czs',
                            isOverlay: false,
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
                    isDefault: false,
                    layer: L.tileLayer("https://m{s}.mapserver.mapy.cz/winter-m/{z}-{x}-{y}",
                        {
                            code: 'Czw',
                            isOverlay: false,
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
                    isDefault: false,
                    layer: L.tileLayer("https://m{s}.mapserver.mapy.cz/zemepis-m/{z}-{x}-{y}",
                        {
                            code: 'Czg',
                            isOverlay: false,
                            tms: false,
                            print: true,
                            jnx: true,
                            subdomains: '1234',
                            scaleDependent: true,
                            shortName: 'czech_geo'
                        }
                    )
                },
		        {
		            title: 'Finland Topo',
                    description: '<a href="https://www.retkikartta.fi/?lang=en">https://www.retkikartta.fi/</a>',
		            isDefault: false,
		            layer: L.tileLayer("https://retkikartta.fi/wmts/30c616a00f157e7357721900e8b0415c?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=maastokartta&STYLE=default&TILEMATRIXSET=WGS84_Pseudo-Mercator&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png",
		                {
		                    code: 'Fmk',
		                    isOverlay: false,
		                    tms: false,
		                    print: true,
		                    jnx: true,
		                    scaleDependent: true,
		                    shortName: 'finland_topo'
		                }
		            )
		        },
                {
                    title: 'France Topo 250m',
                    isDefault: false,
                    layer: L.tileLayer("https://wxs.ign.fr/an7nvfzojv5wa96dsga5nk8w/geoportail/wmts?layer=GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN25TOUR.CV&style=normal&tilematrixset=PM&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fjpeg&TileMatrix={z}&TileCol={x}&TileRow={y}",
                        {
                            minZoom: 6,
                            maxNativeZoom: 16,
                            bounds: [[41.29019, -4.94385], [51.23441, 9.82178]],
                            code: 'Ft',
                            isOverlay: true,
                            isOverlayTransparent: false,
                            tms: false,
                            print: true,
                            jnx: true,
                            scaleDependent: false,
                            shortName: 'france_topo_25k'
                        }
                    )
                },
                {
                    title: 'Great Britain Topo',
                    isDefault: false,
                    layer: new BingLayer(config.bingKey,
                        {
                            type: 'OrdnanceSurvey',
                            minZoom: 12,
                            maxNativeZoom: 16,
                            bounds: [[49.85171,-7.74708], [60.86949,1.80382]],
                            code: 'Gbt',
                            isOverlay: true,
                            isOverlayTransparent: false,
                            scaleDependent: false,
                            print: true,
                            jnx: true,
                            shortName: 'england_topo'
                        }
                    )
                },
                {
                    title: 'Waymarked Cycling Trails',
                    description: '<a href="https://cycling.waymarkedtrails.org/">https://cycling.waymarkedtrails.org</a>',
                    isDefault: false,
                    layer: L.tileLayer('https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png',
                        {
                            code: 'Wc',
                            isOverlay: true,
                            tms: false,
                            print: true,
                            jnx: false,
                            scaleDependent: true,
                            shortName: 'cycling_trails',
                            isOverlayTransparent: true
                        })
                },
                {
                    title: 'Waymarked Hiking Trails',
                    description: '<a href="https://hiking.waymarkedtrails.org/">https://hiking.waymarkedtrails.org</a>',
                    isDefault: false,
                    layer: L.tileLayer('https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png',
                        {
                            code: 'Wh',
                            isOverlay: true,
                            tms: false,
                            print: true,
                            jnx: false,
                            scaleDependent: true,
                            shortName: 'hiking_trails',
                            isOverlayTransparent: true
                        })
                },
    ];

    const groupsDefs = [
        {
            title: 'Default layers',
            layers: [
                'OpenStreetMap',
                'ESRI Sat',
                'Yandex map',
                'Yandex Satellite',
                'Google',
                'Google Satellite',
                'Google Terrain',
                'Bing Sat',
                'marshruty.ru',
                'Topomapper 1km',
                'Topo 10km',
                'GGC 2 km',
                'ArbaletMO',
                'Slazav mountains',
                'GGC 1km',
                'Topo 1km',
                'GGC 500m',
                'Topo 500m',
                'GGC 250m',
                'Slazav map',
                'Races',
                'O-sport',
                'Soviet topo maps grid',
                'Wikimapia',
                'Mountain passes (Westra)'
            ],
        },
        {
            title: 'OpenStreetMap alternatives',
            layers: [
                'OpenTopoMap',
                'OpenCycleMap',
                'OSM Outdoors'],
        },
        {
            title: 'Topo maps',
            layers: [
                'Eurasia 25km',
                'Caucasus 1km',
                'Caucasus 500m',
                'Topo 250m',
                'Montenegro topo 250m',
                'Finland Topo',
                'France Topo 250m',
                'Great Britain Topo',
            ],
        },
        {
            title: 'Miscellaneous',
            layers: [
                'Mountains by Aleksey Tsvetkov',
                'Bing imagery acquisition dates',
                'geocaching.su']
        },
        {
            title: 'Routes and traces',
            layers: [
                'Waymarked Hiking Trails',
                'Waymarked Cycling Trails',
                'OpenStreetMap GPS traces',
                'Strava heatmap (all)',
                'Strava heatmap (run)',
                'Strava heatmap (ride)',
                'Strava heatmap (winter)',
                'Strava heatmap lowres (all)',
                'Strava heatmap lowres (run)',
                'Strava heatmap lowres (ride)',
                'Strava heatmap lowres (winter)'],

        },
        {
            title: 'Norway <a href="https://www.ut.no/kart/">https://www.ut.no/kart/</a>',
            layers: [
                'Norway UT map',
                'Norway paper map',
                'Norway map',
                'Norway summer trails',
                'Norway winter trails',
                'Norway roads'],

        },
        {
            title: 'Czech <a href="https://mapy.cz">https://mapy.cz</a>',
            layers: [
                'Czech base',
                'Czech tourist',
                'Czech summer',
                'Czech winter',
                'Czech geographical'],

        },
    ];


    const titlesByOrder = [
        // common base layers
        'OpenStreetMap',
        'OpenTopoMap',
        'OpenCycleMap',
        'OSM Outdoors',
        'ESRI Sat',
        'Yandex map',
        'Yandex Satellite',
        'Google',
        'Google Satellite',
        'Google Terrain',
        'Bing Sat',
        'marshruty.ru',
        'Topomapper 1km',

        // local base layers
        'Czech base',
        'Czech tourist',
        'Czech summer',
        'Czech winter',
        'Czech geographical',
        'Norway UT map',
        'Finland Topo',

        // map overlays
        '#custom-bottom',
        'Norway roads',
        'Eurasia 25km',
        'Topo 10km',
        'GGC 2 km',
        'ArbaletMO',
        'Norway paper map',
        'Norway map',
        'Mountains by Aleksey Tsvetkov',
        'Slazav mountains',
        'GGC 1km',
        'Topo 1km',
        'Caucasus 1km',
        'Great Britain Topo',
        'GGC 500m',
        'Topo 500m',
        'Caucasus 500m',
        'GGC 250m',
        'Topo 250m',
        'Montenegro topo 250m',
        'France Topo 250m',
        'Slazav map',
        'Races',
        'O-sport',
        '#custom-top',

        // line overlays
        'Waymarked Hiking Trails',
        'Waymarked Cycling Trails',
        'Norway summer trails',
        'Norway winter trails',
        'Bing imagery acquisition dates',
        'OpenStreetMap GPS traces',
        'Strava heatmap (all)',
        'Strava heatmap (run)',
        'Strava heatmap (ride)',
        'Strava heatmap (winter)',
        'Strava heatmap lowres (all)',
        'Strava heatmap lowres (run)',
        'Strava heatmap lowres (ride)',
        'Strava heatmap lowres (winter)',
        'Soviet topo maps grid',
        'Wikimapia',

        // point overlays
        'Mountain passes (Westra)',
        'geocaching.su',
    ];

    // set metadata
    for (let layer of layers) {
        layer.layer.meta = {title: layer.title}
    }

    // assign order to layers
    const orderByTitle = {};
    for (let i=0; i < titlesByOrder.length; i++) {
        let title = titlesByOrder[i];
        orderByTitle[title] = i + 1;
    }

    for (let layer of layers) {
        const title = layer.title;
        layer.order = orderByTitle[title];
        if (!layer.order) {
            throw new Error(`Layer title not found in titlesByOrder list: ${title}`)
        }
    }

    // divide layers by groups
    const grouppedLayers = [];
    const layersByTitle = {};
    for (let layer of layers) {
        layersByTitle[layer.title] = layer;
    }
    for (let groupDef of groupsDefs) {
        let group = {group: groupDef.title, layers: []};
        grouppedLayers.push(group);
        for (let title of groupDef.layers) {
            let layer = layersByTitle[title];
            if (!layer) {
                throw new Error(`Unknown layer in groups definitions: ${title}`)
            }
            group.layers.push(layer);
        }
    }

    // TODO: move it to tests
    const codes = new Set();
    const titles = new Set();
    const shortNames = new Set();
    for (let layer of layers) {
        const {title, layer: {options}} = layer;
        if (!options) {
            throw new Error(`Layer without options: ${layer.title}`);
        }
        if (titles.has(title)) {
            throw new Error(`Duplicate layer title "${title}"`);
        }
        titles.add(title);
        const {
            code,
            shortName,
            print,
            isOverlay,
            isOverlayTransparent
        } = options;
        if (!code) {
            throw new Error('Layer without code: ' + layer.title);
        }
        if (codes.has(code)) {
            throw new Error(`Duplicate layer code "${code}"`);
        }
        codes.add(code);

        if (print) {
            if (isOverlay && (isOverlayTransparent === undefined)) {
                throw new Error('Overlay layer without isOverlayTransparent: ' + layer.title);
            }
            if (!shortName) {
                throw new Error('Layer without shortName: ' + layer.title);
            }
            if (shortNames.has(shortName)) {
                throw new Error(`Duplicate layer shortName: "${shortName}"`);
            }
            shortNames.add(shortName);
        }
    }

    // check order definition
    let seenOverlay = false;
    for (let title of titlesByOrder) {
        if (title[0] !== '#') {
            if (!titles.has(title)) {
                throw new Error(`Unknown layer title in order list: ${title}`);
            }
            let isOverlay = layersByTitle[title];
            if (isOverlay) {
                seenOverlay = true;
            } else {
                if (seenOverlay) {
                    throw new Error(`Base layer after overlays: ${title}`);
                }
            }
        }
    }
    // check groups definitions
    const seenLayerTitles = new Set();
    for (let group of groupsDefs) {
        for (let title of group.layers) {
            if (seenLayerTitles.has(title)) {
                throw new Error(`Duplicate layer in groups definition: ${title}`)
            }
            seenLayerTitles.add(title);
        }
    }
    // unknown layers in groupsDefs already checked, check only that all layers assigned to groups
    for (let title of titles) {
        if (!seenLayerTitles.has(title)) {
            throw new Error(`Layer not assigned to any group: ${title}`);
        }
    }

    return {
        layers: grouppedLayers,
        customLayersOrder: {
            top: orderByTitle['#custom-top'],
            bottom: orderByTitle['#custom-bottom'],

        }};
}

