import services from './services';

async function loadFromUrl(url) {
    for (let serviceClass of services) {
        let service = new serviceClass(url);
        if (service.isOurUrl()) {
            return service.geoData();
        }
    }
}

export default loadFromUrl;
