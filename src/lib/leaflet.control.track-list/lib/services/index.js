import SimpleService from './simpleService';
import Endomondo from './endomondo';
import Etomesto from './etomesto';
import Gpslib from './gpslib';
import Osm from './osm';
import Strava from './strava';
import Tracedetrail from './tracedetrail';
import {YandexRuler} from './yandex';
import {NakarteTrack, NakarteUrl} from './nakarte';
import {MovescountMove, MovescountRoute} from './movescount';
import {GarminActivity, GarminRoute} from './garmin';
import {SportsTrackerActivity} from './sportstracker';

export default [
    YandexRuler,
    NakarteTrack,
    NakarteUrl,
    Endomondo,
    Etomesto,
    Gpslib,
    Osm,
    Strava,
    Tracedetrail,
    MovescountMove,
    MovescountRoute,
    GarminActivity,
    GarminRoute,
    SportsTrackerActivity,
    SimpleService
];
