import services from './services';

async function loadFromUrl(url) {
    for (let ServiceClass of services) {
        let service = new ServiceClass(url);
        if (service.isOurUrl()) {
            return service.geoData();
        }
    }
    return [{name: url, error: 'INVALID_URL'}];
}

export default loadFromUrl;
