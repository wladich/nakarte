import L from 'leaflet';
import './track-list';
import './ruler.css';
import 'lib/controls-styles/controls-styles.css';
import './track-list';

L.Control.TrackList.Ruler = L.Control.extend({
    options: {
        position: 'topleft'
    },

    initialize: function(trackList, options) {
        L.Control.prototype.initialize.call(this, options);
        this._trackList = trackList;
    },

    onAdd: function(map) {
        this._map = map;
        const container = L.DomUtil.create('div', 'leaflet-control leaflet-control-button leaflet-control-ruler');
        L.DomEvent.disableClickPropagation(container);
        if (!L.Browser.touch) {
            L.DomEvent.disableScrollPropagation(container);
        }
        L.DomEvent.on(container, 'click', this.onClick, this);
        return container;
    },

    onClick: function() {
        this._trackList.addNewTrack('Ruler').measureTicksShown(true);
    }

});