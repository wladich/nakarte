import L from "leaflet";

const DragEvents = L.Evented.extend({
        options: {
            dragTolerance: 2,
            dragButtons: [0],
            stopOnLeave: false,
        },

        initialize: function(element, options) {
            L.setOptions(this, options);
            this.element = element;

            this.dragButton = null;
            this.startEvent = null;
            this.prevEvent = null;
            this.isDragging = false;

            L.DomEvent.on(element, 'mousedown', this.onMouseDown, this);
        },

        onMouseDown: function(e) {
            if (this.dragButton === null && this.options.dragButtons.includes(e.button)) {
                this.dragButton = e.button;
                this.startEvent = e;
                this.prevEvent = e;
                L.DomUtil.disableImageDrag();
                L.DomUtil.disableTextSelection();
                this._moveHandler = this.onMouseMove.bind(this);
                document.addEventListener('mousemove', this._moveHandler, true);
                L.DomEvent.on(document, 'mouseup', this.onMouseUp, this);
                if (this.options.stopOnLeave) {
                    L.DomEvent.on(this.element, 'mouseleave', this.onMouseLeave, this);
                }
            }
        },

        onMouseUp: function(e) {
            if (this.dragButton === e.button) {
                if (this.isDragging) {
                    this.fireDragEvent('dragend', e);
                } else {
                    this.fire('click', {originalEvent: e, target: this.element});
                }
                this.finishDrag();
            }
        },

        onMouseMove: function(e) {
            var that = this;
            function exceedsTolerance() {
                var tolerance = that.options.dragTolerance;
                return Math.abs(e.clientX - that.startEvent.clientX) > tolerance ||
                    Math.abs(e.clientY - that.startEvent.clientY) > tolerance;
            }

            if (this.isDragging) {
                this.fireDragEvent('drag', e);
                this.prevEvent = e;
            } else if (this.dragButton !== null && exceedsTolerance()) {
                this.isDragging = true;
                this.fireDragEvent('dragstart', this.startEvent);
                this.fireDragEvent('drag', e);
                this.prevEvent = e;
            }
        },

        onMouseLeave: function(e) {
            if (this.isDragging) {
                this.fireDragEvent('dragend', e);
                this.finishDrag();
            }
        },

        fireDragEvent: function(type, originalEvent) {
            const prevPos = L.point(this.prevEvent.clientX, this.prevEvent.clientY);
            const pos = L.point(originalEvent.clientX, originalEvent.clientY);
            const data = {
                dragButton: this.dragButton,
                originalEvent,
                dragMovement: pos.subtract(prevPos) // e.movementX is not available in Safari
            };
            this.fire(type, data);
        },

        finishDrag: function() {
            this.isDragging = false;
            this.dragButton = null;
            L.DomUtil.enableImageDrag();
            L.DomUtil.enableTextSelection();
            document.removeEventListener('mousemove', this._moveHandler, true);
            L.DomEvent.off(document, 'mouseup', this.onMouseUp, this);
            L.DomEvent.off(this.element, 'mouseleave', this.onMouseLeave, this);
        }
    }
);

export {DragEvents};
