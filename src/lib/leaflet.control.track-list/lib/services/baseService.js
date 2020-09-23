import {fetch} from '~/lib/xhr-promise';

class BaseService {
    constructor(url) {
        this.origUrl = url;
    }

    isOurUrl() {
        throw new Error('Method not implemented');
    }

    requestOptions() {
        throw new Error('Method not implemented');
    }

    parseResponse() {
        throw new Error('Method not implemented');
    }

    async geoData() {
        if (!this.isOurUrl()) {
            throw new Error('Unsupported url');
        }
        const requests = this.requestOptions().map((it) => fetch(it.url, it.options));
        let responses;
        try {
            responses = await Promise.all(requests);
        } catch (e) {
            return [{name: this.origUrl, error: 'NETWORK'}];
        }

        return this.parseResponse(responses);
    }

    nameFromUrl(url) {
        try {
            url = decodeURIComponent(url);
        } catch (e) {
            // leave url as is
        }

        return url
            .split('#')[0]
            .split('?')[0]
            .replace(/\/*$/u, '')
            .split('/')
            .pop();
    }
}
 export default BaseService;
