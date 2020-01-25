import L from 'leaflet';
import './style.css';

function enableTopRow(control) {
    const originalOnAdd = control.onAdd;
    if (control._topRowEnabled) {
        return;
    }

    L.Util.extend(control, {
        _topRowEnabled: true,

        onAdd: function(map) {
            const container = originalOnAdd.call(this, map);
            setTimeout(() => this.__injectTopRow(), 0);
            return container;
        },

        __injectTopRow: function() {
            this._topRow = L.DomUtil.create('div', 'leaflet-control-layers-top-row');
            this._form.parentNode.insertBefore(this._topRow, this._form);
        }

    });
    if (control._map) {
        control.__injectTopRow();
    }
}

export default enableTopRow;
