import L from 'leaflet';
import './style.css';

function enableAdaptiveHeight(control) {
    if (control._adaptiveHeightEnabled) {
        return;
    }
    const originalOnAdd = control.onAdd;

    L.Util.extend(control, {
            _adaptiveHeightEnabled: true,

            onAdd: function(map) {
                const result = originalOnAdd.call(this, map);
                this.__setupResizeEventsHandler();
                setTimeout(() => this.__setAdaptiveHeight(), 0);
                return result;
            },

            __setupResizeEventsHandler: function() {
                this._map.on('resize', this.__setAdaptiveHeight, this);
            },

            __setAdaptiveHeight: function() {
                const mapHeight = this._map.getSize().y;
                let maxHeight;
                    maxHeight = (mapHeight -
                        this._container.offsetTop - // controls above
                        (this._container.parentNode.offsetHeight - this._container.offsetTop -
                            this._container.offsetHeight) - // controls below
                        70); // margin
                this._form.style.maxHeight = maxHeight + 'px';
            }
        }
    );

    if (control._map) {
        control.__setupResizeEventsHandler();
        setTimeout(() => control.__setAdaptiveHeight(), 0);
    }
}

export default enableAdaptiveHeight;
