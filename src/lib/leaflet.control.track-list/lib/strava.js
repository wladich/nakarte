import urlViaCorsProxy from 'lib/CORSProxy';
import {decode as utf8_decode} from 'utf8';

const re = /^https:\/\/www\.strava\.com\/activities\/(\d+)/;

function isStravaUrl(url) {
    return re.test(url);
}

function stravaXhrOptions(url) {
    const m = re.exec(url);
    if (!m) {
        throw new Error('Invalid strava url');
    }
    const trackId = m[1];
    return [
        {
            url: urlViaCorsProxy(`https://www.strava.com/activities/${trackId}?hl=en-GB`),
            options: {responseType: 'binarystring'}
        },
        {
            url: urlViaCorsProxy(`https://www.strava.com/stream/${trackId}?streams%5B%5D=latlng`),
            options: {responseType: 'binarystring'}
        }];
}


function stravaParser(_, responses) {
    if (responses.length !== 2) {
        throw new Error(`Invalid responses array length ${responses.length}`);
    }


    let data;
    try {
        data = JSON.parse(responses[1].responseBinaryText);
    } catch (e) {
        return null;
    }
    if (!data.latlng) {
        return null;
    }

    let name;
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


export {isStravaUrl, stravaXhrOptions, stravaParser}