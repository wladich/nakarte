import urlViaCorsProxy from 'lib/CORSProxy';
import {decode as utf8_decode} from 'utf8';

const re = /^https:\/\/www\.strava\.com\/activities\/(\d+)/;

function isStravaUrl(url) {
    return re.test(url);
}

function stravaRequestOptions(url) {
    const m = re.exec(url);
    if (!m) {
        throw new Error('Invalid strava url');
    }
    const trackId = m[1];
    const requestOptions = [
        {
            url: urlViaCorsProxy(`https://www.strava.com/activities/${trackId}?hl=en-GB`),
            options: {responseType: 'binarystring'}
        },
        {
            url: urlViaCorsProxy(`https://www.strava.com/stream/${trackId}?streams%5B%5D=latlng`),
            options: {responseType: 'binarystring'}
        }];
    return {
        requestOptions,
    }
}


function stravaParser(name, responses) {
    if (responses.length !== 2) {
        throw new Error(`Invalid responses array length ${responses.length}`);
    }


    let data;
    try {
        data = JSON.parse(responses[1].responseBinaryText);
    } catch (e) {
        return [{name: name, error: 'UNSUPPORTED'}];
    }
    if (!data.latlng) {
        return [{name: name, error: 'UNSUPPORTED'}];
    }

    let s = responses[0].responseBinaryText;
    s = utf8_decode(s);
    let m = s.match(/<meta [^>]*twitter:description[^>]*>/);
    if (m) {
        m = m[0].match(/content='([^']+)'/);
        name = m[1];
    }

    const geodata = {
        name: name || 'Strava',
        tracks: [data.latlng.map((p) => {
                return {
                    lat: p[0],
                    lng: p[1]
                }
            }
        )]
    };
    return [geodata];
}


export {isStravaUrl, stravaRequestOptions, stravaParser}