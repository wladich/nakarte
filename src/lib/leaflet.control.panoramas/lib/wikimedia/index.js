import L from 'leaflet';
import {fetch} from 'lib/xhr-promise';
import config from 'config';
import {Viewer} from '../photo-viewer';
import {makeCoverageLayer} from '../photo-coverage-layer';


function getCoverageLayer(options) {
    return makeCoverageLayer(config.wikimediaCommonsCoverageUrl, 11, '#ff00ff', options);
}

function formatDateTime(dateStr) {
    const m = /^(\d+)-(\d+)-(\d+)/.exec(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (m) {
        let [year, month, day] = m.slice(1);
        return `${day} ${months[month - 1]} ${year}`;
    } else {
        return dateStr;
    }
}

function parseSearchResponse(resp) {
    const images = [];
    if (resp && resp.query && resp.query.pages && resp.query.pages) {
        for (let page of Object.values(resp.query.pages)) {
            const iinfo = page.imageinfo[0];
            let imageDescription = iinfo.extmetadata.ImageDescription ? iinfo.extmetadata.ImageDescription.value : null;
            let objectDescription = iinfo.extmetadata.ObjectName ? iinfo.extmetadata.ObjectName.value : null;
            if (imageDescription && /^<table (.|\n)+<\/table>$/.test(imageDescription)) {
                imageDescription = null;
            }
            if (imageDescription) {
                imageDescription = imageDescription.replace(/<[^>]+>/g, '');
                imageDescription = imageDescription.replace(/[\n\r]/g, '');
            }
            if (imageDescription && objectDescription && objectDescription.toLowerCase().includes(imageDescription.toLowerCase())) {
                imageDescription = null;
            }
            if (objectDescription && imageDescription && imageDescription.toLowerCase().includes(objectDescription.toLowerCase())) {
                objectDescription = null;
            }
            let description = 'Wikimedia commons';
            if (objectDescription || imageDescription) {
                description = '';
                if (objectDescription) {
                    description = objectDescription;
                }
                if (imageDescription) {
                    if (objectDescription) {
                        description += '</br>';
                    }
                    description += imageDescription;
                }
            }

            let author = iinfo.extmetadata.Artist ? iinfo.extmetadata.Artist.value : null;
            if (author && /^<table (.|\n)+<\/table>$/.test(author)) {
                author = `See author info at <a href="${iinfo.descriptionurl}">Wikimedia commons</a>`;
            }

            // original images can be rotated, 90 degrees
            // thumbnails are always oriented right
            // so we request thumbnail of original image size
            let url = iinfo.thumburl.replace('134px', `${iinfo.width}px`);
            let timeOriginal = iinfo.extmetadata.DateTimeOriginal ? iinfo.extmetadata.DateTimeOriginal.value : null;
            if (timeOriginal) {
                timeOriginal = formatDateTime(timeOriginal);
            }
            images.push({
                url,
                width: iinfo.width,
                height: iinfo.height,
                lat: page.coordinates[0].lat,
                lng: page.coordinates[0].lon,
                author: author,
                timeOriginal: timeOriginal,
                description: description,
                pageUrl: iinfo.descriptionurl,
                pageId: page.pageid.toString()
            })
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
    const urlTemplate = 'https://commons.wikimedia.org/w/api.php?' +
                        'origin=*&format=json&action=query&generator=geosearch&' +
                        'ggsprimary=all&ggsnamespace=6&ggslimit=10&iilimit=1&' +
                        'ggsradius={radius}&ggscoord={lat}|{lng}&' +
                        'iiurlwidth=134&' +
                        'prop=imageinfo|coordinates&' +
                        'iiprop=url|mime|size|extmetadata|commonmetadata|metadata';
    searchRadiusMeters += clusterSize;
    if (searchRadiusMeters < 10) {
        searchRadiusMeters = 10;
    }
    if (searchRadiusMeters > 10000) {
        searchRadiusMeters = 10000;
    }
    const url = L.Util.template(urlTemplate, {lat: latlng.lat, lng: latlng.lng, radius: searchRadiusMeters});
    const resp = await fetch(url, {responseType: 'json', timeout: 10000});
    if (resp.status === 200) {
        let photos = parseSearchResponse(resp.responseJSON);
        if (photos) {
            latlng = L.latLng(latlng.lat, latlng.lng);
            photos.sort(isCloser.bind(null, latlng));
            latlng = L.latLng(photos[0].lat, photos[0].lng);
            photos = photos.filter((photo) => latlng.distanceTo(L.latLng(photo.lat, photo.lng)) <= clusterSize);
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
