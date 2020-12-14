import L from "leaflet";
import '~/lib/leaflet.layer.yandex';
import '~/lib/leaflet.layer.google';
import {BingLayer} from '~/lib/leaflet.layer.bing';
import {BingDates} from '~/lib/leaflet.layer.bing/dates';
import config from './config';
import '~/lib/leaflet.layer.soviet-topomaps-grid';
import '~/lib/leaflet.layer.westraPasses';
import '~/lib/leaflet.layer.wikimapia';
import {GeocachingSu} from '~/lib/leaflet.layer.geocaching-su';
import {RetinaTileLayer} from '~/lib/leaflet.layer.RetinaTileLayer';
import urlViaCorsProxy from '~/lib/CORSProxy';
import '~/lib/leaflet.layer.TileLayer.cutline';
import {getCutline} from '~/lib/layers-cutlines';

    const layersDefs = [
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
                            shortName: 'esri'
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
                            shortName: 'yandex'
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
                            shortName: 'yandex_sat'
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
                            shortName: 'google'
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
                            isOverlayTransparent: true
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
                            shortName: 'google_sat'
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
                            shortName: 'google_terrain'
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
                            shortName: 'topomapper_1k'
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
                            shortName: 'arbalet'
                        }
                    )
                },
                {
                    title: 'Slazav mountains',
                    isDefault: true,
                    layer: L.tileLayer("https://{s}.tiles.nakarte.me/map_hr/{z}/{x}/{y}",
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
                    title: 'Slazav map',
                    isDefault: true,
                    layer: L.tileLayer("https://{s}.tiles.nakarte.me/map_podm/{z}/{x}/{y}",
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
                        jnx: false
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
                    layer: L.tileLayer('https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png',
                        {
                            code: 'Ocm',
                            isOverlay: false,
                            scaleDependent: true,
                            print: true,
                            jnx: true,
                            shortName: 'opencyclemap',
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
                            shortName: 'caucasus_1k'
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
                            shortName: 'caucasus_500'
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
                    layer: L.tileLayer(
                        urlViaCorsProxy("http://nakartetiles.s3-website.eu-central-1.amazonaws.com/{z}/{x}/{y}.png"),
                        // FIXME: сделать minZoom=5, когда перейдём на версию leaflet с поддержкой minNativeZoom
                        {
                            code: 'Mt',
                            isOverlay: true,
                            isOverlayTransparent: false,
                            tms: false,
                            minZoom: 2,
                            maxNativeZoom: 15,
                            print: true,
                            jnx: true,
                            scaleDependent: false,
                            noCors: false,
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
                        }
                    )
                },
                {
                    title: 'Czech base',
                    isDefault: false,
                    layer: new RetinaTileLayer(
                        [
                            'https://m{s}.mapserver.mapy.cz/base-m/{z}-{x}-{y}',
                            'https://m{s}.mapserver.mapy.cz/base-m/retina/{z}-{x}-{y}'
                        ],
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
                    title: 'mapy.cz tourist',
                    isDefault: true,
                    layer: new RetinaTileLayer(
                        [
                            'https://m{s}.mapserver.mapy.cz/turist-m/{z}-{x}-{y}',
                            'https://m{s}.mapserver.mapy.cz/turist-m/retina/{z}-{x}-{y}',
                        ],
                        {
                            code: 'Czt',
                            isOverlay: false,
                            tms: false,
                            print: true,
                            jnx: true,
                            subdomains: '1234',
                            scaleDependent: true,
                            shortName: 'czech_tourist',
                            hotkey: 'H'
                        }
                    )
                },
                {
                    title: 'Czech winter',
                    isDefault: false,
                    layer: new RetinaTileLayer(
                        [
                            'https://m{s}.mapserver.mapy.cz/winter-m/{z}-{x}-{y}',
                            'https://m{s}.mapserver.mapy.cz/winter-m/retina/{z}-{x}-{y}',
                        ],
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
                    title: 'Finland Topo',
                    description: '<a href="https://www.retkikartta.fi/?lang=en">https://www.retkikartta.fi/</a>',
                    isDefault: false,
                    layer: L.tileLayer(
                        "https://maps-mml.anderscloud.com/wmts/?" +
                        "ngsw-bypass=1&layer=maastokartta&style=default&tilematrixset=WGS84_Pseudo-Mercator" +
                        "&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fpng" +
                        "&TileMatrix={z}&TileCol={x}&TileRow={y}",
                        {
                            code: 'Fmk',
                            isOverlay: true,
                            isOverlayTransparent: false,
                            tms: false,
                            print: true,
                            jnx: true,
                            scaleDependent: true,
                            noCors: true,
                            shortName: 'finland_topo',
                            bound: [[59.45416, 19.08321], [70.09211, 31.58671]],
                            cutline: getCutline('finland'),
                            cutlineApprox: true,
                        }
                    )
                },
                {
                    title: 'France Topo 250m (zoom ≥ 6)',
                    isDefault: false,
                    layer: L.tileLayer(
                        "https://wxs.ign.fr/an7nvfzojv5wa96dsga5nk8w/geoportail/wmts?" +
                        "layer=GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN25TOUR.CV&style=normal&tilematrixset=PM&" +
                        "Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fjpeg&" +
                        "TileMatrix={z}&TileCol={x}&TileRow={y}",
                        {
                            minZoom: 6,
                            maxNativeZoom: 16,
                            bounds: [[-46.44072, -178.18694], [51.12562, 77.61086]],
                            code: 'Ft',
                            isOverlay: true,
                            isOverlayTransparent: false,
                            tms: false,
                            print: true,
                            jnx: true,
                            scaleDependent: false,
                            shortName: 'france_topo_25k',
                            cutline: getCutline('france'),
                        }
                    )
                },
                {
                    title: 'Great Britain Topo (zoom ≥ 12)',
                    isDefault: false,
                    layer: new BingLayer(config.bingKey,
                        {
                            type: 'OrdnanceSurvey',
                            minZoom: 12,
                            maxNativeZoom: 16,
                            bounds: [[49.83793, -7.75643], [60.87164, 1.82356]],
                            code: 'Gbt',
                            isOverlay: true,
                            isOverlayTransparent: false,
                            scaleDependent: false,
                            print: true,
                            jnx: true,
                            shortName: 'england_topo',
                            cutline: getCutline('great_britain'),
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
                {
                    title: 'Slovakia topo (zoom ≥ 10)',
                    description: '<a href="https://mapy.hiking.sk">https://mapy.hiking.sk/</a>',
                    isDefault: false,
                    layer: L.tileLayer('https://static.mapy.hiking.sk/topo/{z}/{x}/{y}.png',
                        {
                            code: 'St',
                            isOverlay: true,
                            tms: false,
                            print: true,
                            jnx: true,
                            scaleDependent: false,
                            shortName: 'slovakia_topo',
                            isOverlayTransparent: false,
                            maxNativeZoom: 15,
                            minZoom: 10,
                            bounds: [[47.5172, 16.74316], [49.91343, 22.74837]],
                            noCors: true,
                            cutline: getCutline('slovakia'),
                        }),
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
                'marshruty.ru',
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
                'France Topo 250m (zoom ≥ 6)',
                'Great Britain Topo (zoom ≥ 12)',
                'Slovakia topo (zoom ≥ 10)',
            ],
        },
        {
            title: 'Miscellaneous',
            layers: [
                'Google Hybrid',
                'Bing imagery acquisition dates',
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
        'marshruty.ru',
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
        'Slovakia topo (zoom ≥ 10)',
        'Mountains by Aleksey Tsvetkov',
        'Slazav mountains',
        'GGC 1km',
        'Topo 1km',
        'Caucasus 1km',
        'Great Britain Topo (zoom ≥ 12)',
        'GGC 500m',
        'Topo 500m',
        'Caucasus 500m',
        'GGC 250m',
        'Topo 250m',
        'Montenegro topo 250m',
        'France Topo 250m (zoom ≥ 6)',
        'Slazav map',
        'Races',
        'O-sport',
        '#custom-top',

        // line overlays
        'Google Hybrid',
        'Waymarked Hiking Trails',
        'Waymarked Cycling Trails',
        'Bing imagery acquisition dates',
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
