import L from 'leaflet';

const MAX_ZOOM = 18;

function makeSearchResults(lat, lon, zoom, title) {
    if (
        isNaN(zoom) ||
        isNaN(lat) ||
        isNaN(lon) ||
        zoom < 0 ||
        zoom > 25 ||
        lat < -90 ||
        lat > 90 ||
        lon < -180 ||
        lon > 180
    ) {
        throw new Error('Invalid view state value');
    }
    if (zoom > MAX_ZOOM) {
        zoom = MAX_ZOOM;
    }

    return {
        results: [
            {
                latlng: L.latLng(lat, lon),
                zoom,
                title,
                category: null,
                address: null,
            },
        ],
    };
}

const YandexMapsUrl = {
    isOurUrl: function(url) {
        return Boolean(url.hostname.match(/\byandex\.[^.]+$/u) && url.pathname.match(/^\/maps\//u));
    },

    getResuls: function(url) {
        const paramLl = url.searchParams.get('ll');
        const paramZ = url.searchParams.get('z');
        try {
            const [lon, lat] = paramLl.split(',').map(parseFloat);
            const zoom = Math.round(parseFloat(paramZ));
            return makeSearchResults(lat, lon, zoom, 'Yandex map view');
        } catch (_) {
            return {error: 'Link is malformed'};
        }
    },
};

const GoogleMapsUrl = {
    isOurUrl: function(url) {
        return Boolean(url.hostname.match(/\bgoogle\.com$/u) && url.pathname.match(/^\/maps\//u));
    },

    getResuls: function(url) {
        const path = url.pathname.split('/');
        const viewDef = path[path.length - 1];
        const m = viewDef.match(/^@([-\d.]+),([-\d.]+),([\d.]+)z/u);
        try {
            const lat = parseFloat(m[1]);
            const lon = parseFloat(m[2]);
            const zoom = Math.round(parseFloat(m[3]));
            return makeSearchResults(lat, lon, zoom, 'Google map view');
        } catch (_) {
            return {error: 'Link is malformed'};
        }
    },
};

const MapyCzUrl = {
    isOurUrl: function(url) {
        return Boolean(url.hostname.match(/\bmapy\.cz$/u));
    },

    getResuls: function(url) {
        try {
            const lon = parseFloat(url.searchParams.get('x'));
            const lat = parseFloat(url.searchParams.get('y'));
            const zoom = Math.round(parseFloat(url.searchParams.get('z')));
            return makeSearchResults(lat, lon, zoom, 'Mapy.cz view');
        } catch (_) {
            return {error: 'Link is malformed'};
        }
    },
};

const OpenStreetMapUrl = {
    isOurUrl: function(url) {
        return Boolean(url.hostname.match(/\bopenstreetmap\.org$/u));
    },

    getResuls: function(url) {
        const m = url.hash.match(/map=([\d.]+)\/([\d.-]+)\/([\d.-]+)/u);
        try {
            const zoom = Math.round(parseFloat(m[1]));
            const lat = parseFloat(m[2]);
            const lon = parseFloat(m[3]);
            return makeSearchResults(lat, lon, zoom, 'OpenStreetMap view');
        } catch (_) {
            return {error: 'Link is malformed'};
        }
    },
};

const urlProcessors = [YandexMapsUrl, GoogleMapsUrl, MapyCzUrl, OpenStreetMapUrl];

class LinksProvider {
    isOurQuery(query) {
        return query.match(/^https?:\/\//u);
    }

    async search(query) {
        let url;
        try {
            url = new URL(query);
        } catch (e) {
            return {error: 'Invalid link'};
        }
        for (let processor of urlProcessors) {
            if (processor.isOurUrl(url)) {
                return processor.getResuls(url);
            }
        }
        return {error: 'Unsupported link'};
    }
}

export {LinksProvider};
