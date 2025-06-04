import L from 'leaflet';

class LayerCutlineOverview extends L.Layer {
    options = {
        style: {
            stroke: true,
            color: '#db5a00',
            weight: 4,
            opacity: 1,
            fill: true,
            fillOpacity: 0.2,
        },
    };

    constructor(cutline, maxOverviewZoom, text) {
        super();
        this.cutline = cutline;
        this.maxZoom = maxOverviewZoom;
        this.text = text;
        this._features = L.featureGroup();
        this._isCutlineRequested = false;
    }

    onAdd() {
        if (!this._isCutlineRequested) {
            this._isCutlineRequested = true;
            this._createFeatures().then(this._updateVisibility.bind(this));
        }
        this._updateVisibility();
        this._map.on('zoomend', this._updateVisibility, this);
    }

    onRemove() {
        this._map.off('zoomend', this._updateVisibility, this);
        this._map.removeLayer(this._features);
    }

    async _createFeatures() {
        let cutlinePromise = this.cutline;
        if (typeof cutlinePromise === 'function') {
            cutlinePromise = cutlinePromise();
        }
        if (!cutlinePromise.then) {
            cutlinePromise = Promise.resolve(cutlinePromise);
        }
        let cutlineCoords;
        try {
            cutlineCoords = await cutlinePromise;
        } catch (_) {
            // will be handled as empty later
        }
        if (cutlineCoords) {
            for (const lineString of cutlineCoords) {
                const feature = L.polygon(
                    lineString.map(([lon, lat]) => [lat, lon]),
                    this.options.style
                );
                feature.bindTooltip(this.text, {sticky: true});
                feature.on('click', (e) => this._map.setView(e.latlng, this.maxZoom + 1));
                this._features.addLayer(feature);
            }
        }
    }

    _updateVisibility() {
        if (!this._map) {
            return;
        }
        const zoom = this._map.getZoom();
        if (zoom <= this.maxZoom) {
            this._map.addLayer(this._features);
            this._features.bringToBack();
        } else {
            this._map.removeLayer(this._features);
        }
    }
}

export {LayerCutlineOverview};
