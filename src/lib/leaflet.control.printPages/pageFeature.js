import L from 'leaflet'
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
            map.on('viewreset', this.updateView, this);
            this.rectangle = L.rectangle(this.getLatLngBounds(),
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
            let {lat, lng} = this.getLatLng();
            var width = this.paperSize[0] * this.scale / 10 / 111319.49 / Math.cos(lat * Math.PI / 180);
            var height = this.paperSize[1] * this.scale / 10 / 111319.49;
            var latlng_sw = [lat - height / 2, lng - width / 2];
            var latlng_ne = [lat + height / 2, lng + width / 2];
            return L.latLngBounds([latlng_sw, latlng_ne]);
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
            var bounds = this.getLatLngBounds();
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

        setSize: function(paperSize, scale) {
            this.paperSize = paperSize;
            this.scale = scale;
            this.updateView();
        },

        getPrintSize: function() {
            return L.point(...this.paperSize);
        },

        rotate: function(e) {
            this.paperSize = [this.paperSize[1], this.paperSize[0]];
            this.updateView();
        }

    }
);

export default PageFeature;