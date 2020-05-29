import secrets from './secrets';

export default {
    caption: `
        <a href="https://docs.nakarte.me">Documentation</a> |
        <a href="https://about.nakarte.me">News</a> |
        <a href="mailto:nakarte@nakarte.me" target="_self">nakarte@nakarte.me</a> |
        <a href="https://about.nakarte.me/p/blog-page_29.html">Donate</a>`,
    defaultLocation: [55.75185, 37.61856],
    defaultZoom: 10,
    googleApiUrl: `https://maps.googleapis.com/maps/api/js?v=3&key=${secrets.google}`,
    westraDataBaseUrl: 'https://nakarte.me/westraPasses/',
    CORSProxyUrl: 'https://proxy.nakarte.me/',
    elevationsServer: 'https://elevation.nakarte.me/',
    wikimediaCommonsCoverageUrl: 'https://tiles.nakarte.me/wikimedia_commons_images/{z}/{x}/{y}',
    geocachingSuUrl: 'https://nakarte.me/geocachingSu/geocaching_su2.json',
    tracksStorageServer: 'https://tracks.nakarte.me',
    ...secrets
};
