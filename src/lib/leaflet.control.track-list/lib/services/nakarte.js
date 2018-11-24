import BaseService from './baseService';
import {parseNktkSequence, parseTrackUrlData} from '../parsers/nktk';
import config from 'config';

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

class NakarteNktk extends BaseService {
    constructor(url) {
        super(url);
        this._data = null;
        let i = url.indexOf('#');
        if (i === -1) {
            return;
        }
        i = url.indexOf('nktk=', i + 1);
        if (i === -1) {
            return;
        }
        this._data = url.substring(i + 5);

    }

    isOurUrl() {
        return !!this._data;
    }

    requestOptions() {
        return [];
    }

    parseResponse() {
        return parseNktkSequence(this._data);
    }

}

class NakarteNktl extends BaseService {
    urlRe = /#.*nktl=([A-Za-z0-9_-]+)/;

    isOurUrl() {
        return this.urlRe.test(this.origUrl);
    }

    requestOptions() {
        const m = this.urlRe.exec(this.origUrl);
        const trackId = m[1];
        return [{
            url: (`${config.tracksStorageServer}/track/${trackId}`),
            options: {responseType: 'binarystring'}
        }];
    }

    parseResponse(responses) {
        return parseNktkSequence(responses[0].responseBinaryText);
    }
}


export {NakarteTrack, NakarteNktk, NakarteNktl};
