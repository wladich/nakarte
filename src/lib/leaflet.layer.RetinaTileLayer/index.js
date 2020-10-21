import L from 'leaflet';

class RetinaTileLayer extends L.TileLayer {
    constructor(urls, options, hiRes = 'auto') {
        let url, tileSizeMultiplicator;
        const useHiResTiles = hiRes === 'auto' ? L.Browser.retina : hiRes;
        const newOptions = L.extend({}, options);
        if (useHiResTiles) {
            url = urls[1];
            tileSizeMultiplicator = 2;
        } else {
            tileSizeMultiplicator = 1;
            url = urls[0];
        }
        if (options.retinaOptionsOverrides) {
            L.extend(newOptions, options.retinaOptionsOverrides[useHiResTiles ? 1 : 0]);
        }
        super(url, newOptions);
        this.urls = urls;
        this.tileSizeMultiplicator = tileSizeMultiplicator;
    }
}

export {RetinaTileLayer};
