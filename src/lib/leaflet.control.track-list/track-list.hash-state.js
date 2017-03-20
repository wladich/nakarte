import L from 'leaflet';
import {parseGeoFile} from './lib/geo_file_formats';

L.Control.TrackList.include(L.Mixin.HashState);
L.Control.TrackList.include({
        stateChangeEvents: [],

        serializeState: function(e) {
            return null;
        },

        unserializeState: function(values) {
            if (values && values.length) {
                var geodata = parseGeoFile('', window.location.href);
                const notEmpty = this.addTracksFromGeodataArray(geodata);
                if (notEmpty) {
                    this.setExpanded();
                }
            }
            return false;
        }
    }
);


