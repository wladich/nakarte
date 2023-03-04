import L from "leaflet";
import '~/lib/leaflet.layer.yandex';
import '~/lib/leaflet.layer.google';
import {BingLayer} from '~/lib/leaflet.layer.bing';
import config from './config';
import '~/lib/leaflet.layer.soviet-topomaps-grid';
import '~/lib/leaflet.layer.westraPasses';
import '~/lib/leaflet.layer.wikimapia';
import {GeocachingSu} from '~/lib/leaflet.layer.geocaching-su';
import {RetinaTileLayer} from '~/lib/leaflet.layer.RetinaTileLayer';
import urlViaCorsProxy from '~/lib/CORSProxy';
import '~/lib/leaflet.layer.TileLayer.cutline';
import {getCutline} from '~/lib/layers-cutlines';
import {LayerCutlineOverview} from '~/lib/leaflet.layer.LayerCutlineOverview';

class LayerGroupWithOptions extends L.LayerGroup {
    constructor(layers, options) {
        super(layers);
        L.setOptions(this, options);
    }
}

    const layersDefs = [
                {
                    title: 'OpenStreetMap',
                    description: 'OSM default style',
                    isDefault: true,
                    layer: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                        {
                            code: 'O',
                            isOverlay: false,
                            scaleDependent: true,
                            print: true,
                            jnx: true,
                            shortName: 'osm',
                            attribution: '<a href="https://www.openstreetmap.org/copyright">' +
                                '&copy; OpenStreetMap contributors</a>',
                        }
                    )
                },
                {
                    title: 'ESRI Satellite',
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
                            shortName: 'esri',
                            attribution:
                                '<a href="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9">' +
                                'ESRI World Imagery for ArcGIS</a>',
                        }
                    )
                },
                {
                    title: 'Yandex map',
                    isDefault: true,
                    layer: new L.Layer.Yandex.Map(
                        {
                            scaleDependent: true,
                            code: 'Y',
                            isOverlay: false,
                            print: true,
                            jnx: true,
                            shortName: 'yandex',
                            attribution: '<a href="https://yandex.ru/maps/">Yandex</a>',
                        }
                    )
                },
                {
                    title: 'Yandex Satellite',
                    isDefault: true,
                    layer: new L.Layer.Yandex.Sat(
                        {
                            scaleDependent: false,
                            code: 'S',
                            isOverlay: false,
                            print: true,
                            jnx: true,
                            shortName: 'yandex_sat',
                            attribution: '<a href="https://yandex.ru/maps/?l=sat">Yandex</a>',
                        }
                    )
                },
                {
                    title: 'Google Map',
                    isDefault: true,
                    layer: new L.Layer.GoogleMap(
                        {
                            code: 'G',
                            isOverlay: false,
                            scaleDependent: true,
                            print: true,
                            jnx: true,
                            shortName: 'google',
                            attribution: '<a href="https://www.google.com/maps">Google</a>',
                        }
                    )
                },
                {
                    title: 'Google Hybrid',
                    isDefault: false,
                    layer: new L.Layer.GoogleHybrid(
                        {
                            code: 'Gh',
                            isOverlay: true,
                            scaleDependent: true,
                            print: true,
                            jnx: false,
                            shortName: 'google_hybrid',
                            isOverlayTransparent: true,
                            attribution: '<a href="https://www.google.com/maps/@43.0668619,60.5738071,13622628m' +
                                '/data=!3m1!1e3">Google</a>',
                        }
                    )
                },
                {
                    title: 'Google Satellite',
                    isDefault: true,
                    layer: new L.Layer.GoogleSat(
                        {
                            code: 'L',
                            isOverlay: false,
                            scaleDependent: false,
                            print: true,
                            jnx: true,
                            shortName: 'google_sat',
                            attribution: '<a href="https://www.google.com/maps/@43.0668619,60.5738071,13622628m' +
                                '/data=!3m1!1e3">Google</a>',
                        }
                    )
                },
                {
                    title: 'Google Terrain',
                    isDefault: true,
                    layer: new L.Layer.GoogleTerrain({
                            code: 'P',
                            isOverlay: false,
                            scaleDependent: false,
                            print: true,
                            jnx: true,
                            shortName: 'google_terrain',
                            attribution: '<a href="https://www.google.com/maps/@43.1203575,42.1105049,9.58z' +
                                '/data=!5m1!1e4">Google</a>',
                        }
                    )
                },
                {
                    title: 'Bing Satellite',
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
                    title: 'Topomapper 1km',
                    isDefault: true,
                    layer: L.tileLayer(
                        urlViaCorsProxy(
                            'http://88.99.52.155/cgi-bin/tapp/tilecache.py/1.0.0/topomapper_v2/{z}/{x}/{y}.jpg'
                        ),
                        {
                            code: 'T',
                            isOverlay: false,
                            scaleDependent: false,
                            maxNativeZoom: 13,
                            noCors: false,
                            print: true,
                            jnx: true,
                            shortName: 'topomapper_1k',
                            attribution: '<a href="https://play.google.com/store/apps/' +
                                'details?id=com.atlogis.sovietmaps.free&hl=en&gl=US">Russian Topo Maps</a>',
                        }
                    )
                },

                {
                    title: 'Topo 10km',
                    isDefault: true,
                    layer: L.tileLayer("https://{s}.tiles.nakarte.me/topo001m/{z}/{x}/{y}",
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
                    layer: L.tileLayer("https://{s}.tiles.nakarte.me/ggc2000/{z}/{x}/{y}",
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
                    layer: L.tileLayer("https://{s}.tiles.nakarte.me/ArbaletMO/{z}/{x}/{y}",
                        {
                            code: 'A',
                            isOverlay: true,
                            isOverlayTransparent: false,
                            tms: true,
                            scaleDependent: false,
                            maxNativeZoom: 13,
                            print: true,
                            jnx: true,
                            shortName: 'arbalet',
                            attribution:
                                '<a href="http://www.velozona.ru/forums/showmessage.php?id=3370">Arbalet (2004)</a>',
                        }
                    )
                },
                {
                    title: 'Slazav mountains',
                    isDefault: true,
                    layer: L.tileLayer("https://slazav.xyz/tiles/hr/{x}-{y}-{z}.png",
                        {
                            code: 'Q',
                            isOverlay: true,
                            isOverlayTransparent: false,
                            tms: false,
                            scaleDependent: false,
                            maxNativeZoom: 13,
                            noCors: true,
                            print: true,
                            jnx: true,
                            shortName: 'slazav_mountains',
                            attribution: '<a href="http://slazav.xyz/maps">Vladislav Zavjalov</a>',
                        }
                    )
                },
                {
                    title: 'GGC 1km',
                    isDefault: true,
                    layer: L.tileLayer("https://{s}.tiles.nakarte.me/ggc1000/{z}/{x}/{y}",
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
                    layer: L.tileLayer("https://{s}.tiles.nakarte.me/topo1000/{z}/{x}/{y}",
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
                    layer: L.tileLayer("https://{s}.tiles.nakarte.me/ggc500/{z}/{x}/{y}",
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
                    layer: L.tileLayer("https://{s}.tiles.nakarte.me/topo500/{z}/{x}/{y}",
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
                    layer: L.tileLayer("https://{s}.tiles.nakarte.me/ggc250/{z}/{x}/{y}",
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
                    title: 'Slazav Moscow region map',
                    isDefault: true,
                    layer: L.tileLayer("https://slazav.xyz/tiles/podm/{x}-{y}-{z}.png",
                        {
                            code: 'Z',
                            isOverlay: true,
                            isOverlayTransparent: false,
                            tms: false,
                            scaleDependent: false,
                            maxNativeZoom: 14,
                            noCors: true,
                            print: true,
                            jnx: true,
                            shortName: 'slazav',
                            attribution: '<a href="http://slazav.xyz/maps">Vladislav Zavjalov</a>',
                        }
                    )
                },
                {
                    title: 'Races',
                    isDefault: true,
                    layer: L.tileLayer("https://{s}.tiles.nakarte.me/adraces/{z}/{x}/{y}",
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
                    layer: L.tileLayer("https://{s}.tiles.nakarte.me/osport/{z}/{x}/{y}",
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
                        isOverlay: true,
                        print: false,
                        jnx: false
                    })
                },
                {
                    title: 'Wikimapia',
                    isDefault: true,
                    layer: new L.Wikimapia({
                        code: 'W',
                        isOverlay: true,
                        print: false,
                        jnx: false,
                        attribution: '<a href="https://wikimapia.org/">Wikimapia</a>',
                        tilesBaseUrl: config.wikimapiaTilesBaseUrl,
                    })
                },
                {
                    title: 'Mountain passes (Westra)',
                    isDefault: true,
                    layer: new L.Layer.WestraPasses(config.westraDataBaseUrl, {
                        code: 'Wp',
                        print: true,
                        jnx: false,
                        scaleDependent: true,
                        isOverlay: true,
                        isOverlayTransparent: true,
                        shortName: 'passes',
                        markersOptions: {
                            isOverlay: true,
                            isOverlayTransparent: true,
                            shortName: 'passes'
                        },
                        attribution: '<a href="http://westra.ru/passes/">Westra passes catalog</a>',
                    })
                },
                {
                    title: 'OpenTopoMap',
                    isDefault: false,
                    layer: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
                        {
                            code: 'Otm',
                            isOverlay: false,
                            maxNativeZoom: 15,
                            scaleDependent: true,
                            print: true,
                            jnx: true,
                            noCors: false,
                            shortName: 'opentopo',
                            attribution: '<a href="https://opentopomap.org/">OpenTopoMap</a>',
                            hotkey: 'V',
                        }
                    )
                },
                {
                    title: 'OpenCycleMap',
                    description: '<a href="https://www.opencyclemap.org/docs/">(Info and key)</a>',
                    isDefault: false,
                    layer: L.tileLayer('https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png',
                        {
                            code: 'Ocm',
                            isOverlay: false,
                            scaleDependent: true,
                            print: true,
                            jnx: true,
                            shortName: 'opencyclemap',
                            attribution: '<a href="https://www.opencyclemap.org/">Thunderforest OpenCycleMap</a>',
                        }
                    )
                },
                {
                    title: 'OSM Outdoors',
                    isDefault: false,
                    layer: L.tileLayer('https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png',
                        {
                            code: 'Oso',
                            isOverlay: false,
                            scaleDependent: true,
                            print: true,
                            jnx: true,
                            shortName: 'osm_outdoors',
                            attribution:
                                '<a href="https://www.thunderforest.com/maps/outdoors/">Thunderforest Outdoors</a>',
                        }
                    )
                },
                {
                    title: 'Eurasia 25km',
                    description: '1975-80',
                    isDefault: false,
                    layer: L.tileLayer("https://{s}.tiles.nakarte.me/eurasia25km/{z}/{x}/{y}",
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
                    layer: L.tileLayer("https://{s}.tiles.nakarte.me/new_gsh_100k/{z}/{x}/{y}",
                        {
                            code: 'NT1',
                            isOverlay: true,
                            isOverlayTransparent: false,
                            tms: true,
                            maxNativeZoom: 14,
                            print: true,
                            jnx: true,
                            scaleDependent: false,
                            shortName: 'caucasus_1k',
                            attribution: '<a href="http://genshtab-yuga.narod.ru/">Topo maps (2006)</a>',
                        }
                    )
                },
                {
                    title: 'Caucasus 500m',
                    isDefault: false,
                    layer: L.tileLayer("https://{s}.tiles.nakarte.me/new_gsh_050k/{z}/{x}/{y}",
                        {
                            code: 'NT5',
                            isOverlay: true,
                            isOverlayTransparent: false,
                            tms: true,
                            maxNativeZoom: 15,
                            print: true,
                            jnx: true,
                            scaleDependent: false,
                            shortName: 'caucasus_500',
                            attribution: '<a href="http://genshtab-yuga.narod.ru/">Topo maps (1998 - 2003)</a>',
                        }
                    )
                },
                {
                    title: 'Topo 250m',
                    isDefault: false,
                    layer: L.tileLayer("https://{s}.tiles.nakarte.me/topo250/{z}/{x}/{y}",
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
                    layer: L.tileLayer("https://{s}.tiles.nakarte.me/montenegro250m/{z}/{x}/{y}",
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
                    description:
                        'Tian Shan, Dzungaria, <a href="http://pereval.g-utka.ru/">http://pereval.g-utka.ru/</a>',
                    isDefault: true,
                    layer: new LayerGroupWithOptions(
                        [
                            L.tileLayer(
                                urlViaCorsProxy(
                                    'http://nakartetiles.s3-website.eu-central-1.amazonaws.com/{z}/{x}/{y}.png'
                                ),
                                {
                                    isOverlay: true,
                                    isOverlayTransparent: false,
                                    tms: false,
                                    minZoom: 2,
                                    maxNativeZoom: 15,
                                    print: true,
                                    jnx: true,
                                    scaleDependent: false,
                                    noCors: false,
                                    shortName: 'tsvetkov_mountains',
                                    cutline: getCutline('tsvetkov_mountains'),
                                    bounds: [
                                        [40.66664, 71.00007],
                                        [45.33338, 81.00001],
                                    ],
                                    attribution: '<a href="http://pereval.g-utka.ru/">Aleksey Tsvetkov</a>',
                                }
                            ),
                            new LayerCutlineOverview(getCutline('tsvetkov_mountains'), 6,
                                'Mountains by Aleksey Tsvetkov'),
                        ],
                        {
                            code: 'Mt',
                            isOverlay: true,
                            isWrapper: true,
                        }
                    ),
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
                        shortName: 'geocaching',
                        attribution: '<a href="https://geocaching.su/">geocaching.su</a>',
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
                            shortName: 'osm_gps_traces',
                            attribution: '<a href="https://www.openstreetmap.org/#&layers=G">' +
                                'OpenStreetMap public GPS traces</a>',
                        }
                    )
                },
                {
                    title: 'Strava heatmap (all)',
                    isDefault: false,
                    layer: new RetinaTileLayer(
                        [
                            urlViaCorsProxy(
                                'https://heatmap-external-a.strava.com/tiles-auth/all/hot/{z}/{x}/{y}.png?px=256'
                            ),
                            urlViaCorsProxy(
                                'https://heatmap-external-a.strava.com/tiles-auth/all/hot/{z}/{x}/{y}.png?px=512'
                            ),
                        ],
                        {
                            code: 'Sa',
                            isOverlay: true,
                            isOverlayTransparent: true,
                            scaleDependent: false,
                            print: true,
                            jnx: false,
                            subdomains: 'abc',
                            noCors: true,
                            shortName: 'strava_all',
                            retinaOptionsOverrides: [{maxNativeZoom: 16}, {maxNativeZoom: 15}],
                            attribution: '<a href="https://www.strava.com/heatmap">Strava Global Heatmap</a>',
                            opacity: 0.75,
                        }
                    )
                },
                {
                    title: 'Strava heatmap (run)',
                    isDefault: false,
                    layer: new RetinaTileLayer(
                        [
                            urlViaCorsProxy(
                                'https://heatmap-external-a.strava.com/tiles-auth/run/hot/{z}/{x}/{y}.png?px=256'
                            ),
                            urlViaCorsProxy(
                                'https://heatmap-external-a.strava.com/tiles-auth/run/hot/{z}/{x}/{y}.png?px=512'
                            ),
                        ],
                        {
                            code: 'Sr',
                            isOverlay: true,
                            isOverlayTransparent: true,
                            scaleDependent: false,
                            print: true,
                            jnx: false,
                            subdomains: 'abc',
                            noCors: true,
                            shortName: 'strava_run',
                            retinaOptionsOverrides: [{maxNativeZoom: 16}, {maxNativeZoom: 15}],
                            attribution: '<a href="https://www.strava.com/heatmap">Strava Global Heatmap</a>',
                            opacity: 0.75,
                        }
                    )
                },
                {
                    title: 'Strava heatmap (ride)',
                    isDefault: false,
                    layer: new RetinaTileLayer(
                        [
                            urlViaCorsProxy(
                                'https://heatmap-external-a.strava.com/tiles-auth/ride/hot/{z}/{x}/{y}.png?px=256'
                            ),
                            urlViaCorsProxy(
                                'https://heatmap-external-a.strava.com/tiles-auth/ride/hot/{z}/{x}/{y}.png?px=512'
                            ),
                        ],
                        {
                            code: 'Sb',
                            isOverlay: true,
                            isOverlayTransparent: true,
                            scaleDependent: false,
                            print: true,
                            jnx: false,
                            subdomains: 'abc',
                            noCors: true,
                            shortName: 'strava_ride',
                            retinaOptionsOverrides: [{maxNativeZoom: 16}, {maxNativeZoom: 15}],
                            attribution: '<a href="https://www.strava.com/heatmap">Strava Global Heatmap</a>',
                            opacity: 0.75,
                        }
                    )
                },
                {
                    title: 'Strava heatmap (winter)',
                    isDefault: false,
                    layer: new RetinaTileLayer(
                        [
                            urlViaCorsProxy(
                                'https://heatmap-external-a.strava.com/tiles-auth/winter/hot/{z}/{x}/{y}.png?px=256'
                            ),
                            urlViaCorsProxy(
                                'https://heatmap-external-a.strava.com/tiles-auth/winter/hot/{z}/{x}/{y}.png?px=512'
                            ),
                        ],
                        {
                            code: 'Sw',
                            isOverlay: true,
                            isOverlayTransparent: true,
                            scaleDependent: false,
                            print: true,
                            jnx: false,
                            subdomains: 'abc',
                            noCors: true,
                            shortName: 'strava_winter',
                            retinaOptionsOverrides: [{maxNativeZoom: 16}, {maxNativeZoom: 15}],
                            attribution: '<a href="https://www.strava.com/heatmap">Strava Global Heatmap</a>',
                            opacity: 0.75,
                        }
                    )
                },
                {
                    title: 'Norway paper map',
                    isDefault: false,
                    layer: new L.TileLayer(
                        'https://opencache.statkart.no/gatekeeper/gk/gk.open_gmaps?layers=toporaster4&zoom={z}&x={x}&y={y}', // eslint-disable-line max-len
                        {
                            code: 'Np',
                            isOverlay: true,
                            isOverlayTransparent: false,
                            maxNativeZoom: 16,
                            tms: false,
                            print: true,
                            jnx: true,
                            scaleDependent: true,
                            noCors: false,
                            shortName: 'norway_paper',
                            bounds: [[57.81324, 4.19674], [71.27961, 31.56094]],
                            attribution: '<a href="https://www.geonorge.no/aktuelt/om-geonorge/brukerveiledning' +
                                '/#!#se_paa_kart">Geonorge</a>',
                        }
                    )
                },
                {
                    title: 'Norway topo',
                    isDefault: false,
                    layer: new L.TileLayer(
                        'https://opencache.statkart.no/gatekeeper/gk/gk.open_gmaps?layers=topo4&zoom={z}&x={x}&y={y}',
                        {
                            code: 'Nm',
                            isOverlay: true,
                            isOverlayTransparent: false,
                            tms: false,
                            print: true,
                            jnx: true,
                            scaleDependent: true,
                            noCors: false,
                            shortName: 'norway_topo',
                            bounds: [[57.81324, 4.19674], [71.27961, 31.56094]],
                            attribution: '<a href="https://www.geonorge.no/aktuelt/om-geonorge/brukerveiledning' +
                                '/#!#se_paa_kart">Geonorge</a>',
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
                            isOverlay: true,
                            isOverlayTransparent: false,
                            tms: false,
                            print: true,
                            jnx: true,
                            scaleDependent: true,
                            noCors: false,
                            shortName: 'norway_roads',
                            bounds: [[57.81324, 4.19674], [71.27961, 31.56094]],
                            cutline: getCutline('norway'),
                            attribution: '<a href="https://kart.finn.no/">finn.no</a>',
                        }
                    )
                },
                {
                    title: 'Czech base',
                    isDefault: false,
                    layer: new RetinaTileLayer(
                        [
                            `https://api.mapy.cz/v1/maptiles/basic/256/{z}/{x}/{y}?apikey=${config.mapyCz}`,
                            `https://api.mapy.cz/v1/maptiles/basic/256@2x/{z}/{x}/{y}?apikey=${config.mapyCz}`,
                        ],
                        {
                            code: 'Czb',
                            isOverlay: false,
                            tms: false,
                            print: true,
                            jnx: true,
                            scaleDependent: true,
                            shortName: 'czech',
                            attribution: '<a href="https://mapy.cz/zakladni">mapy.cz base map</a>',
                        }
                    )
                },
                {
                    title: 'mapy.cz tourist',
                    isDefault: true,
                    layer: new RetinaTileLayer(
                        [
                            `https://api.mapy.cz/v1/maptiles/outdoor/256/{z}/{x}/{y}?apikey=${config.mapyCz}`,
                            `https://api.mapy.cz/v1/maptiles/outdoor/256@2x/{z}/{x}/{y}?apikey=${config.mapyCz}`,
                        ],
                        {
                            code: 'Czt',
                            isOverlay: false,
                            tms: false,
                            print: true,
                            jnx: true,
                            scaleDependent: true,
                            shortName: 'czech_tourist',
                            hotkey: 'H',
                            attribution: '<a href="https://mapy.cz/turisticka">mapy.cz outdoor map</a>',
                        }
                    )
                },
                {
                    title: 'Czech winter',
                    isDefault: false,
                    layer: L.tileLayer(
                        `https://api.mapy.cz/v1/maptiles/winter/256/{z}/{x}/{y}?apikey=${config.mapyCz}`,
                        {
                            code: 'Czw',
                            isOverlay: false,
                            tms: false,
                            print: true,
                            jnx: true,
                            scaleDependent: true,
                            shortName: 'czech_winter',
                            attribution: '<a href="https://mapy.cz/zimni">mapy.cz winter map</a>',
                        }
                    )
                },
                {
                    title: 'Finland Topo',
                    description: '<a href="https://laji.fi/en/map/">LAJI.FI</a>',
                    isDefault: false,
                    layer: L.tileLayer(
                        "https://proxy.laji.fi/mml_wmts/maasto/wmts/1.0.0/maastokartta/default/WGS84_Pseudo-Mercator/" +
                        "{z}/{y}/{x}.png",
                        {
                            code: 'Fmk',
                            isOverlay: true,
                            isOverlayTransparent: false,
                            tms: false,
                            print: true,
                            jnx: true,
                            scaleDependent: true,
                            noCors: false,
                            shortName: 'finland_topo',
                            bound: [[59.45416, 19.08321], [70.09211, 31.58671]],
                            cutline: getCutline('finland'),
                            attribution: '<a href="https://laji.fi/en/map/">LAJI.FI</a>',
                        }
                    )
                },
                {
                    title: 'France Topo 250m',
                    isDefault: false,
                    layer: new LayerGroupWithOptions(
                        [
                            L.tileLayer(
                                'https://wxs.ign.fr/an7nvfzojv5wa96dsga5nk8w/geoportail/wmts?' +
                                'layer=GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN25TOUR.CV&style=normal&tilematrixset=PM&' +
                                'Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fjpeg&' +
                                'TileMatrix={z}&TileCol={x}&TileRow={y}',
                                {
                                    minZoom: 6,
                                    maxNativeZoom: 16,
                                    bounds: [
                                        [-46.44072, -178.18694],
                                        [51.12562, 77.61086],
                                    ],
                                    isOverlay: true,
                                    isOverlayTransparent: false,
                                    tms: false,
                                    print: true,
                                    jnx: true,
                                    scaleDependent: false,
                                    shortName: 'france_topo_25k',
                                    cutline: getCutline('france'),
                                    attribution: '<a href="https://www.geoportail.gouv.fr/carte">' +
                                        'IGN (France) topographic map</a>',
                                }
                            ),
                            new LayerCutlineOverview(getCutline('france'), 5, 'France Topo 250m (zoom ≥ 6)'),
                        ],
                        {
                            code: 'Ft',
                            isOverlay: true,
                            isWrapper: true,
                        }
                    ),
                },
                {
                    title: 'Great Britain Topo',
                    isDefault: false,
                    layer: new LayerGroupWithOptions(
                        [
                            new BingLayer(config.bingKey, {
                                type: 'OrdnanceSurvey',
                                minZoom: 12,
                                maxNativeZoom: 16,
                                bounds: [
                                    [49.83793, -7.75643],
                                    [60.87164, 1.82356],
                                ],
                                isOverlay: true,
                                isOverlayTransparent: false,
                                scaleDependent: true,
                                print: true,
                                jnx: true,
                                shortName: 'england_topo',
                                cutline: getCutline('great_britain'),
                                attribution: '<a href="https://docs.microsoft.com/en-us/bingmaps/v8-web-control/' +
                                    'map-control-api/maptypeid-enumeration">Ordnance Survey</a>',
                            }),
                            new LayerCutlineOverview(getCutline('great_britain'), 11, 'Great Britain Topo (zoom ≥ 12)'),
                        ],
                        {
                            code: 'Gbt',
                            isOverlay: true,
                            isWrapper: true,
                        }
                    ),
                },
                {
                    title: 'Waymarked Cycling Trails',
                    description:
                        '<a href="https://cycling.waymarkedtrails.org/">https://cycling.waymarkedtrails.org</a>',
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
                            isOverlayTransparent: true,
                            attribution: '<a href="https://cycling.waymarkedtrails.org/">Waymarked Cycling Trails</a>',
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
                            isOverlayTransparent: true,
                            attribution: '<a href="https://hiking.waymarkedtrails.org/">Waymarked Hiking Trails</a>',
                        })
                },
                {
                    title: 'Slovakia topo',
                    description: '<a href="https://mapy.hiking.sk">https://mapy.hiking.sk/</a>',
                    isDefault: false,
                    layer: new LayerGroupWithOptions(
                        [
                            L.tileLayer('https://static.mapy.hiking.sk/topo/{z}/{x}/{y}.png', {
                                isOverlay: true,
                                tms: false,
                                print: true,
                                jnx: true,
                                scaleDependent: true,
                                shortName: 'slovakia_topo',
                                isOverlayTransparent: false,
                                maxNativeZoom: 15,
                                minZoom: 10,
                                bounds: [
                                    [47.5172, 16.74316],
                                    [49.91343, 22.74837],
                                ],
                                noCors: true,
                                cutline: getCutline('slovakia'),
                                attribution: '<a href="https://mapy.hiking.sk/">mapy.hiking.sk</a>',
                            }),
                            new LayerCutlineOverview(getCutline('slovakia'), 9, 'Slovakia topo (zoom ≥ 10)'),
                        ],
                        {
                            code: 'St',
                            isOverlay: true,
                            isWrapper: true,
                        }
                    ),
                },
                {
                    title: 'Yandex tracks (zoom ≥ 10)',
                    isDefault: false,
                    layer: new L.Layer.Yandex.Tracks(
                        {
                            scaleDependent: true,
                            code: 'Ytr',
                            isOverlay: true,
                            isOverlayTransparent: true,
                            print: true,
                            jnx: false,
                            shortName: 'yandex_tracks',
                            noCors: true,
                            attribution: '<a href="https://n.maps.yandex.ru/">Yandex Map Editor</a>',
                        }
                    )
                },
                {
                    title: 'Spain topo',
                    isDefault: false,
                    layer: L.tileLayer(
                            'https://www.ign.es/wmts/mapa-raster?layer=MTN&style=default&' +
                            'tilematrixset=GoogleMapsCompatible&Service=WMTS&Request=GetTile&Version=1.0.0&' +
                            'Format=image%2Fjpeg&TileMatrix={z}&TileCol={x}&TileRow={y}',
                            {
                                code: 'Sp',
                                isOverlay: true,
                                tms: false,
                                print: true,
                                jnx: true,
                                scaleDependent: true,
                                shortName: 'spain_topo',
                                isOverlayTransparent: false,
                                bounds: [[35.9024, -9.51828], [43.8375, 4.50439]],
                                noCors: false,
                                cutline: getCutline('spain'),
                                attribution: '<a href="https://www.ign.es/iberpix2/visor/">' +
                                    'IGN (Spain) topographic map</a>'
                            }
                    )
                },
                {
                    title: 'Switzerland topo',
                    isDefault: false,
                    layer: new RetinaTileLayer(
                        [
                            null,
                            urlViaCorsProxy(
                                'https:///wmts10.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/' +
                                '3857/{z}/{x}/{y}.jpeg'
                            ),
                        ],

                        {
                                code: 'Si',
                                isOverlay: true,
                                tms: false,
                                print: true,
                                jnx: true,
                                scaleDependent: true,
                                shortName: 'swiss_topo',
                                isOverlayTransparent: false,
                                bounds: [[45.80269, 5.87352], [47.86445, 10.6847]],
                                noCors: false,
                                maxNativeZoom: 16,
                                tileSize: 128,
                                zoomOffset: 1,
                                cutline: getCutline('switzerland'),
                                attribution: '<a href="https://map.geo.admin.ch/?topic=swisstopo&lang=en&bgLayer=' +
                                    'ch.swisstopo.pixelkarte-farbe&E=2586000.76&N=1202020.96&zoom=1">Swisstopo'
                            }, true
                    )
                },
                {
                    title: 'Mountains by Alexander Purikov',
                    isDefault: false,
                    layer: L.tileLayer("https://{s}.tiles.nakarte.me/purikov/{z}/{x}/{y}",
                        {
                            code: 'Pur',
                            isOverlay: true,
                            isOverlayTransparent: false,
                            tms: true,
                            scaleDependent: false,
                            maxNativeZoom: 14,
                            noCors: false,
                            print: true,
                            jnx: true,
                            shortName: 'purikov_mountains',
                            attribution: '<a href="https://westra.ru/reports/">Alexander Purikov</a>',
                        }
                    )
                },
    ];

    const groupsDefs = [
        {
            title: 'Default layers',
            layers: [
                'OpenStreetMap',
                'ESRI Satellite',
                'Yandex map',
                'Yandex Satellite',
                'Google Map',
                'Google Satellite',
                'Google Terrain',
                'Bing Satellite',
                'Topomapper 1km',
                'Topo 10km',
                'GGC 2 km',
                'ArbaletMO',
                'Mountains by Aleksey Tsvetkov',
                'Slazav mountains',
                'GGC 1km',
                'Topo 1km',
                'GGC 500m',
                'Topo 500m',
                'GGC 250m',
                'Slazav Moscow region map',
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
                'OSM Outdoors'
            ],
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
                'Slovakia topo',
                'Spain topo',
                'Switzerland topo',
            ],
        },
        {
            title: 'Miscellaneous',
            layers: [
                'Mountains by Alexander Purikov',
                'Google Hybrid',
                'geocaching.su'
            ]
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
                'Yandex tracks (zoom ≥ 10)',
            ],

        },
        {
            title: 'Norway <a href="https://www.ut.no/kart/">https://www.ut.no/kart/</a>',
            layers: [
                'Norway paper map',
                'Norway topo',
                'Norway roads'
            ],

        },
        {
            title: 'Czech <a href="https://mapy.cz">https://mapy.cz</a>',
            layers: [
                'Czech base',
                'mapy.cz tourist',
                'Czech winter'
            ],
        },
    ];

    const titlesByOrder = [
        // common base layers
        // OSM
        'OpenStreetMap',
        'OpenTopoMap',
        'OpenCycleMap',
        'OSM Outdoors',
        'mapy.cz tourist',
        // Satellite
        'ESRI Satellite',
        'Yandex Satellite',
        'Google Satellite',
        'Bing Satellite',
        // Commercial maps
        'Yandex map',
        'Google Map',
        'Google Terrain',
        // Topo maps
        'Topomapper 1km',

        // local base layers
        'Czech base',
        'Czech winter',

        // map overlays
        '#custom-bottom',
        'Eurasia 25km',
        'Topo 10km',
        'GGC 2 km',
        'ArbaletMO',
        'Norway roads',
        'Norway paper map',
        'Norway topo',
        'Finland Topo',
        'Slovakia topo',
        'Spain topo',
        'Mountains by Alexander Purikov',
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
        'Switzerland topo',
        'Slazav Moscow region map',
        'Races',
        'O-sport',
        '#custom-top',

        // line overlays
        'Google Hybrid',
        'Waymarked Hiking Trails',
        'Waymarked Cycling Trails',
        'OpenStreetMap GPS traces',
        'Strava heatmap (all)',
        'Strava heatmap (run)',
        'Strava heatmap (ride)',
        'Strava heatmap (winter)',
        'Yandex tracks (zoom ≥ 10)',
        'Soviet topo maps grid',
        'Wikimapia',

        // point overlays
        'Mountain passes (Westra)',
        'geocaching.su',
    ];

function getLayers() {
    // set metadata
    for (let layer of layersDefs) {
        layer.layer.meta = {title: layer.title};
    }

    // assign order to layers
    const orderByTitle = {};
    for (let i = 0; i < titlesByOrder.length; i++) {
        let title = titlesByOrder[i];
        orderByTitle[title] = i + 1;
    }

    for (let layer of layersDefs) {
        const title = layer.title;
        layer.order = orderByTitle[title];
        if (!layer.order) {
            throw new Error(`Layer title not found in titlesByOrder list: ${title}`);
        }
    }

    // divide layers by groups
    const grouppedLayers = [];
    const layersByTitle = {};
    for (let layer of layersDefs) {
        layersByTitle[layer.title] = layer;
    }
    for (let groupDef of groupsDefs) {
        let group = {group: groupDef.title, layers: []};
        grouppedLayers.push(group);
        for (let title of groupDef.layers) {
            let layer = layersByTitle[title];
            group.layers.push(layer);
        }
    }

    return {
        layers: grouppedLayers,
        customLayersOrder: {
            top: orderByTitle['#custom-top'],
            bottom: orderByTitle['#custom-bottom'],

        }
    };
}

export {getLayers, layersDefs, groupsDefs, titlesByOrder};
