import {MapyCzProvider} from './mapycz';
import {PhotonProvider} from './photon';
import {LinksProvider} from './links';

const providers = {
    mapycz: MapyCzProvider,
    photon: PhotonProvider,
};

const magicProviders = [LinksProvider];

export {providers, magicProviders};
