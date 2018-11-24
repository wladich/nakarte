import SimpleService from './simpleService'
import Endomondo from './endomondo';
import Gpsies from './gpsies';
import Gpslib from './gpslib';
import Strava from './strava';
import {YandexRuler} from './yandex';
import {NakarteTrack, NakarteNktk, NakarteNktl} from './nakarte';

export default [
    YandexRuler,
    NakarteTrack,
    NakarteNktk,
    NakarteNktl,
    Endomondo,
    Gpsies,
    Gpslib,
    Strava,
    SimpleService
]