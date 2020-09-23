import BaseService from './baseService';
import urlViaCorsProxy from '~/lib/CORSProxy';
import parseGpx from '../parsers/gpx';
import urlEncode from './urlEncode';

class Gpsies extends BaseService {
    urlRe = /^https?:\/\/www\.gpsies\.com\/map\.do[^?]*\?fileId=([a-z]+)/u;

    isOurUrl() {
        return this.urlRe.test(this.origUrl);
    }

    requestOptions() {
        const m = this.urlRe.exec(this.origUrl);
        const trackId = m[1];
        const newUrl = urlViaCorsProxy('https://www.gpsies.com/download.do');
        return [{
            url: newUrl,
            options: {
                method: 'POST',
                data: urlEncode({
                        fileId: trackId,
                        speed: '10',
                        dataType: '3',
                        filetype: 'gpxTrk',
                        submitButton: '',
                        inappropriate: ''
                    }
                ),
                headers: [["Content-type", "application/x-www-form-urlencoded"]],
                responseType: 'binarystring'
            }
        }];
    }

    parseResponse(responses) {
        const response = responses[0];
        return parseGpx(response.responseBinaryText, this.nameFromUrl(response.responseURL), true) ||
            [{name: name, error: 'UNSUPPORTED'}];
    }
}

export default Gpsies;
