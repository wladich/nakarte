import SimpleService from './simpleService';
import Endomondo from './endomondo';
import Etomesto from './etomesto';
import Gpsies from './gpsies';
import Gpslib from './gpslib';
import Osm from './osm';
import Strava from './strava';
import Tracedetrail from './tracedetrail';
import {YandexRuler} from './yandex';
import {NakarteTrack, NakarteUrl} from './nakarte';
import {MovescountMove, MovescountRoute} from './movescount';
import {SportsTrackerActivity} from './sportstracker';

export default [
    YandexRuler,
    NakarteTrack,
    NakarteUrl,
    Endomondo,
    Etomesto,
    Gpsies,
    Gpslib,
    Osm,
    Strava,
    Tracedetrail,
    MovescountMove,
    MovescountRoute,
    SportsTrackerActivity,
    SimpleService
];
