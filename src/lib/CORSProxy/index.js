import config from '~/config';

function corsProxyOriginalUrl(url) {
    if (!url.startsWith(config.CORSProxyUrl)) {
        throw new Error('URL is not via CORS proxy');
    }
    url = url.slice(config.CORSProxyUrl.length);
    if (!url.match(/^https?\//u)) {
        throw new Error('Invalid URL via CORS proxy');
    }
    return url.replace('/', '://');
}

function urlViaCorsProxy(url) {
    for (let pattern of config.urlsBypassCORSProxy) {
        if (pattern.test(url)) {
            return url;
        }
    }
    return config.CORSProxyUrl + url.replace(/^(https?):\/\//u, '$1/');
}

export {urlViaCorsProxy, corsProxyOriginalUrl};
