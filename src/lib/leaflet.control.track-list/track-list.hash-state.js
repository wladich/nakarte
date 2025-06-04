import L from 'leaflet';
import {NakarteUrlLoader} from './lib/services/nakarte';

L.Control.TrackList.include({
        hashParams: function() {
            return new NakarteUrlLoader().paramNames();
        },

        loadTrackFromParam: async function(paramName, values) {
            if (!values || !values.length) {
                return;
            }
            this.readingFiles(this.readingFiles() + 1);
            const geodata = await new NakarteUrlLoader().geoData(paramName, values);
            const notEmpty = this.addTracksFromGeodataArray(geodata);
            this.readingFiles(this.readingFiles() - 1);
            if (notEmpty) {
                this.fire('loadedTracksFromParam');
            }
        },
    }
);

