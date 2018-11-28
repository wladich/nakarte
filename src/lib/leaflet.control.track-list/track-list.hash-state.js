import L from 'leaflet';
import loadFromUrl from './lib/loadFromUrl';
import logging from 'lib/logging';
import {parseNktkSequence} from './lib/parsers/nktk';


L.Control.TrackList.include({
        loadNktkFromHash: function(values) {
            if (!values || !(values.length)) {
                return false;
            }
            logging.captureBreadcrumb({message: 'load nktk from hashState'});
            const geodata = parseNktkSequence(values);
            const notEmpty = this.addTracksFromGeodataArray(geodata, {href: window.location.href});
            if (notEmpty) {
                this.setExpanded();
            }
        },

        loadNktlFromHash: function(values) {
            if (!values || !(values.length)) {
                return false;
            }
            logging.captureBreadcrumb({message: 'load nktl from hashState'});
            const url = `#nktl=${values[0]}`;
            const href = window.location.href;
            loadFromUrl(url).then(
                (geodata) => {
                    const notEmpty = this.addTracksFromGeodataArray(geodata, {href});
                    if (notEmpty) {
                        this.setExpanded();
                    }
                }
            );
        }
    }
);


