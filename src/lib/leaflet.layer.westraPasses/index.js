import L from 'leaflet';

import '~/lib/leaflet.layer.mountainPasses';
import {WestraPassesMarkers} from './westraPassesMarkers';

L.Layer.WestraPasses = L.Layer.MountainPasses.extend({
    options: {
        filePasses: 'westra_passes.json',
        fileCoverage: 'westra_coverage.json',
        fileLabels1: 'westra_regions_labels1.json',
        fileLabels2: 'westra_regions_labels2.json',
    },

    MarkersClass: WestraPassesMarkers,
});
