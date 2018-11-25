import BaseService from './baseService';
import urlViaCorsProxy from 'lib/CORSProxy';

class Endomondo extends BaseService {
    urlRegexps = [
        /^https:\/\/www\.endomondo\.com\/users\/(\d+)\/workouts\/(\d+)/,
        /^https:\/\/www\.endomondo\.com\/workouts\/(\d+)\/(\d+)/
    ];

    isOurUrl() {
        return this.urlRegexps.some((re) => re.test(this.origUrl));
    }

    requestOptions() {
        let userId, trackId;
        let m = this.urlRegexps[0].exec(this.origUrl);
        if (m) {
            [userId, trackId] = [m[1], m[2]];
        } else {
            m = this.urlRegexps[1].exec(this.origUrl);
            [trackId, userId] = [m[1], m[2]];
        }
        return [{
            url: urlViaCorsProxy(`https://www.endomondo.com/rest/v1/users/${userId}/workouts/${trackId}`),
            options: {
                responseType: 'binarystring',
                isResponseSuccess: (xhr) => (xhr.status === 200 || xhr.status === 404)
            },

        }];
    }

    parseResponse(responses) {
        const response = responses[0];
        if (response.status === 404) {
            return [{error: 'Invalid link or user disabled viewing this workout track'}];
        }

        let data;
        try {
            data = JSON.parse(response.responseBinaryText)
        } catch (e) {
            return [{name: 'Endomondo activity', error: 'UNSUPPORTED'}];
        }
        if (!data.points || !data.points.points) {
            return [{error: 'Endomondo user disabled viewing this workout track'}];
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
        if (track.length === 0) {
            return [{error: 'Endomondo user disabled viewing this workout track'}];
        }

        const author = data.author && data.author.name ? ` ${data.author.name}` : '';
        const date = data.local_start_time.split('T')[0];
        const dist = `${data.distance.toFixed(1)} km`;
        let trackName = `${date}, ${dist}${author}: ${data.title}`;
        return [{
            name: trackName,
            tracks: [track]
        }];
    }

}

export default Endomondo;
