import L from 'leaflet';
// import {enableGeoJSONPathFactories} from '~/lib/leaflet.layer.geojson-ex';
import '~/lib/leaflet.layer.geojson-ajax';
import './style.css';

// enableGeoJSONPathFactories();

const TransparentSVG = L.SVG.extend({
    options: {
        opacity: 1,
    },

    _initContainer: function () {
        L.SVG.prototype._initContainer.call(this);
        this._container.style.opacity = this.options.opacity;
    },
});

const origPathOnAdd = L.Path.prototype.onAdd;
const origPathOnRemove = L.Path.prototype.onRemove;
L.extend(L.Path.prototype, {
    setLayerVisibility: function () {
        const minZoom = this.options.minZoom ?? -Infinity;
        const maxZoom = this.options.maxZoom ?? Infinity;
        const mapZoom = this._map.getZoom();

        if (mapZoom >= minZoom && mapZoom <= maxZoom) {
            this.show();
        } else {
            this.hide();
        }
    },

    show: function () {
        if (this._visible) {
            return;
        }
        origPathOnAdd.call(this);
        this._visible = true;
    },

    hide: function () {
        if (!this._visible) {
            return;
        }

        origPathOnRemove.call(this);
        this._visible = false;
    },

    onAdd: function (map) {
        map.on('zoomend', this.setLayerVisibility, this);
        this.setLayerVisibility();
    },

    onRemove: function (map) {
        map.off('zoomend', this.setLayerVisibility, this);
        this.hide();
    },
});


const LimitZoomLayerWrapper = L.Layer.extend({
    initialize: function (layer, minZoom, maxZoom) {
        this.layer = layer;
        this.minZoom = minZoom ?? 0;
        this.maxZoom = maxZoom ?? Infinity;
    },

    onAdd: function (map) {
        map.on('zoomend', this.setLayerVisibility, this);
        this.setLayerVisibility();
    },

    onRemove: function (map) {
        map.off('zoomend', this.setLayerVisibility, this);
        map.removeLayer(this.layer);
    },

    setLayerVisibility: function () {
        const mapZoom = this._map.getZoom();
        if (mapZoom >= this.minZoom && mapZoom <= this.maxZoom) {
            this._map.addLayer(this.layer);
        } else {
            this._map.removeLayer(this.layer);
        }
    },
});

const RotatedTooltip = L.Tooltip.extend({
    _setPosition: function (pos) {
        L.Tooltip.prototype._setPosition.call(this, pos);
        const angle = this.options.angle;
        if (angle) {
            this._container.style[L.DomUtil.TRANSFORM] += ` rotate(${angle}deg)`;
            this._container.style[`${L.DomUtil.TRANSFORM}Origin`] = 'center';
        }
    },
});

const WestraRegions = L.Layer.GeoJSONAjax.extend({
    statics: {
        maxZoom: 18,
        // colors: ['red', 'blue', 'green', 'cyan', 'yellow', 'magenta'],
        colors: ['#ffaa7f', '#00aaff', '#55ff7f', '#55ffff', '#ffff7f', '#ffaaff'],
    },

    initialize: function (url, options) {
        L.Layer.GeoJSONAjax.prototype.initialize.call(this, url, {
            ...options,
            style: this.getStyle.bind(this),
            onEachFeature: this.onEachFeature.bind(this),
            pointToLayer: this.createLabel.bind(this),
        });
        this.renderer = new TransparentSVG({opacity: 0.4});
    },

    getStyle: function (feature) {
        return {
            color: 'black',
            weight: 1.5,
            fillColor: WestraRegions.colors[feature.properties.color],
            fillOpacity: 1,
            renderer: this.renderer,
        };
    },

    createLabel: function (geojson, latlng) {
        const tooltip =  new RotatedTooltip({
            permanent: true,
            direction: 'center',
            className: 'westra-regions-label',
            opacity: 1,
            angle: geojson.properties.angle || 0,
        })
            .setLatLng(latlng)
            .setContent(geojson.properties.title);
        return new LimitZoomLayerWrapper(tooltip, geojson.properties.minZoom, geojson.properties.maxZoom);
    },

    onEachFeature: function (geojson, layer) {
        if (!['Polygon', 'MultiPolygon'].includes(geojson.geometry.type)) {
            return;
        }
        const {minZoom, maxZoom} = geojson.properties;
        L.setOptions(layer, {minZoom, maxZoom});
        const tooltip = geojson.properties.name;
        layer.bindTooltip(tooltip, {
            sticky: false,
            delay: 250,
            direction: 'center',
        });
    },
});

export {WestraRegions};
