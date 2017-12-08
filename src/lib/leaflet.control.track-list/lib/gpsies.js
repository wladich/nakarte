import urlViaCorsProxy from 'lib/CORSProxy';
import {parseGpx} from  './geo_file_formats'

function urlEncode(d) {
    return Object.entries(d).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
}

const re = /^https?:\/\/www\.gpsies\.com\/map\.do\?fileId=([a-z]+)/;

function isGpsiesUrl(url) {
    return re.test(url);
}

function gpsiesXhrOptions(url) {
    const m = re.exec(url);
    if (!m) {
        throw new Error('Invalid gpsies url');
    }
    const trackId = m[1];
    const newUrl = urlViaCorsProxy('http://www.gpsies.com/download.do');
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


function gpsiesParser(name, responses) {
    if (responses.length !== 1) {
        throw new Error(`Invalid responses array length ${responses.length}`);
    }
    return parseGpx(responses[0].responseBinaryText, name, true);
}

export {gpsiesXhrOptions, isGpsiesUrl, gpsiesParser}