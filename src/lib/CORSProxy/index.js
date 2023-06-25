import config from '~/config';

export default function urlViaCorsProxy(url) {
    for (let pattern of config.urlsBypassCORSProxy) {
        if (pattern.test(url)) {
            return url;
        }
    }
    return config.CORSProxyUrl + url.replace(/^(https?):\/\//u, '$1/');
}
