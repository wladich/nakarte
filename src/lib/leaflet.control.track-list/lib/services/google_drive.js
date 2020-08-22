import SimpleService from './simpleService';

class GoogleDrive extends SimpleService {
    constructor(url) {
        const m = url.match(/https:\/\/drive.google.com\/file\/[^/]\/([^/]+)/u);
        if (m) {
            url = `https://drive.google.com/uc?export=download&id=${m[1]}`;
            super(url);
            this.ourUrl = true;
        } else {
            super('');
            this.ourUrl = false;
        }
    }

    isOurUrl() {
        return this.ourUrl;
    }

    requestOptions() {
        function isResponseSuccess(xhr) {
            return [200, 404].includes(xhr.status);
        }

        const options = super.requestOptions();
        options[0].options.isResponseSuccess = isResponseSuccess;
        return options;
    }

    parseResponse(responses) {
        const response = responses[0];
        if (response.status === 404) {
            return [{error: "File does not exist"}];
        }
        if (response.responseURL.match(/\/ServiceLogin/u)) {
            return [{error: "File is not publicly shared"}];
        }
        return super.parseResponse(responses);
    }
}

export default GoogleDrive;
