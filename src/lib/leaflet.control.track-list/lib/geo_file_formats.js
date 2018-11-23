import {fetch} from 'lib/xhr-promise';
import urlViaCorsProxy from 'lib/CORSProxy';
import {isGpsiesUrl, gpsiesRequestOptions, gpsiesParser} from './gpsies';
import {isGpslibUrl, gpslibRequestOptions, gpslibParser} from './gpslib';
import {isStravaUrl, stravaRequestOptions, stravaParser} from './strava';
import {isEndomondoUrl, endomondoRequestOptions, endomondoParser} from './endomondo';
import {parseTrackUrl, parseNakarteUrl, isNakarteLinkUrl, nakarteLinkRequestOptions, nakarteLinkParser} from './nktk';
import {stringToArrayBuffer, arrayBufferToString} from 'lib/binary-strings';
import parseGpx from './gpx';
import {parseKmz, parseKml} from './kml';
import parseZip from './zip';
import {parseYandexRulerUrl} from './yandex';
import {parseOziPlt, parseOziRte, parseOziWpt} from './ozi';

function simpleRequestOptions(url) {
    const requestOptions = [{
        url: urlViaCorsProxy(url),
        options: {responseType: 'binarystring'}
    }];
    return {requestOptions};
}

function simpleTrackParser(name, responses) {
    if (responses.length !== 1) {
        throw new Error(`Invalid responses array length ${responses.length}`);
    }
    return parseGeoFile(name, responses[0].responseBinaryText);
}

async function loadFromUrl(url) {
    let geodata;
    geodata = parseGeoFile('', url);
    if (geodata.length === 0 || geodata.length > 1 || geodata[0].error !== 'UNSUPPORTED') {
        return Promise.resolve(geodata);
    }
    let requestOptionsGetter = simpleRequestOptions;
    let parser = simpleTrackParser;


    if (isGpsiesUrl(url)) {
        requestOptionsGetter = gpsiesRequestOptions;
        parser = gpsiesParser;
    } else if (isGpslibUrl(url)) {
        requestOptionsGetter = gpslibRequestOptions;
        parser = gpslibParser;
    } else if (isEndomondoUrl(url)) {
        requestOptionsGetter = endomondoRequestOptions;
        parser = endomondoParser;
    } else if (isStravaUrl(url)) {
        requestOptionsGetter = stravaRequestOptions;
        parser = stravaParser;
    } else if (isNakarteLinkUrl(url)) {
        requestOptionsGetter = nakarteLinkRequestOptions;
        parser = nakarteLinkParser;
    }

    const {requestOptions, extra} = requestOptionsGetter(url);
    let responses;
    try {
        const requests = requestOptions.map((it) => fetch(it.url, it.options));
        responses = await Promise.all(requests);
    } catch (e) {
        return [{name: url, error: 'NETWORK'}];
    }
    let responseURL = responses[0].responseURL;
    try {
        responseURL = decodeURIComponent(responseURL);
    } catch (e) {
    }
    let name = responseURL
        .split('#')[0]
        .split('?')[0]
        .replace(/\/*$/, '')
        .split('/')
        .pop();
    return parser(name, responses, extra);
}


function parseGeoFile(name, data) {
    var parsers = [
        parseTrackUrl,
        parseNakarteUrl,
        parseKmz,
        parseZip,
        parseGpx,
        parseOziRte,
        parseOziPlt,
        parseOziWpt,
        parseKml,
        parseYandexRulerUrl,
//            parseYandexMap
    ];
    for (var i = 0; i < parsers.length; i++) {
        var parsed = parsers[i](data, name);
        if (parsed !== null) {
            return parsed;
        }
    }
    return [{name: name, error: 'UNSUPPORTED'}];
}

export {parseGeoFile, parseGpx, loadFromUrl};
