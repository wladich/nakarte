import L from 'leaflet';
import './style.css';

// https://github.com/w8r/leaflet-area-select/blob/master/src/Map.SelectArea.js

L.Util.trueFn = L.Util.trueFn || (() => true);

L.Map.SelectArea = L.Map.BoxZoom.extend({
    statics: {
        AREA_SELECTED: 'areaselected',
        AREA_SELECT_START: 'areaselectstart',
        AREA_SELECTION_TOGGLED: 'areaselecttoggled'
    },

    options: {
        shiftKey: false,
        ctrlKey: true,
        validate: L.Util.trueFn,
        autoDisable: false,
        cursor: 'crosshair'
    },

    initialize(map, options) {
        L.Util.setOptions(this, options || {});
        L.Map.BoxZoom.prototype.initialize.call(this, map);

        this._validate = null;
        this._moved = false;
        this._autoDisable = !this.options.ctrlKey && this.options.autoDisable;
        this._lastLayerPoint = null;
        this._beforeCursor = null;

        this.setValidate(this.options.validate);
        this.setAutoDisable(this.options.autoDisable);
    },

    setValidate(validate) {
        const handler = this;

        if (typeof validate !== 'function') {
            validate = L.Util.trueFn;
        }

        this._validate = layerPoint => validate.call(handler, layerPoint);

        return this;
    },

    setAutoDisable(autoDisable) {
        this._autoDisable = !!autoDisable;
    },

    setControlKey(on) {
        const wasEnabled = this._enabled;

        if (wasEnabled) {
            this.disable();
        }

        this.options.ctrlKey = !!on;

        if (on) {
            this.options.shiftKey = false;
        }

        if (wasEnabled) {
            this.enable();
        }
    },

    setShiftKey(on) {
        const wasEnabled = this._enabled;

        if (wasEnabled) {
            this.disable();
        }

        this.options.shiftKey = !!on;

        if (on) {
            this.options.ctrlKey = false;
        }

        if (wasEnabled) {
            this.enable();
        }
    },

    enable(validate, autoDisable) {
        if (this.options.shiftKey && this._map.boxZoom) {
            this._map.boxZoom.disable();
        } else if (!this.options.ctrlKey) {
            this._map.dragging.disable();
        }

        L.Map.BoxZoom.prototype.enable.call(this);

        if (!this.options.ctrlKey) {
            this._setCursor();
        }

        if (validate) {
            this.setValidate(validate);
        }

        this.setAutoDisable(autoDisable);

        this._map.fire(L.Map.SelectArea.AREA_SELECTION_TOGGLED);
    },

    disable() {
        L.Map.BoxZoom.prototype.disable.call(this);

        if (!this.options.ctrlKey) {
            this._restoreCursor();
        }

        if (this.options.shiftKey && this._map.boxZoom) {
            this._map.boxZoom.enable();
        } else {
            this._map.dragging.enable();
        }

        this._map.fire(L.Map.SelectArea.AREA_SELECTION_TOGGLED);
    },

    addHooks() {
        L.Map.BoxZoom.prototype.addHooks.call(this);

        L.DomEvent
            .on(document, 'keyup', this._onKeyUp, this)
            .on(document, 'keydown', this._onKeyPress, this)
            .on(document, 'contextmenu', this._onMouseDown, this)
            .on(window, 'blur', this._onBlur, this);

        this._map
            .on('dragstart', this._onMouseDown, this);
    },

    removeHooks() {
        L.Map.BoxZoom.prototype.removeHooks.call(this);

        L.DomEvent
            .off(document, 'keyup', this._onKeyUp, this)
            .off(document, 'keydown', this._onKeyPress, this)
            .off(document, 'contextmenu', this._onMouseDown, this)
            .off(window, 'blur', this._onBlur, this);

        this._map.off('dragstart', this._onMouseDown, this);
    },

    _onMouseDown(e) {
        this._moved = false;
        this._lastLayerPoint = null;

        if ((this.options.shiftKey && !e.shiftKey) ||
            (this.options.ctrlKey && !e.ctrlKey) || ((e.which !== 1) && (e.button !== 1))) {
            return false;
        }

        L.DomEvent.stop(e);

        const layerPoint = this._map.mouseEventToLayerPoint(e);

        if (!this._validate(layerPoint)) {
            return false;
        }

        L.DomUtil.disableTextSelection();
        L.DomUtil.disableImageDrag();

        this._startLayerPoint = layerPoint;

        L.DomEvent
            .on(document, 'mousemove', this._onMouseMove, this)
            .on(document, 'mouseup', this._onMouseUp, this)
            .on(document, 'keydown', this._onKeyDown, this);
    },

    _onMouseMove(e) {
        if (!this._moved) {
            this._box = L.DomUtil.create('div', 'leaflet-zoom-box', this._pane);

            L.DomUtil.setPosition(this._box, this._startLayerPoint);

            this._map.fire(L.Map.SelectArea.AREA_SELECT_START);
        }

        const startPoint = this._startLayerPoint;
        const box = this._box;

        const layerPoint = this._map.mouseEventToLayerPoint(e);
        const offset = layerPoint.subtract(startPoint);

        if (!this._validate(layerPoint)) {
            return;
        }

        this._lastLayerPoint = layerPoint;

        const newPos = new L.Point(
            Math.min(layerPoint.x, startPoint.x),
            Math.min(layerPoint.y, startPoint.y)
        );

        L.DomUtil.setPosition(box, newPos);

        this._moved = true;

        // TODO refactor: remove hardcoded 4 pixels
        box.style.width = `${Math.max(0, Math.abs(offset.x) - 4)}px`;
        box.style.height = `${Math.max(0, Math.abs(offset.y) - 4)}px`;
    },

    _onKeyUp(e) {
        if (e.keyCode === 27 && this._moved && this._box) {
            this._finish();
        } else if (this.options.ctrlKey) {
            this._restoreCursor();
            this._map.dragging.enable();
        }
    },

    _onKeyPress(e) {
        if (this.options.ctrlKey && (e.ctrlKey || e.type === 'dragstart') && this._beforeCursor === null) {
            this._setCursor();

            this._map.dragging._draggable._onUp(e);
            this._map.dragging.disable();
        }
    },

    _onBlur(e) {
        this._restoreCursor();
        this._map.dragging.enable();
    },

    _setCursor() {
        this._beforeCursor = this._container.style.cursor;
        this._container.style.cursor = this.options.cursor;
    },

    _restoreCursor() {
        this._container.style.cursor = this._beforeCursor;
        this._beforeCursor = null;
    },

    _onMouseUp(e) {
        this._finish();

        const map = this._map;
        const layerPoint = this._lastLayerPoint;

        if (!layerPoint || this._startLayerPoint.equals(layerPoint)) {
            return;
        }

        L.DomEvent.stop(e);

        const bounds = new L.LatLngBounds(
            map.layerPointToLatLng(this._startLayerPoint),
            map.layerPointToLatLng(layerPoint)
        );

        if (this._autoDisable) {
            this.disable();
        } else {
            this._restoreCursor();
        }

        this._moved = false;

        L.Util.requestAnimFrame(() => {
            map.fire(L.Map.SelectArea.AREA_SELECTED, {
                bounds
            });
        });
    }
});

L.Map.mergeOptions({
    'selectArea': false
});

L.Map.addInitHook('addHandler', 'selectArea', L.Map.SelectArea);