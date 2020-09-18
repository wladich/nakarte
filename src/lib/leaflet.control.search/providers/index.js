import {CoordinatesProvider} from './coordinates';
import {LinksProvider} from './links';
import {MapyCzProvider} from './mapycz';
import {PhotonProvider} from './photon';

const providers = {
    mapycz: MapyCzProvider,
    photon: PhotonProvider,
};

const magicProviders = [LinksProvider, CoordinatesProvider];

export {providers, magicProviders};
