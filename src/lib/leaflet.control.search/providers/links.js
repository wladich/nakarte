import L from 'leaflet';

import urlViaCorsProxy from '~/lib/CORSProxy';
import {fetch} from '~/lib/xhr-promise';

const MAX_ZOOM = 18;
const MESSAGE_LINK_MALFORMED = 'Invalid coordinates in {name} link';
const MESSAGE_SHORT_LINK_MALFORMED = 'Broken {name} short link';

function makeSearchResult(lat, lon, zoom, title) {
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

    return {
        latlng: L.latLng(lat, lon),
        zoom: zoom > MAX_ZOOM ? MAX_ZOOM : zoom,
        title,
        category: null,
        address: null,
        icon: null,
    };
}

function makeSearchResults(lat, lon, zoom, title) {
    return {results: [makeSearchResult(lat, lon, zoom, title)]};
}

const YandexMapsUrl = {
    isOurUrl: function (url) {
        return (
            (url.hostname.match(/\byandex\./u) && url.pathname.match(/^\/maps\//u)) ||
            url.hostname.match(/static-maps\.yandex\./u)
        );
    },

    getResults: async function (url) {
        let isShort = false;
        let actualUrl;
        try {
            if (url.pathname.match(/^\/maps\/-\//u)) {
                isShort = true;
                const pageText = (await fetch(urlViaCorsProxy(url.toString()))).response;
                try {
                    const dom = new DOMParser().parseFromString(pageText, 'text/html');
                    actualUrl = new URL(dom.querySelector('meta[property="og:image:secure_url"]').content);
                } catch (_) {
                    let propertyContent = pageText.match(
                        /<meta\s+property\s*=\s*["']?og:image:secure_url["']?\s+content\s*=\s*["']?([^"' >]+)/u
                    )[1];
                    propertyContent = propertyContent.replaceAll('&amp;', '&');
                    actualUrl = new URL(decodeURIComponent(propertyContent));
                }
            } else {
                actualUrl = url;
            }
            const paramLl = actualUrl.searchParams.get('ll');
            const paramZ = actualUrl.searchParams.get('z');
            const [lon, lat] = paramLl.split(',').map(parseFloat);
            const zoom = Math.round(parseFloat(paramZ));
            return makeSearchResults(lat, lon, zoom, 'Yandex map view');
        } catch (_) {
            return {
                error: L.Util.template(isShort ? MESSAGE_SHORT_LINK_MALFORMED : MESSAGE_LINK_MALFORMED, {
                    name: 'Yandex',
                }),
            };
        }
    },
};

const GoogleMapsSimpleMapUrl = {
    viewRe: /\/@([-\d.]+),([-\d.]+),(?:([\d.]+)([mz]))?/u,
    placeRe: /\/place\/([^/]+)/u,
    placeZoom: 14,
    panoramaZoom: 16,

    isOurUrl: function (url) {
        return Boolean(url.pathname.match(this.viewRe)) || Boolean(url.pathname.match(this.placeRe));
    },

    getResults: function (url) {
        const results = [];
        const path = url.pathname;

        try {
            const placeTitleMatch = path.match(this.placeRe);
            const placeCoordinatesMatch = path.match(/\/data=[^/]*!8m2!3d([-\d.]+)!4d([-\d.]+)/u);
            const title = 'Google map - ' + decodeURIComponent(placeTitleMatch[1]).replace(/\+/gu, ' ');
            const lat = parseFloat(placeCoordinatesMatch[1]);
            const lon = parseFloat(placeCoordinatesMatch[2]);
            results.push(makeSearchResult(lat, lon, this.placeZoom, title));
        } catch (e) {
            // pass
        }

        try {
            const viewMatch = path.match(this.viewRe);
            const lat = parseFloat(viewMatch[1]);
            const lon = parseFloat(viewMatch[2]);
            let zoom;
            // no need to check viewMatch[4] as they are together in same group
            if (viewMatch[3] === undefined) {
                zoom = this.panoramaZoom;
            } else {
                zoom = parseFloat(viewMatch[3]);
                // zoom for satellite images is expressed in meters
                if (viewMatch[4] === 'm') {
                    zoom = Math.log2((149175296 / zoom) * Math.cos((lat / 180) * Math.PI));
                }
                zoom = Math.round(zoom);
            }
            results.push(makeSearchResult(lat, lon, zoom, 'Google map view'));
        } catch (e) {
            // pass
        }
        if (results.length === 0) {
            throw new Error('No results extracted from Google link');
        }
        return {results};
    },
};

const GoogleMapsQueryUrl = {
    zoom: 17,
    title: 'Google map view',

    isOurUrl: function (url) {
        return url.searchParams.has('q');
    },

    getResults: function (url) {
        const data = url.searchParams.get('q');
        const m = data.match(/^(?:loc:)?([-\d.]+),([-\d.]+)$/u);
        const lat = parseFloat(m[1]);
        const lon = parseFloat(m[2]);
        return makeSearchResults(lat, lon, this.zoom, this.title);
    },
};

const GoogleMapsUrl = {
    subprocessors: [GoogleMapsSimpleMapUrl, GoogleMapsQueryUrl],

    isOurUrl: function (url) {
        return (url.hostname.match(/\bgoogle\./u) || url.hostname === 'goo.gl') && url.pathname.match(/^\/maps(\/|$)/u);
    },

    getResults: async function (url) {
        let isShort = false;
        let actualUrl;
        try {
            if (url.hostname === 'goo.gl') {
                isShort = true;
                const xhr = await fetch(urlViaCorsProxy(url.toString()), {method: 'HEAD'});
                actualUrl = new URL(xhr.responseURL);
            } else {
                actualUrl = url;
            }
        } catch (e) {
            // pass
        }
        for (const subprocessor of this.subprocessors) {
            try {
                if (subprocessor.isOurUrl(actualUrl)) {
                    return subprocessor.getResults(actualUrl);
                }
            } catch (e) {
                // pass
            }
        }
        return {
            error: L.Util.template(isShort ? MESSAGE_SHORT_LINK_MALFORMED : MESSAGE_LINK_MALFORMED, {name: 'Google'}),
        };
    },
};

const MapyCzUrl = {
    isOurUrl: function (url) {
        return Boolean(url.hostname.match(/\bmapy\.cz$/u));
    },

    getResults: async function (url) {
        let isShort = false;
        let actualUrl;
        try {
            if (url.pathname.match(/^\/s\//u)) {
                isShort = true;
                const xhr = await fetch(urlViaCorsProxy(url.toString()), {method: 'HEAD'});
                actualUrl = new URL(xhr.responseURL);
            } else {
                actualUrl = url;
            }
            const lon = parseFloat(actualUrl.searchParams.get('x'));
            const lat = parseFloat(actualUrl.searchParams.get('y'));
            const zoom = Math.round(parseFloat(actualUrl.searchParams.get('z')));
            return makeSearchResults(lat, lon, zoom, 'Mapy.cz view');
        } catch (_) {
            return {
                error: L.Util.template(isShort ? MESSAGE_SHORT_LINK_MALFORMED : MESSAGE_LINK_MALFORMED, {
                    name: 'Mapy.cz',
                }),
            };
        }
    },
};

const OpenStreetMapUrl = {
    isOurUrl: function (url) {
        return Boolean(url.hostname.match(/\bopenstreetmap\./u));
    },

    getResults: function (url) {
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
    isOurUrl: function (url) {
        return url.hostname.match(/\bnakarte\b/u) || !this.getResults(url).error;
    },

    getResults: function (url) {
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
        for (const processor of urlProcessors) {
            if (processor.isOurUrl(url)) {
                return processor.getResults(url);
            }
        }
        return {error: 'Unsupported link'};
    }
}

export {LinksProvider};
