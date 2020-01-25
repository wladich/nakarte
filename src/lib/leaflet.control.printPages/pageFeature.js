import L from 'leaflet';
import './page-feature.css';

const PageFeature = L.Marker.extend({
        initialize: function(centerLatLng, paperSize, scale, label) {
            this.paperSize = paperSize;
            this.scale = scale;
            var icon = L.divIcon({className: "print-page-marker", html: label});
            L.Marker.prototype.initialize.call(this, centerLatLng, {
                    icon: icon,
                    draggable: true,
                    title: 'Left click to rotate, right click for menu'
                }
            );
            this.on('drag', this.updateView.bind(this, undefined));
        },

        onAdd: function(map) {
            L.Marker.prototype.onAdd.call(this, map);
            map.on('viewreset', () => this.updateView());
            this.rectangle = L.rectangle([[0, 0], [0, 0]],
                {color: '#ff7800', weight: 2, opacity: 0.7, fillOpacity: 0.2}
            ).addTo(map);
            this.updateView();
        },

        onRemove: function(map) {
            map.off('viewreset', this.updateView, this);
            L.Marker.prototype.onRemove.call(this, map);
            this.rectangle.removeFrom(map);
        },

        getLatLngBounds: function() {
            return this.latLngBounds;
        },

        _getLatLngBounds: function() {
            const centerLatLng = this.getLatLng();
            const centerMerc = L.Projection.SphericalMercator.project(centerLatLng);
            const mercatorScale =
                (Math.cos((centerLatLng.lat * Math.PI) / 180) * L.CRS.Earth.R) / L.Projection.SphericalMercator.R;
            const mercatorPageSize = L.point(...this.paperSize).multiplyBy(this.scale / 10 / mercatorScale);
            let sw = centerMerc.subtract(mercatorPageSize.divideBy(2));
            let ne = centerMerc.add(mercatorPageSize.divideBy(2));
            sw = L.Projection.SphericalMercator.unproject(sw);
            ne = L.Projection.SphericalMercator.unproject(ne);
            return L.latLngBounds([sw, ne]);
        },

        _animateZoom: function(e) {
            L.Marker.prototype._animateZoom.call(this, e);
            this.updateView(e.zoom);
        },

        updateView: function(newZoom) {
            if (!this._map) {
                return;
            }
            if (newZoom === undefined) {
                newZoom = this._map.getZoom();
            }
            var bounds = this.latLngBounds = this._getLatLngBounds();
            var pixel_sw = this._map.project(bounds.getSouthWest(), newZoom);
            var pixel_ne = this._map.project(bounds.getNorthEast(), newZoom);
            var pixel_center = this._map.project(this.getLatLng(), newZoom);
            var st = this._icon.style;
            var pixel_width = pixel_ne.x - pixel_sw.x;
            var pixel_height = pixel_sw.y - pixel_ne.y;
            st.width = `${pixel_width}px`;
            st.height = `${pixel_height}px`;
            st.marginLeft = `${pixel_sw.x - pixel_center.x}px`;
            st.marginTop = `${pixel_ne.y - pixel_center.y}px`;
            st.fontSize = `${Math.min(pixel_width, pixel_height, 500) / 2}px`;
            st.lineHeight = `${pixel_height}px`;
            this.rectangle.setBounds(bounds);
        },

        setLabel: function(s) {
            this._icon.innerHTML = s;
        },

        getLabel: function() {
            return this._icon.innerHTML;
        },

        setSize: function(paperSize, scale) {
            this.paperSize = paperSize;
            this.scale = scale;
            this.updateView();
        },

        getPrintSize: function() {
            return L.point(...this.paperSize);
        },

        rotate: function() {
            this.paperSize = [this.paperSize[1], this.paperSize[0]];
            this.updateView();
        }

    }
);

export default PageFeature;
