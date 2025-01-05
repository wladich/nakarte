import SimpleService from './simpleService';
import Etomesto from './etomesto';
import Osm from './osm';
import {Strava, StravaShortUrl} from './strava';
import Tracedetrail from './tracedetrail';
import {YandexRuler} from './yandex';
import {NakarteTrack, NakarteUrl} from './nakarte';
import {GarminActivity, GarminRoute} from './garmin';
import {SportsTrackerActivity} from './sportstracker';
import Wikiloc from './wikiloc';

const services = [
    YandexRuler,
    NakarteTrack,
    NakarteUrl,
    Etomesto,
    Osm,
    StravaShortUrl,
    Strava,
    Tracedetrail,
    GarminActivity,
    GarminRoute,
    SportsTrackerActivity,
    Wikiloc,
    SimpleService
];

export default services;
