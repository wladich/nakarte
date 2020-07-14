import {LinksProvider} from '~/lib/leaflet.control.search/providers/links';

const links = new LinksProvider();

suite('LinksProvider - parsing valid links');
[
    [
        'https://www.google.com/maps/@49.1906435,16.5429962,14z',
        'Google map view',
        {lat: 49.1906435, lng: 16.5429962},
        14,
    ],
    [
        'https://yandex.ru/maps/10509/brno/?ll=16.548629%2C49.219896&z=14',
        'Yandex map view',
        {lat: 49.219896, lng: 16.548629},
        14,
    ],
    ['https://yandex.ru/maps/?ll=16.548629%2C49.219896&z=14', 'Yandex map view', {lat: 49.219896, lng: 16.548629}, 14],
    ['https://www.openstreetmap.org/#map=14/49.2199/16.5486', 'OpenStreetMap view', {lat: 49.2199, lng: 16.5486}, 14],
    [
        'https://en.mapy.cz/turisticka?x=16.5651083&y=49.2222502&z=14',
        'Mapy.cz view',
        {lat: 49.2222502, lng: 16.5651083},
        14,
    ],
    [
        'https://www.openstreetmap.org/search?query=%D0%BD%D0%B5%D1%80%D1%81%D0%BA%D0%BE%D0%B5%20%D0%BE%D0%B7%D0%B5%D1%80%D0%BE#map=17/55.56647/38.87365', // eslint-disable-line max-len
        'OpenStreetMap view',
        {lat: 55.56647, lng: 38.87365},
        17,
    ],
    [
        'https://www.google.com/maps/place/Nerskoye+Ozero/@56.0836099,37.3849634,16z/data=!3m1!4b1!4m5!3m4!1s0x46b5178a0be6c5b1:0xb13c53547e1d966d!8m2!3d56.0826073!4d37.388256', // eslint-disable-line max-len
        'Google map - Nerskoye Ozero',
        {lat: 56.0836099, lng: 37.3849634},
        16,
    ],
    [
        'https://www.google.ru/maps/place/%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0,+%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D1%8F/@55.5807481,36.8251331,9z/data=!3m1!4b1!4m5!3m4!1s0x46b54afc73d4b0c9:0x3d44d6cc5757cf4c!8m2!3d55.755826!4d37.6173', // eslint-disable-line max-len
        'Google map - Москва, Россия',
        {lat: 55.5807481, lng: 36.8251331},
        9,
    ],
    [
        'https://www.google.com/maps/place/Vav%C5%99ineck%C3%A1,+514+01+Jilemnice/@50.6092632,15.5023689,17z/data=!3m1!4b1!4m5!3m4!1s0x470ebf1b56d0fca9:0xddb7e19a6b1f5828!8m2!3d50.6092632!4d15.5045576', // eslint-disable-line max-len
        'Google map - Vavřinecká, 514 01 Jilemnice',
        {lat: 50.6092632, lng: 15.5023689},
        17,
    ],
    [
        'https://www.google.com/maps?q=loc:49.1817864,16.5771214',
        'Google map view',
        {lat: 49.1817864, lng: 16.5771214},
        17,
    ],
    [
        'https://maps.google.com/maps?q=49.223089,16.554547&ll=49.223089,16.554547&z=16',
        'Google map view',
        {lat: 49.223089, lng: 16.554547},
        17,
    ],
    [
        'https://www.google.com/maps?q=loc:-49.1817864,-16.5771214',
        'Google map view',
        {lat: -49.1817864, lng: -16.5771214},
        17,
    ],
    [
        'https://www.google.ru/maps?q=loc:-49.1817864,-16.5771214',
        'Google map view',
        {lat: -49.1817864, lng: -16.5771214},
        17,
    ],
    [
        'https://www.google.com/maps/@49.1906435,16.5429962,14z?q=loc:49.1817864,16.5771214',
        'Google map view',
        {lat: 49.1906435, lng: 16.5429962},
        14,
    ],
    [
        'https://www.google.com/maps/place/Nerskoye+Ozero/@56.0836099,37.3849634,16z/data=!3m1!4b1!4m5!3m4!1s0x46b5178a0be6c5b1:0xb13c53547e1d966d!8m2!3d56.0826073!4d37.388256?q=loc:-49.1817864,-16.5771214', // eslint-disable-line max-len
        'Google map - Nerskoye Ozero',
        {lat: 56.0836099, lng: 37.3849634},
        16,
    ],

    ['https://nakarte.me/#m=11/49.44893/16.59897&l=O', 'Nakarte view', {lat: 49.44893, lng: 16.59897}, 11],
    ['https://nakarte.me/#l=O&m=11/49.44893/16.59897', 'Nakarte view', {lat: 49.44893, lng: 16.59897}, 11],
    ['https://example.com/#l=O&m=11/49.44893/16.59897', 'Nakarte view', {lat: 49.44893, lng: 16.59897}, 11],
].forEach(function([query, expectedTitle, expectedCoordinates, expectedZoom]) {
    test(`Parse link ${query}`, async function() {
        assert.isTrue(links.isOurQuery(query));
        const result = await links.search(query);
        assert.notProperty(result, 'error');
        assert.property(result, 'results');
        assert.lengthOf(result.results, 1);
        const item = result.results[0];
        const resultGot = {
            title: item.title,
            latlng: {lat: item.latlng.lat, lng: item.latlng.lng},
            zoom: item.zoom,
        };
        const resultExpected = {title: expectedTitle, latlng: expectedCoordinates, zoom: expectedZoom};
        assert.deepEqual(resultExpected, resultGot);
    });
});

suite('LinksProvider - parse invalid links');
[
    ['https://', 'Invalid link'],
    ['http://', 'Invalid link'],
    ['https://example.com', 'Unsupported link'],
    ['https://yandex.ru/maps/-/CCQlZLeFHA', 'Invalid coordinates in Yandex link'],
    ['https://yandex.ru/maps/', 'Invalid coordinates in Yandex link'],
    ['https://yandex.ru/maps/10509/brno/?ll=16.548629%2C149.219896&z=14', 'Invalid coordinates in Yandex link'],
    ['https://en.mapy.cz/s/kofosuhuda', 'Invalid coordinates in Mapy.cz link'],
    ['https://en.mapy.cz/turisticka?x=16.5651083&y=49.2222502&z=', 'Invalid coordinates in Mapy.cz link'],
    ['https://www.google.com/maps', 'Invalid coordinates in Google link'],
    ['https://goo.gl/maps/igLWhY3jFpifZhTk6', 'Unsupported link'],
    ['https://www.google.com/maps/@99.1906435,16.5429962,14z', 'Invalid coordinates in Google link'],
    ['https://www.google.com/maps/@49.1906435,190.5429962,14z', 'Invalid coordinates in Google link'],
    ['https://www.google.com/maps/@49.1906435,19.5429962,45z', 'Invalid coordinates in Google link'],
    ['https://www.google.com/maps?q=loc:49.1817864,', 'Invalid coordinates in Google link'],
    ['https://www.google.com/maps?q=loc:49.1817864', 'Invalid coordinates in Google link'],
    ['https://www.google.com/maps?q=loc:4', 'Invalid coordinates in Google link'],
    ['https://www.google.com/maps?q=loc:', 'Invalid coordinates in Google link'],
    ['https://www.google.com/maps?q=', 'Invalid coordinates in Google link'],
    ['https://www.google.com/maps?q', 'Invalid coordinates in Google link'],
    ['https://www.google.com/maps?', 'Invalid coordinates in Google link'],
    ['https://www.google.com/maps?q=loc:99.1817864,16.5771214', 'Invalid coordinates in Google link'],
    ['https://www.google.com/maps?q=loc:49.1817864,196.5771214', 'Invalid coordinates in Google link'],
    ['https://nakarte.me/', 'Invalid coordinates in Nakarte link'],
    ['https://nakarte.me/#l=O', 'Invalid coordinates in Nakarte link'],
    ['https://example.com/#l=O&m=11/49.44893/', 'Unsupported link'],
    ['https://example.com/#l=O&m=99/49.44893/52.5547', 'Unsupported link'],
].forEach(function([query, expectedError]) {
    test(`Invalid link ${query}`, async function() {
        assert.isTrue(links.isOurQuery(query));
        const result = await links.search(query);
        assert.notProperty(result, 'results');
        assert.propertyVal(result, 'error', expectedError);
    });
});

suite('LinksProvider - not links');
['abc', 'http:/', 'https:/', 'https:/'].forEach(function(query) {
    test(`Not a link ${query}`, function() {
        assert.isFalse(links.isOurQuery(query));
    });
});
