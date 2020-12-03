'use strict';

const filesWithSideEffects = ['src/lib/leaflet.layer.TileLayer.cutline/index.js'];
module.exports = {
    rules: {
        'import/no-unused-modules': [
            'error',
            {missingExports: true, unusedExports: true, ignoreExports: filesWithSideEffects},
        ],
        'import/no-unassigned-import': ['error', {allow: ['**/*.css', ...filesWithSideEffects]}],
    },
};
