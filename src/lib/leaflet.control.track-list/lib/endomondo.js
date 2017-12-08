import urlViaCorsProxy from 'lib/CORSProxy';

const regexps = [
    /^https:\/\/www\.endomondo\.com\/users\/(\d+)\/workouts\/(\d+)/,
    /^https:\/\/www\.endomondo\.com\/workouts\/(\d+)\/(\d+)/
];

function isEndomondoUrl(url) {
    return regexps[0].test(url) || regexps[1].test(url);
}

function endomonXhrOptions(url) {
    let m = regexps[0].exec(url);
    let userId, trackId;
    if (m) {
        [userId, trackId] = [m[1], m[2]];
    } else {
        m = regexps[1].exec(url);
        if (!m) {
            throw new Error('Invalid endomodo url');
        }
        [trackId, userId] = [m[1], m[2]];
    }
    return [{
        url: urlViaCorsProxy(`https://www.endomondo.com/rest/v1/users/${userId}/workouts/${trackId}`),
        options: {responseType: 'binarystring'}
    }];
}

function endomondoParser(name, responses) {
    if (responses.length !== 1) {
        throw new Error(`Invalid responses array length ${responses.length}`);
    }
    let data;
    try {
        data = JSON.parse(responses[0].responseBinaryText)
    } catch (e) {
        return null;
    }
    if (!data.points || !data.points.points) {
        return null;
    }
    const track = data.points.points
        .filter((p) => p.latitude)
        .map((p) => {
                return {
                    lat: p.latitude,
                    lng: p.longitude
                }
            }
        );
    if (!track.length) {
        return [{error: 'Endomondo user disabled viewing this workout track'}];
    }

    let trackName = `${data.local_start_time.split('T')[0]}, ${data.distance.toFixed(1)} km, ${data.author.name}, `;
    const geodata = {
        name: trackName,
        tracks: [track]
    };
    return [geodata];
}


export {isEndomondoUrl, endomonXhrOptions, endomondoParser}
