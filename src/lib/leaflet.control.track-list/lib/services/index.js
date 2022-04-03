import SimpleService from './simpleService';
import Etomesto from './etomesto';
import Gpslib from './gpslib';
import Osm from './osm';
import Strava from './strava';
import Tracedetrail from './tracedetrail';
import {YandexRuler} from './yandex';
import {NakarteTrack, NakarteUrl} from './nakarte';
import {GarminActivity, GarminRoute} from './garmin';
import {SportsTrackerActivity} from './sportstracker';
import OpenStreetMapRu from './openstreetmapRu';
import Wikiloc from './wikiloc';

const services = [
    YandexRuler,
    NakarteTrack,
    NakarteUrl,
    Etomesto,
    Gpslib,
    Osm,
    Strava,
    Tracedetrail,
    GarminActivity,
    GarminRoute,
    SportsTrackerActivity,
    OpenStreetMapRu,
    Wikiloc,
    SimpleService
];

export default services;
