import {MapyCzProvider} from './mapycz';
import {PhotonProvider} from './photon';
import {LinksProvider} from './links';
import {CoordinatesProvider} from "./coordinates";

const providers = {
    mapycz: MapyCzProvider,
    photon: PhotonProvider,
};

const magicProviders = [LinksProvider, CoordinatesProvider];

export {providers, magicProviders};
