import './track-list';
import L from 'leaflet';
import {parseNktkSequence} from './lib/parsers/nktk';
import safeLocalStorage from '~/lib/safe-localstorage';
import * as logging from '~/lib/logging';

L.Control.TrackList.include({
        maxLocalStorageSessions: 5,

        saveTracksToStorage: function() {
            var tracks = this.tracks(),
                serialized = [],
                maxKey = -1,
                i, track, s, key, m,
                keys = [];

            for (i = 0; i < safeLocalStorage.length; i++) {
                key = safeLocalStorage.key(i);
                m = key.match(/^trackList_(\d+)$/u);
                if (m && m[1] !== undefined) {
                    if (Number(m[1]) > maxKey) {
                        maxKey = Number(m[1]);
                    }
                }
            }
            key = 'trackList_' + (maxKey + 1);

            if (tracks.length === 0) {
                safeLocalStorage.setItem(key, '');
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

            safeLocalStorage.setItem(key, s);

            // cleanup stale records
            for (i = 0; i < safeLocalStorage.length; i++) {
                key = safeLocalStorage.key(i);
                m = key.match(/^trackList_(\d+)$/u);
                if (m && m[1] !== undefined) {
                    keys.push(Number(m[1]));
                }
            }
            if (keys.length > this.maxLocalStorageSessions) {
                keys.sort(function(a, b) {
                        return a - b;
                    }
                );
                for (i = 0; i < keys.length - this.maxLocalStorageSessions; i++) {
                    key = 'trackList_' + keys[i];
                    safeLocalStorage.removeItem(key);
                }
            }
        },

        loadTracksFromStorage: function() {
            var i, key, m, s,
                geodata,
                maxKey = -1;

            for (i = 0; i < safeLocalStorage.length; i++) {
                key = safeLocalStorage.key(i);
                m = key.match(/^trackList_(\d+)$/u);
                if (m && m[1] !== undefined) {
                    if (Number(m[1]) > maxKey) {
                        maxKey = Number(m[1]);
                    }
                }
            }
            if (maxKey > -1) {
                key = 'trackList_' + maxKey;
                s = safeLocalStorage.getItem(key);
                safeLocalStorage.removeItem(key);
                if (s) {
                    logging.captureBreadcrumb('load track from localStorage');
                    s = s.slice(6); // remove "#nktk=" prefix
                    geodata = parseNktkSequence(s);
                    this.addTracksFromGeodataArray(geodata);
                }
            }
        }
    }
);
