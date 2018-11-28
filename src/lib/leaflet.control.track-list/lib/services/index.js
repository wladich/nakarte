import SimpleService from './simpleService'
import Endomondo from './endomondo';
import Gpsies from './gpsies';
import Gpslib from './gpslib';
import Osm from './osm';
import Strava from './strava';
import {YandexRuler} from './yandex';
import {NakarteTrack, NakarteNktk, NakarteNktl} from './nakarte';
import {MovescountMove, MovescountRoute} from './movescount';

export default [
    YandexRuler,
    NakarteTrack,
    NakarteNktk,
    NakarteNktl,
    Endomondo,
    Gpsies,
    Gpslib,
    Osm,
    Strava,
    MovescountMove,
    MovescountRoute,
    SimpleService
]