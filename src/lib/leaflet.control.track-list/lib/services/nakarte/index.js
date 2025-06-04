import BaseService from '../baseService';
import {parseNktkSequence, parseTrackUrlData, parseNktkFragment} from '../../parsers/nktk';
import config from '~/config';
import {parseHashParams} from '~/lib/leaflet.hashState/hashState';
import loadFromUrl from '../../loadFromUrl';
import loadTracksFromJson from './loadTracksFromJson';
import {fetch} from '~/lib/xhr-promise';

function flattenArray(ar) {
    const res = [];
    for (const it of ar) {
        res.push(...it);
    }
    return res;
}

function parsePointFromHashValues(values) {
    if (values.length < 2) {
        return [{name: 'Point in url', error: 'CORRUPT'}];
    }
    const lat = parseFloat(values[0]);
    const lng = parseFloat(values[1]);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return [{name: 'Point in url', error: 'CORRUPT'}];
    }
    const name = ((values[2] || '').trim()) || 'Point';
    return [{name, points: [{name, lat, lng}]}];
}

class NakarteTrack extends BaseService {
    isOurUrl() {
        return this.origUrl.indexOf('track://') > -1;
    }

    requestOptions() {
        return [];
    }

    parseResponse() {
        const i = this.origUrl.indexOf('track://');
        return parseTrackUrlData(this.origUrl.substring(i + 8));
    }
}

class NakarteUrlLoader {
    constructor() {
        this.loaders = {
            nktk: this.loadFromTextEncodedTrack,
            nktl: this.loadFromTextEncodedTrackId,
            nktu: this.loadFromUrlencodedUrls,
            nktp: this.loadPoint,
            nktj: this.loadFromJSON
        };
    }

    paramNames() {
        return Object.keys(this.loaders);
    }

    async geoData(paramName, values) {
        const loader = this.loaders[paramName];
        return loader.call(this, values);
    }

    async loadFromTextEncodedTrack(values) {
        return flattenArray(values.map(parseNktkFragment));
    }

    async loadFromTextEncodedTrackId(values) {
        const requests = values.map((trackId) =>
            fetch(
                `${config.tracksStorageServer}/track/${trackId}`,
                {responseType: 'binarystring', withCredentials: true}
            )
        );
        let responses;
        try {
            responses = await Promise.all(requests);
        } catch (e) {
            return [{name: 'Track from nakarte server', error: 'NETWORK'}];
        }
        return flattenArray(responses.map((r) => parseNktkSequence(r.responseBinaryText)));
    }

    async loadFromJSON(values) {
        return flattenArray(await Promise.all(values.map(loadTracksFromJson)));
    }

    async loadFromUrlencodedUrls(values) {
        return flattenArray(await Promise.all(values.map(decodeURIComponent).map(loadFromUrl)));
    }

    async loadPoint(values) {
        return parsePointFromHashValues(values.map(decodeURIComponent));
    }
}

class NakarteUrl {
    constructor(url) {
        const paramNames = new NakarteUrlLoader().paramNames();
        this._params = Object.entries(parseHashParams(url))
            .filter(([name]) => paramNames.includes(name));
    }

    isOurUrl() {
        return this._params.length > 0;
    }

    async geoData() {
        const promises = this._params.map(([paramName, value]) => new NakarteUrlLoader().geoData(paramName, value));
        return flattenArray(await Promise.all(promises));
    }
}

export {NakarteTrack, NakarteUrl, NakarteUrlLoader};
