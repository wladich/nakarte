import urlViaCorsProxy from 'lib/CORSProxy';
import {parseGpx} from './geo_file_formats'

const re = /^https?:\/\/(?:.*\.)?gpslib\.[^.]+\/tracks\/info\/(\d+)/;

function isGpslibUrl(url) {
    return re.test(url);
}

function gpslibRequestOptions(url) {
    const m = re.exec(url);
    if (!m) {
        throw new Error('Invalid gpslib url');
    }
    const trackId = m[1];
    const requestOptions = [
        {
            url: urlViaCorsProxy(`https://www.gpslib.ru/tracks/download/${trackId}.gpx`),
            options: {responseType: 'binarystring'}
        }];
    return {requestOptions};
}

function gpslibParser(name, responses) {
    if (responses.length !== 1) {
        throw new Error(`Invalid responses array length ${responses.length}`);
    }
    return parseGpx(responses[0].responseBinaryText, name, true);
}

export {gpslibRequestOptions, isGpslibUrl, gpslibParser}
