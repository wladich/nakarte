import L from 'leaflet';

const MAX_ZOOM = 18;
const MESSAGE_LINK_MALFORMED = 'Invalid coordinates in {name} link';

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
                icon: null,
            },
        ],
    };
}

const YandexMapsUrl = {
    isOurUrl: function(url) {
        return Boolean(url.hostname.match(/\byandex\.[^.]+$/u) && url.pathname.match(/^\/maps\//u));
    },

    getResults: function(url) {
        const paramLl = url.searchParams.get('ll');
        const paramZ = url.searchParams.get('z');
        try {
            const [lon, lat] = paramLl.split(',').map(parseFloat);
            const zoom = Math.round(parseFloat(paramZ));
            return makeSearchResults(lat, lon, zoom, 'Yandex map view');
        } catch (_) {
            return {error: L.Util.template(MESSAGE_LINK_MALFORMED, {name: 'Yandex'})};
        }
    },
};

const GoogleMapsSimpleUrl = {
    viewRe: /\/@([-\d.]+),([-\d.]+),([\d.]+)z(?:\/|$)/u,

    isOurUrl: function url(url) {
        return Boolean(url.pathname.match(this.viewRe));
    },

    getResults: function(url) {
        const path = url.pathname;
        const viewMatch = path.match(this.viewRe);
        const titleMatch = path.match(/\/place\/([^/]+)/u);
        let title = titleMatch?.[1];
        if (title) {
            title = 'Google map - ' + decodeURIComponent(title).replace(/\+/gu, ' ');
        } else {
            title = 'Google map view';
        }
        try {
            const lat = parseFloat(viewMatch[1]);
            const lon = parseFloat(viewMatch[2]);
            const zoom = Math.round(parseFloat(viewMatch[3]));
            return makeSearchResults(lat, lon, zoom, title);
        } catch (_) {
            return {error: L.Util.template(MESSAGE_LINK_MALFORMED, {name: 'Google'})};
        }
    },
};

const GoogleMapsQueryUrl = {
    zoom: 17,
    title: 'Google map view',

    isOurUrl: function(url) {
        return url.searchParams.has('q');
    },

    getResults: function(url) {
        const data = url.searchParams.get('q');
        const m = data.match(/^(?:loc:)?([-\d.]+),([-\d.]+)$/u);
        try {
            const lat = parseFloat(m[1]);
            const lon = parseFloat(m[2]);
            return makeSearchResults(lat, lon, this.zoom, this.title);
        } catch (_) {
            return {error: L.Util.template(MESSAGE_LINK_MALFORMED, {name: 'Google'})};
        }
    }
};

const GoogleMapsUrl = {
    subprocessors: [GoogleMapsSimpleUrl, GoogleMapsQueryUrl],

    isOurUrl: function(url) {
        return Boolean(url.hostname.match(/\bgoogle\..+$/u) && url.pathname.match(/^\/maps(\/|$)/u));
    },

    getResults: function(url) {
        for (let subprocessor of this.subprocessors) {
            if (subprocessor.isOurUrl(url)) {
                return subprocessor.getResults(url);
            }
        }
        return {error: L.Util.template(MESSAGE_LINK_MALFORMED, {name: 'Google'})};
    },
};

const MapyCzUrl = {
    isOurUrl: function(url) {
        return Boolean(url.hostname.match(/\bmapy\.cz$/u));
    },

    getResults: function(url) {
        try {
            const lon = parseFloat(url.searchParams.get('x'));
            const lat = parseFloat(url.searchParams.get('y'));
            const zoom = Math.round(parseFloat(url.searchParams.get('z')));
            return makeSearchResults(lat, lon, zoom, 'Mapy.cz view');
        } catch (_) {
            return {error: L.Util.template(MESSAGE_LINK_MALFORMED, {name: 'Mapy.cz'})};
        }
    },
};

const OpenStreetMapUrl = {
    isOurUrl: function(url) {
        return Boolean(url.hostname.match(/\bopenstreetmap\.org$/u));
    },

    getResults: function(url) {
        const m = url.hash.match(/map=([\d.]+)\/([\d.-]+)\/([\d.-]+)/u);
        try {
            const zoom = Math.round(parseFloat(m[1]));
            const lat = parseFloat(m[2]);
            const lon = parseFloat(m[3]);
            return makeSearchResults(lat, lon, zoom, 'OpenStreetMap view');
        } catch (_) {
            return {error: L.Util.template(MESSAGE_LINK_MALFORMED, {name: 'OpenStreetMap'})};
        }
    },
};

const NakarteUrl = {
    isOurUrl: function(url) {
        return url.hostname.match(/\bnakarte\b/u) || !this.getResults(url).error;
    },

    getResults: function(url) {
        const m = url.hash.match(/\bm=([\d]+)\/([\d.-]+)\/([\d.-]+)/u);
        try {
            const zoom = Math.round(parseFloat(m[1]));
            const lat = parseFloat(m[2]);
            const lon = parseFloat(m[3]);
            return makeSearchResults(lat, lon, zoom, 'Nakarte view');
        } catch (_) {
            return {error: L.Util.template(MESSAGE_LINK_MALFORMED, {name: 'Nakarte'})};
        }
    },
};

const urlProcessors = [YandexMapsUrl, GoogleMapsUrl, MapyCzUrl, OpenStreetMapUrl, NakarteUrl];

class LinksProvider {
    name = 'Links';

    isOurQuery(query) {
        return Boolean(query.match(/^https?:\/\//u));
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
                return processor.getResults(url);
            }
        }
        return {error: 'Unsupported link'};
    }
}

export {LinksProvider};
