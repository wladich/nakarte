import secrets from './secrets';

export default Object.assign({
    email: 'nakarte@nakarte.tk',
    googleApiUrl: 'https://maps.googleapis.com/maps/api/js?v=3',
    westraDataBaseUrl: 'http://nakarte.tk/westraPasses/',
    CORSProxyUrl: 'http://proxy.nakarte.tk/',
    elevationsServer: 'http://elevation.nakarte.tk/',
    newsUrl: 'http://about.nakarte.tk',
    wikimediaCommonsCoverageUrl: 'http://tiles.nakarte.tk/wikimedia_commons_images/{z}/{x}/{y}'
}, secrets);
