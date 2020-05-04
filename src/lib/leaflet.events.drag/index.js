import L from "leaflet";

function offestFromEvent(e) {
    if (e.offsetX === undefined) {
        var rect = e.target.getBoundingClientRect();
        return {
            offsetX: e.clientX - rect.left,
            offestY: e.clientY - rect.top
        };
    }
    return {
        offsetX: e.offsetX,
        offestY: e.offsetY
    };
}

function movementFromEvents(e1, e2) {
    return {
        movementX: e2.clientX - e1.clientX,
        movementY: e2.clientY - e1.clientY
    };
}

const DragEvents = L.Class.extend({
        options: {
            dragTolerance: 2,
            dragButtons: [0]
        },

        includes: L.Mixin.Events,

        initialize: function(eventsSource, options) {
            L.setOptions(this, options);
            this.dragStartPos = [];
            this.prevEvent = [];
            this.isDragging = [];

            L.DomEvent.on(eventsSource, 'mousemove', this.onMouseMove, this);
            L.DomEvent.on(eventsSource, 'mouseup', this.onMouseUp, this);
            L.DomEvent.on(eventsSource, 'mousedown', this.onMouseDown, this);
            L.DomEvent.on(eventsSource, 'mouseleave', this.onMouseLeave, this);
        },

        onMouseDown: function(e) {
            if (this.options.dragButtons.includes(e.button)) {
                e._offset = offestFromEvent(e);
                this.dragStartPos[e.button] = e;
                this.prevEvent[e.button] = e;
                L.DomUtil.disableImageDrag();
                L.DomUtil.disableTextSelection();
            }
        },

        onMouseUp: function(e) {
            L.DomUtil.enableImageDrag();
            L.DomUtil.enableTextSelection();

            if (this.options.dragButtons.includes(e.button)) {
                this.dragStartPos[e.button] = null;
                if (this.isDragging[e.button]) {
                    this.isDragging[e.button] = false;
                    this.fire('dragend', L.extend({dragButton: e.button, origEvent: e},
                        offestFromEvent(e), movementFromEvents(this.prevEvent[e.button], e)
                        )
                    );
                } else {
                    this.fire('click', L.extend({dragButton: e.button, origEvent: e},
                        offestFromEvent(e)
                        )
                    );
                }
            }
        },

        onMouseMove: function(e) {
            var i, button,
                that = this;

            function exceedsTolerance(button) {
                var tolerance = that.options.dragTolerance;
                return Math.abs(e.clientX - that.dragStartPos[button].clientX) > tolerance ||
                    Math.abs(e.clientY - that.dragStartPos[button].clientY) > tolerance;
            }

            var dragButtons = this.options.dragButtons;
            for (i = 0; i < dragButtons.length; i++) {
                button = dragButtons[i];
                if (this.isDragging[button]) {
                    this.fire('drag', L.extend({dragButton: button, origEvent: e},
                        offestFromEvent(e), movementFromEvents(this.prevEvent[button], e)
                        )
                    );
                } else if (this.dragStartPos[button] && exceedsTolerance(button)) {
                    this.isDragging[button] = true;
                    this.fire('dragstart', L.extend(
                        {dragButton: button, origEvent: this.dragStartPos[button]},
                        this.dragStartPos[button]._offset
                        )
                    );
                    this.fire('drag', L.extend({
                            dragButton: button,
                            origEvent: e,
                            startEvent: that.dragStartPos[button]
                        }, offestFromEvent(e), movementFromEvents(this.prevEvent[button], e)
                        )
                    );
                }
                this.prevEvent[button] = e;
            }
        },

        onMouseLeave: function(e) {
            var i, button;
            var dragButtons = this.options.dragButtons;
            for (i = 0; i < dragButtons.length; i++) {
                button = dragButtons[i];
                if (this.isDragging[button]) {
                    this.isDragging[button] = false;
                    this.fire('dragend', L.extend({dragButton: button, origEvent: e},
                        offestFromEvent(e), movementFromEvents(this.prevEvent[button], e)
                        )
                    );
                }
            }
            this.dragStartPos = {};
        }
    }
);

export {DragEvents};
