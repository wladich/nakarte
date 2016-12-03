import './track-list'
import L from 'leaflet';
import {parseGeoFile} from './lib/geo_file_formats';

L.Control.TrackList.include({
        maxLocalStorageSessions: 5,

        saveTracksToStorage: function() {
            if (!(window.localStorage)) {
                return;
            }
            var tracks = this.tracks(),
                serialized = [],
                maxKey = -1,
                i, track, s, key, m, keys = [];

            for (i = 0; i < localStorage.length; i++) {
                key = localStorage.key(i);
                m = key.match(/^trackList_(\d+)$/);
                if (m && m[1] !== undefined) {
                    if (+m[1] > maxKey) {
                        maxKey = +m[1];
                    }
                }
            }
            key = 'trackList_' + (maxKey + 1);

            if (tracks.length === 0) {
                localStorage.setItem(key, '');
                return;
            }
            for (i = 0; i < tracks.length; i++) {
                track = tracks[i];
                s = this.trackToString(track);
                serialized.push(s);
            }
            if (serialized.length === 0) {
                return;
            }
            s = '#nktk=' + serialized.join('/');

            localStorage.setItem(key, s);

            //cleanup stale records
            for (i = 0; i < localStorage.length; i++) {
                key = localStorage.key(i);
                m = key.match(/^trackList_(\d+)$/);
                if (m && m[1] !== undefined) {
                    keys.push(+m[1]);
                }
            }
            if (keys.length > this.maxLocalStorageSessions) {
                keys.sort(function(a, b) {
                        return a - b
                    }
                );
                for (i = 0; i < keys.length - this.maxLocalStorageSessions; i++) {
                    key = 'trackList_' + keys[i];
                    localStorage.removeItem(key);
                }
            }
        },

        loadTracksFromStorage: function() {
            if (!(window.localStorage)) {
                return;
            }
            var i, key, m, s,
                geodata,
                maxKey = -1;

            for (i = 0; i < localStorage.length; i++) {
                key = localStorage.key(i);
                m = key.match(/^trackList_(\d+)$/);
                if (m && m[1] !== undefined) {
                    if (+m[1] > maxKey) {
                        maxKey = +m[1];
                    }
                }
            }
            if (maxKey > -1) {
                key = 'trackList_' + maxKey;
                s = localStorage.getItem(key);
                localStorage.removeItem(key);
                if (s) {
                    geodata = parseGeoFile('', s);
                    this.addTracksFromGeodataArray(geodata);
                }
            }
        }
    }
);