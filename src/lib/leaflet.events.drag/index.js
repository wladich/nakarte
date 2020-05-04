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

const DragEvents = L.Evented.extend({
        options: {
            dragTolerance: 2,
            dragButtons: [0]
        },

        initialize: function(eventsSource, options) {
            L.setOptions(this, options);
            this.dragButton = null;
            this.startEvent = null;
            this.prevEvent = null;
            this.isDragging = false;

            L.DomEvent.on(eventsSource, 'mousemove', this.onMouseMove, this);
            L.DomEvent.on(eventsSource, 'mouseup', this.onMouseUp, this);
            L.DomEvent.on(eventsSource, 'mousedown', this.onMouseDown, this);
            L.DomEvent.on(eventsSource, 'mouseleave', this.onMouseLeave, this);
        },

        onMouseDown: function(e) {
            if (this.dragButton === null && this.options.dragButtons.includes(e.button)) {
                this.dragButton = e.button;
                e._offset = offestFromEvent(e);
                this.startEvent = this.prevEvent = e;
                L.DomUtil.disableImageDrag();
                L.DomUtil.disableTextSelection();
            }
        },

        onMouseUp: function(e) {
            L.DomUtil.enableImageDrag();
            L.DomUtil.enableTextSelection();

            if (this.dragButton === e.button) {
                if (this.isDragging) {
                    this.isDragging = false;
                    this.fire('dragend', L.extend({dragButton: e.button, origEvent: e},
                        offestFromEvent(e), movementFromEvents(this.prevEvent, e)
                        )
                    );
                } else {
                    this.fire('click', L.extend({dragButton: e.button, origEvent: e},
                        offestFromEvent(e)
                        )
                    );
                }
                this.dragButton = null;
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
                this.fire('drag', L.extend({dragButton: this.dragButton, origEvent: e},
                    offestFromEvent(e), movementFromEvents(this.prevEvent, e)
                    )
                );
            } else if (this.dragButton !== null && exceedsTolerance()) {
                this.isDragging = true;
                this.fire('dragstart', L.extend(
                    {dragButton: this.dragButton, origEvent: this.startEvent},
                    this.startEvent._offset
                    )
                );
                this.fire('drag', L.extend({
                        dragButton: this.dragButton,
                        origEvent: e,
                        startEvent: that.startEvent
                    }, offestFromEvent(e), movementFromEvents(this.prevEvent, e)
                    )
                );
            }
            this.prevEvent = e;
        },

        onMouseLeave: function(e) {
            if (this.isDragging) {
                this.isDragging = false;
                this.fire('dragend', L.extend({dragButton: this.dragButton, origEvent: e},
                    offestFromEvent(e), movementFromEvents(this.prevEvent, e)
                    )
                );
                this.dragButton = null;
            }
        }
    }
);

export {DragEvents};
