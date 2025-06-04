import L from 'leaflet';

const RectangleSelect = L.Rectangle.extend({
        includes: L.Mixin.Events,

        options: {
            opacity: 1,
            weight: 0.5,
            fillOpacity: 0.2,
            color: '#3388ff',
            fillColor: '#3388ff',

        },

        onAdd: function(map) {
            L.Rectangle.prototype.onAdd.call(this, map);
            this.markers = [];
            for (let position of ['top', 'right', 'bottom', 'left']) {
                let marker = L.marker([0, 0], {
                        icon: L.divIcon({className: `leaflet-rectangle-select-edge edge-${position}`}),
                        draggable: true
                    }
                )
                    .addTo(map);
                marker.on({
                        drag: this.onMarkerDrag,
                        dragend: this.onMarkerDragEnd
                    }, this
                );
                this.markers[position] = marker;
            }
            this.placeMarkers();
            map.on('zoomend', this.placeMarkers, this);
        },

        placeMarkers: function() {
            const bounds = this.getBounds();
            const topLeftPixel = this._map.project(bounds.getNorthWest());
            const bottomRightPixel = this._map.project(bounds.getSouthEast());
            const size = bottomRightPixel.subtract(topLeftPixel);
            let center = topLeftPixel.add(size.divideBy(2));
            center = this._map.unproject(center);
            this.markers['top'].setLatLng([bounds.getNorth(), center.lng]);
            this.markers['top']._icon.style.width = `${size.x}px`;
            this.markers['top']._icon.style.marginLeft = `-${size.x / 2}px`;
            this.markers['right'].setLatLng([center.lat, bounds.getEast()]);
            this.markers['right']._icon.style.height = `${size.y}px`;
            this.markers['right']._icon.style.marginTop = `-${size.y / 2}px`;
            this.markers['bottom'].setLatLng([bounds.getSouth(), center.lng]);
            this.markers['bottom']._icon.style.width = `${size.x}px`;
            this.markers['bottom']._icon.style.marginLeft = `-${size.x / 2}px`;
            this.markers['left'].setLatLng([center.lat, bounds.getWest()]);
            this.markers['left']._icon.style.height = `${size.y}px`;
            this.markers['left']._icon.style.marginTop = `-${size.y / 2}px`;
        },

        onRemove: function(map) {
            for (let marker of Object.values(this.markers)) {
                this._map.removeLayer(marker);
            }
            this.markers = null;
            map.off('zoomend', this.placeMarkers, this);
            L.Rectangle.prototype.onRemove.call(this, map);
        },

        setBoundsFromMarkers: function() {
            this.setBounds(
                [
                    [this.markers['top'].getLatLng().lat, this.markers['left'].getLatLng().lng],
                    [this.markers['bottom'].getLatLng().lat, this.markers['right'].getLatLng().lng]
                ]
            );
        },
        onMarkerDrag: function() {
            this.setBoundsFromMarkers();
        },

        onMarkerDragEnd: function() {
            this.setBoundsFromMarkers();
            this.placeMarkers();
            this.fire('change');
        }
    }
);

export {RectangleSelect};
