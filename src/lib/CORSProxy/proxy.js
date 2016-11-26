import config from 'config';

export default function urlViaCorsProxy(url) {
    return config.CORSProxyUrl + url.replace(/^(https?):\/\//, '$1/');
};
