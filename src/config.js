import secrets from './secrets';

export default Object.assign({
    email: 'nakarte@nakarte.tk',
    googleApiUrl: 'https://maps.googleapis.com/maps/api/js?v=3',
    westraDataBaseUrl: 'https://nakarte.tk/westraPasses/',
    CORSProxyUrl: 'https://proxy.nakarte.tk/',
    elevationsServer: 'http://elevation.nakarte.tk/',
    newsUrl: 'http://about.nakarte.tk',
    wikimediaCommonsCoverageUrl: 'https://tiles.nakarte.tk/wikimedia_commons_images/{z}/{x}/{y}',
    geocachingSuUrl: 'https://nakarte.tk/geocachingSu/geocaching_su.json',
    tracksStorageServer: 'http://tracks.nakarte.tk',
}, secrets);
