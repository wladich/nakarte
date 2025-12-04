import L from 'leaflet';
import './style.css';
import '~/lib/controls-styles/controls-styles.css';
import enableTopRow from '~/lib/leaflet.control.layers.top-row';

function enableMinimize(control) {
    if (control._minimizeEnabled) {
        return;
    }

    enableTopRow(control);

    const originalOnAdd = control.onAdd;

    L.Util.extend(control, {
            _minimizeEnabled: true,

            onAdd: function(map) {
                const container = originalOnAdd.call(this, map);
                this.__injectMinimizeButtons();
                return container;
            },

            __injectMinimizeButtons: function() {
                const container = this._container;
                const contentsWrapper = L.DomUtil.create('div', 'leaflet-control-content');
                while (container.childNodes.length) {
                    contentsWrapper.appendChild(container.childNodes[0]);
                }
                container.appendChild(contentsWrapper);
                const minimizeButton = L.DomUtil.create('div', 'button-minimize');
                this._topRow.appendChild(minimizeButton);
                const expandButton = L.DomUtil.create('div', 'leaflet-control-button-toggle', container);
                expandButton.title = 'Select layers';
                L.DomEvent.on(expandButton, 'click', this.setExpanded, this);
                L.DomEvent.on(minimizeButton, 'click', this.setMinimized, this);
            },

            setExpanded: function() {
                L.DomUtil.removeClass(this._container, 'minimized');
            },

            setMinimized: function() {
                L.DomUtil.addClass(this._container, 'minimized');
            }
        }
    );
}

export default enableMinimize;
