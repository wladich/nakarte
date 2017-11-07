import L from 'leaflet';
import {parseGeoFile} from './lib/geo_file_formats';
import logging from 'lib/logging';

L.Control.TrackList.include(L.Mixin.HashState);
L.Control.TrackList.include({
        stateChangeEvents: [],

        serializeState: function(e) {
            return null;
        },

        unserializeState: function(values) {
            if (values && values.length) {
                logging.captureBreadcrumb({message: 'load track from hashState'});
                var geodata = parseGeoFile('', window.location.href);
                const notEmpty = this.addTracksFromGeodataArray(geodata, {url: window.location.href});
                if (notEmpty) {
                    this.setExpanded();
                }
            }
            return false;
        }
    }
);


