import L from 'leaflet';
import './style.css';

function enableTopRow(control) {
    if (control._topRowEnabled) {
        return;
    }

    const originalOnAdd = control.onAdd;

    L.Util.extend(control, {
        _topRowEnabled: true,

        onAdd: function(map) {
            const container = originalOnAdd.call(this, map);
            this.__injectTopRow();
            return container;
        },

        __injectTopRow: function() {
            this._topRow = L.DomUtil.create('div', 'leaflet-control-layers-top-row');
            this._form.parentNode.insertBefore(this._topRow, this._form);
        }

    });
}

export default enableTopRow;
