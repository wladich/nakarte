import L from 'leaflet';
import './track-list';
import './ruler.css';
import {makeButton} from '~/lib/leaflet.control.commons';

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
        let {container} = makeButton('', 'Measure distance', 'icon-ruler');
        this._container = container;
        L.DomEvent.on(container, 'click', this.onClick, this);
        return container;
    },

    onClick: function() {
        this._trackList.setExpanded();
        this._trackList.addTrackAndEdit('Ruler').measureTicksShown(true);
    }

});
