import BaseService from './baseService';
import parseGeoFile from '../parseGeoFile';
import urlViaCorsProxy from '~/lib/CORSProxy';

class SimpleService extends BaseService {
    isOurUrl() {
        return Boolean(this.origUrl.match(/^https?:\/\/.+/u));
    }

    requestOptions() {
        return [{
            url: urlViaCorsProxy(this.origUrl),
            options: {responseType: 'binarystring'}
        }];
    }

    parseResponse(responses) {
        const response = responses[0];
        return parseGeoFile(this.nameFromUrl(response.responseURL), response.responseBinaryText);
    }
}

export default SimpleService;
