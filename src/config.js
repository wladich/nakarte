import secrets from './secrets';

export default Object.assign({
    email: 'nakarte@nakarte.tk',
    googleApiUrl: `https://maps.googleapis.com/maps/api/js?v=3&key=${secrets.google}`,
    westraDataBaseUrl: 'https://nakarte.tk/westraPasses/',
    CORSProxyUrl: 'https://proxy.nakarte.tk/',
    elevationsServer: 'https://elevation.nakarte.tk/',
    newsUrl: 'https://about.nakarte.tk',
    wikimediaCommonsCoverageUrl: 'https://tiles.nakarte.tk/wikimedia_commons_images/{z}/{x}/{y}',
    geocachingSuUrl: 'https://nakarte.tk/geocachingSu/geocaching_su.json',
    tracksStorageServer: 'https://tracks.nakarte.tk',
}, secrets);
