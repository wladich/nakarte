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
        extra: {trackId}
    }
}


function stravaParser(name, responses, extra) {
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

    name = `Strava ${extra.trackId}`;
    try {
        const dom = (new DOMParser()).parseFromString(responses[0].responseBinaryText, "text/html");
        let title = dom.querySelector('meta[property=og\\:title]').content;
        title = utf8_decode(title);
        // name and description
        const m = title.match(/^(.+) - ([^-]+)/);
        if (m) {
            // reverse name and description
            name =  `${m[2]} ${m[1]}`;
            title = dom.querySelector('title').text;
            let date = title.match(/ (on \d{1,2} \w+ \d{4}) /)[1];
            if (date) {
                name += ' ' + date;
            }
        }

    } catch (e) {}

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