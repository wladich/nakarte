import L from 'leaflet';

import '~/lib/leaflet.layer.mountainPasses';
import {FstrPassesMarkers} from './fstrPassesMarkers';

L.Layer.FstrPasses = L.Layer.MountainPasses.extend({
    options: {
        filePasses: 'fstr_passes.json',
        fileCoverage: 'fstr_coverage.json',
        fileLabels1: 'fstr_regions_labels1.json',
        fileLabels2: 'fstr_regions_labels2.json',
    },

    MarkersClass: FstrPassesMarkers,
});
