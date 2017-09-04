import L from 'leaflet';
import config from 'config';
import {fetch} from 'lib/xhr-promise';
import {Viewer} from '../photo-viewer';
import {makeCoverageLayer} from '../photo-coverage-layer';


const bannedUserId = '100597270@N04';

function getCoverageLayer(options) {
    return makeCoverageLayer(config.flickrCoverageUrl, 12, '#ff0000', options);
}


function parseSearchResponse(resp) {
    // FIXME: process flickr error responses

    if (resp.photos && resp.photos.photo && resp.photos.photo.length) {
        const images = [];
        for (let photo of resp.photos.photo) {
            if (photo.owner === bannedUserId) {
                continue;
            }
            let title = photo.title;
            if (title === "") {
                title = null;
            }
                let photoDescription = photo.description._content;
            if (photoDescription  === "") {
                photoDescription  = null;
            }
            let description = 'Flickr';
            if (title || photoDescription) {
                description = '';
                if (title) {
                    description = title;
                }
                if (photoDescription) {
                    if (title) {
                        description += '</br>';
                    }
                    description += photoDescription;
                }
            }
            let date = photo.datetaken.split(/\s+/)[0];
            if (photo.datetakenunknown === '1') {
                date = `Before ${date}`;
            }
            let url, width, height;
            for (let postfix of ['o', 'k', 'h', 'l', 'c', 'z', 'm', 'n', 's', 't']) {
            // for (let postfix of ['c', 'z', 'm', 'n', 's', 't']) {
                url = photo['url_' + postfix];
                if (url) {
                    width = parseInt(photo['width_' + postfix], 10);
                    height = parseInt(photo['height_' + postfix], 10);
                    break;
                }
            }
            images.push({
                    url, width, height,
                    lat: parseFloat(photo.latitude),
                    lng: parseFloat(photo.longitude),
                    author: photo.ownername,
                    timeOriginal: date,
                    description,
                    pageUrl: `https://www.flickr.com/photos/${photo.owner}/${photo.id}`,
                    pageId: photo.id
                }
            )
        }
        if (images.length) {
            return images;
        }
    }
    return null;
}

function isCloser(target, a, b) {
    const d1 = target.distanceTo(a);
    const d2 = target.distanceTo(b);
    if (d1 < d2) {
        return -1;
    } else if (d1 === d2) {
        return 0;
    } else {
        return 1;
    }
}


async function getPanoramaAtPos(latlng, searchRadiusMeters) {
    const clusterSize = 10;
    searchRadiusMeters += clusterSize;
    if (searchRadiusMeters > 32000) {
        searchRadiusMeters = 32000;
    }
    const urlTemplate = 'https://api.flickr.com/services/rest/?' +
        'method=flickr.photos.search&format=json&nojsoncallback=1&per_page=250&' +
        'api_key={key}&' +
        'extras=owner_name,geo,date_taken,url_t,url_s,url_m,url_n,url_z,url_c,url_l,url_o,description&' +
        'lat={lat}&lon={lng}&radius={radius}';
    const url = L.Util.template(urlTemplate, {
            lat: latlng.lat, lng: latlng.lng, radius: searchRadiusMeters / 1000,
            key: config.flickr
        }
    );
    const resp = await fetch(url, {responseType: 'json', timeout: 10000});
    if (resp.status === 200) {
        let photos = parseSearchResponse(resp.responseJSON);
        if (photos && photos.length) {
            latlng = L.latLng(latlng.lat, latlng.lng);
            photos.sort(isCloser.bind(null, latlng));
            latlng = L.latLng(photos[0].lat, photos[0].lng);
            photos = photos.filter((photo) => {
                return latlng.distanceTo(L.latLng(photo.lat, photo.lng)) <= clusterSize;
            });
            return {
                found: true,
                data: photos
            };
        } else {
            return {found: false};
        }
    }
    return {found: false};
}

function getViewer(container) {
    return new Viewer(container, getPanoramaAtPos);
}


export default {
    getCoverageLayer,
    getPanoramaAtPos,
    getViewer
};
