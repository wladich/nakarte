import BaseService from './baseService';
import parseGeoFile from '../parseGeoFile';
import urlViaCorsProxy from '~/lib/CORSProxy';

function filenameFromResponseHeaders(xhr) {
    const contentDisposition = xhr.getResponseHeader('content-disposition');
    if (contentDisposition) {
        let m = contentDisposition.match(/filename\*=UTF-8'[^']*'([^;]+)/iu);
        if (m) {
            return decodeURIComponent(m[1]);
        }
        m = contentDisposition.match(/filename="?([^;"]+)/iu);
        if (m) {
            return decodeURIComponent(m[1]);
        }
    }
    return null;
}

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
        const filename = filenameFromResponseHeaders(response) || this.nameFromUrl(response.responseURL);
        return parseGeoFile(filename, response.responseBinaryText);
    }
}

export default SimpleService;
