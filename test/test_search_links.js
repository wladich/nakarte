import {LinksProvider} from '~/lib/leaflet.control.search/providers/links';

const links = new LinksProvider();

suite('LinksProvider - parsing valid links');
[
    [
        'https://www.google.com/maps/@49.1906435,16.5429962,14z',
        [{title: 'Google map view', latlng: {lat: 49.1906435, lng: 16.5429962}, zoom: 14}],
    ],
    [
        'https://www.google.com.ua/maps/@49.1809973,61.6591562,5952m/data=!3m1!1e3?hl=ru',
        [{title: 'Google map view', latlng: {lat: 49.1809973, lng: 61.6591562}, zoom: 14}],
    ],
    [
        'https://yandex.ru/maps/10509/brno/?ll=16.548629%2C49.219896&z=14',
        [{title: 'Yandex map view', latlng: {lat: 49.219896, lng: 16.548629}, zoom: 14}],
    ],
    [
        'https://yandex.ru/maps/?ll=16.548629%2C49.219896&z=14',
        [{title: 'Yandex map view', latlng: {lat: 49.219896, lng: 16.548629}, zoom: 14}],
    ],
    [
        'https://yandex.ru/maps/?l=sat&ll=16.843527%2C49.363860&z=13',
        [{title: 'Yandex map view', latlng: {lat: 49.36386, lng: 16.843527}, zoom: 13}],
    ],
    [
        'https://yandex.ru/maps/?l=sat%2Cskl&ll=16.843527%2C49.363860&z=13',
        [{title: 'Yandex map view', latlng: {lat: 49.36386, lng: 16.843527}, zoom: 13}],
    ],
    [
        'https://static-maps.yandex.ru/1.x/?lang=ru_RU&size=520%2C440&l=sat%2Cskl&z=14&ll=16.548629%2C49.219896',
        [{title: 'Yandex map view', latlng: {lat: 49.219896, lng: 16.548629}, zoom: 14}],
    ],
    [
        'https://yandex.ru/maps/-/CCQpqZXJCB',
        [{title: 'Yandex map view', latlng: {lat: 49.219896, lng: 16.548629}, zoom: 14}],
    ],
    [
        'https://yandex.ru/maps/-/CCQpqZdgpA',
        [{title: 'Yandex map view', latlng: {lat: 49.219896, lng: 16.548629}, zoom: 14}],
    ],
    [
        'https://yandex.ru/maps/-/CCQpqZhrsB',
        [{title: 'Yandex map view', latlng: {lat: 49.219896, lng: 16.548629}, zoom: 14}],
    ],
    [
        'https://www.openstreetmap.org/#map=14/49.2199/16.5486',
        [{title: 'OpenStreetMap view', latlng: {lat: 49.2199, lng: 16.5486}, zoom: 14}],
    ],
    [
        'https://en.mapy.cz/turisticka?x=16.5651083&y=49.2222502&z=14',
        [{title: 'Mapy.cz view', latlng: {lat: 49.2222502, lng: 16.5651083}, zoom: 14}],
    ],
    [
        'https://www.openstreetmap.org/search?query=%D0%BD%D0%B5%D1%80%D1%81%D0%BA%D0%BE%D0%B5%20%D0%BE%D0%B7%D0%B5%D1%80%D0%BE#map=17/55.56647/38.87365', // eslint-disable-line max-len
        [{title: 'OpenStreetMap view', latlng: {lat: 55.56647, lng: 38.87365}, zoom: 17}],
    ],
    [
        'https://www.google.com/maps/place/Nerskoye+Ozero/@56.0836099,37.3849634,16z/data=!3m1!4b1!4m5!3m4!1s0x46b5178a0be6c5b1:0xb13c53547e1d966d!8m2!3d56.0826073!4d37.388256', // eslint-disable-line max-len
        [
            {title: 'Google map - Nerskoye Ozero', latlng: {lat: 56.0826073, lng: 37.388256}, zoom: 14},
            {title: 'Google map view', latlng: {lat: 56.0836099, lng: 37.3849634}, zoom: 16},
        ],
    ],
    [
        'https://www.google.ru/maps/place/%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0,+%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D1%8F/@55.5807481,36.8251331,9z/data=!3m1!4b1!4m5!3m4!1s0x46b54afc73d4b0c9:0x3d44d6cc5757cf4c!8m2!3d55.755826!4d37.6173', // eslint-disable-line max-len
        [
            {title: 'Google map - Москва, Россия', latlng: {lat: 55.755826, lng: 37.6173}, zoom: 14},
            {title: 'Google map view', latlng: {lat: 55.5807481, lng: 36.8251331}, zoom: 9},
        ],
    ],
    [
        'https://www.google.com/maps/place/Vav%C5%99ineck%C3%A1,+514+01+Jilemnice/@50.6092632,15.5023689,17z/data=!3m1!4b1!4m5!3m4!1s0x470ebf1b56d0fca9:0xddb7e19a6b1f5828!8m2!3d50.6092632!4d15.5045576', // eslint-disable-line max-len
        [
            {title: 'Google map - Vavřinecká, 514 01 Jilemnice', latlng: {lat: 50.6092632, lng: 15.5045576}, zoom: 14},
            {title: 'Google map view', latlng: {lat: 50.6092632, lng: 15.5023689}, zoom: 17},
        ],
    ],
    [
        'https://www.google.com/maps?q=loc:49.1817864,16.5771214',
        [{title: 'Google map view', latlng: {lat: 49.1817864, lng: 16.5771214}, zoom: 17}],
    ],
    [
        'https://maps.google.com/maps?q=49.223089,16.554547&ll=49.223089,16.554547&z=16',
        [{title: 'Google map view', latlng: {lat: 49.223089, lng: 16.554547}, zoom: 17}],
    ],
    [
        'https://www.google.com/maps?q=loc:-49.1817864,-16.5771214',
        [{title: 'Google map view', latlng: {lat: -49.1817864, lng: -16.5771214}, zoom: 17}],
    ],
    [
        'https://www.google.ru/maps?q=loc:-49.1817864,-16.5771214',
        [{title: 'Google map view', latlng: {lat: -49.1817864, lng: -16.5771214}, zoom: 17}],
    ],
    [
        'https://www.google.com/maps/@49.1906435,16.5429962,14z?q=loc:49.1817864,16.5771214',
        [{title: 'Google map view', latlng: {lat: 49.1906435, lng: 16.5429962}, zoom: 14}],
    ],
    [
        'https://www.google.com/maps/place/Nerskoye+Ozero/@56.0836099,37.3849634,16z/data=!3m1!4b1!4m5!3m4!1s0x46b5178a0be6c5b1:0xb13c53547e1d966d!8m2!3d56.0826073!4d37.388256?q=loc:-49.1817864,-16.5771214', // eslint-disable-line max-len
        [
            {title: 'Google map - Nerskoye Ozero', latlng: {lat: 56.0826073, lng: 37.388256}, zoom: 14},
            {title: 'Google map view', latlng: {lat: 56.0836099, lng: 37.3849634}, zoom: 16},
        ],
    ],
    [
        'https://www.google.com/maps/place/Nerskoye+Ozero/data=!3m1!4b1!4m5!3m4!1s0x46b5178a0be6c5b1:0xb13c53547e1d966d!8m2!3d56.0826073!4d37.388256', // eslint-disable-line max-len
        [{title: 'Google map - Nerskoye Ozero', latlng: {lat: 56.0826073, lng: 37.388256}, zoom: 14}],
    ],
    [
        'https://www.google.com/maps/place/Nerskoye+Ozero/@56.0836099,37.3849634,16z/', // eslint-disable-line max-len
        [{title: 'Google map view', latlng: {lat: 56.0836099, lng: 37.3849634}, zoom: 16}],
    ],
    [
        'https://www.google.com/maps/@56.0836099,37.3849634,16z/data=!3m1!4b1!4m5!3m4!1s0x46b5178a0be6c5b1:0xb13c53547e1d966d!8m2!3d56.0826073!4d37.388256', // eslint-disable-line max-len
        [{title: 'Google map view', latlng: {lat: 56.0836099, lng: 37.3849634}, zoom: 16}],
    ],
    [
        'https://www.google.com/maps/@48.6514614,16.9945421,3a,75y,253.17h,90t/data=!3m7!1e1!3m5!1s4MYpvu63gL3ZArPiSohExg!2e0!6shttps:%2F%2Fstreetviewpixels-pa.googleapis.com%2Fv1%2Fthumbnail%3Fpanoid%3D4MYpvu63gL3ZArPiSohExg%26cb_client%3Dmaps_sv.tactile.gps%26w%3D203%26h%3D100%26yaw%3D253.16992%26pitch%3D0%26thumbfov%3D100!7i13312!8i6656', // eslint-disable-line max-len
        [{title: 'Google map view', latlng: {lat: 48.6514614, lng: 16.9945421}, zoom: 16}],
    ],
    [
        'https://nakarte.me/#m=11/49.44893/16.59897&l=O',
        [{title: 'Nakarte view', latlng: {lat: 49.44893, lng: 16.59897}, zoom: 11}],
    ],
    [
        'https://nakarte.me/#l=O&m=11/49.44893/16.59897',
        [{title: 'Nakarte view', latlng: {lat: 49.44893, lng: 16.59897}, zoom: 11}],
    ],
    [
        'https://example.com/#l=O&m=11/49.44893/16.59897',
        [{title: 'Nakarte view', latlng: {lat: 49.44893, lng: 16.59897}, zoom: 11}],
    ],
    [
        'https://en.mapy.cz/s/favepemeko',
        [{title: 'Mapy.cz view', latlng: {lat: 49.4113109, lng: 16.8975623}, zoom: 11}],
    ],
    [
        'https://en.mapy.cz/s/lucacunomo',
        [{title: 'Mapy.cz view', latlng: {lat: 49.4113109, lng: 16.8975623}, zoom: 11}],
    ],
    [
        'https://en.mapy.cz/s/mepevemazo',
        [{title: 'Mapy.cz view', latlng: {lat: 50.1592323, lng: 16.8245081}, zoom: 12}],
    ],
    [
        'https://goo.gl/maps/cJ8wwQi9oMYM9yiy6',
        [{title: 'Google map view', latlng: {lat: 49.0030846, lng: 15.2993434}, zoom: 14}],
    ],
    [
        'https://goo.gl/maps/ZvjVBY78HUP8HjQi6',
        [
            {title: 'Google map - 561 69 Dolní Morava', latlng: {lat: 50.1223171, lng: 16.7995866}, zoom: 14},
            {title: 'Google map view', latlng: {lat: 50.1568257, lng: 16.754047}, zoom: 12},
        ],
    ],
    [
        'https://goo.gl/maps/iMv4esLL1nwF9yns7',
        [
            {title: 'Google map - 561 69 Dolní Morava', latlng: {lat: 50.1223171, lng: 16.7995866}, zoom: 14},
            {title: 'Google map view', latlng: {lat: 50.1568257, lng: 16.754047}, zoom: 12},
        ],
    ],
    [
        'http://openstreetmap.ru/?mapid=497235296#map=12/60.9426/29.849&layer=C',
        [{title: 'OpenStreetMap view', latlng: {lat: 60.9426, lng: 29.849}, zoom: 12}],
    ],
].forEach(function ([query, expectedResults]) {
    test(`Parse link ${query}`, async function () {
        this.timeout(10000);
        assert.isTrue(links.isOurQuery(query));
        const result = await links.search(query);
        assert.notProperty(result, 'error');
        assert.property(result, 'results');
        const actualResults = result.results.map((item) => ({
            title: item.title,
            latlng: {lat: item.latlng.lat, lng: item.latlng.lng},
            zoom: item.zoom,
        }));
        assert.deepEqual(expectedResults, actualResults);
    });
});

suite('LinksProvider - parse invalid links');
[
    ['https://', 'Invalid link'],
    ['http://', 'Invalid link'],
    ['https://example.com', 'Unsupported link'],
    ['https://yandex.ru/maps/', 'Invalid coordinates in Yandex link'],
    ['https://yandex.ru/maps/10509/brno/?ll=16.548629%2C149.219896&z=14', 'Invalid coordinates in Yandex link'],
    [
        'https://static-maps.yandex.ru/1.x/?lang=ru_RU&size=520%2C440&l=sat%2Cskl&ll=16.548629%2C49.219896',
        'Invalid coordinates in Yandex link',
    ],
    ['https://en.mapy.cz/turisticka?x=16.5651083&y=49.2222502&z=', 'Invalid coordinates in Mapy.cz link'],
    ['https://www.google.com/maps', 'Invalid coordinates in Google link'],
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
    ['https://en.mapy.cz/s/lucacunom', 'Broken Mapy.cz short link'],
    ['https://goo.gl/maps/ZvjVBY78HUP8HjQi', 'Broken Google short link'],
    // ['https://yandex.ru/maps/-/CCQpqZXJ', 'Broken Yandex short link'], // Yandex returns good result for broken link
].forEach(function ([query, expectedError]) {
    test(`Invalid link ${query}`, async function () {
        assert.isTrue(links.isOurQuery(query));
        const result = await links.search(query);
        assert.notProperty(result, 'results');
        assert.propertyVal(result, 'error', expectedError);
    });
});

suite('LinksProvider - not links');
['abc', 'http:/', 'https:/', 'https:/'].forEach(function (query) {
    test(`Not a link ${query}`, function () {
        assert.isFalse(links.isOurQuery(query));
    });
});
