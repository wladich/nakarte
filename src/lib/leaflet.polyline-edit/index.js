import L from 'leaflet';
import './edit_line.css';
import {wrapLatLngToTarget} from '~/lib/leaflet.fixes/fixWorldCopyJump';

function subclassEditableLine(base) {
return base.extend({
    options: {
        className: 'leaflet-editable-line',
        nodeMarkersZOffset: 10000,
    },

    initialize: function(...args) {
        base.prototype.initialize.call(this, ...args);
        this.startFixedNodeIndex = 0;
        this.endFixedNodeIndex = this.getLatLngs().length - 1;
    },

    startEdit: function() {
        if (this._map && !this._editing) {
            this._editing = true;
            this._drawingDirection = 0;
            this.setupMarkers();
            this.on('remove', this.stopEdit.bind(this));
            this._map
                .on('click', this.onMapClick, this)
                .on('dragend', this.onMapEndDrag, this);
            L.DomEvent.on(document, 'keyup', this.onKeyPress, this);
            this._storedStyle = {weight: this.options.weight, opacity: this.options.opacity};
            this.setStyle({weight: 1.5, opacity: 1});
            L.DomUtil.addClass(this._map._container, 'leaflet-line-editing');
            this.fire('editstart', {target: this});
        }
    },

    stopEdit: function(userCancelled) {
        if (this._editing) {
            this.stopDrawingLine();
            this._editing = false;
            this.removeMarkers();
            L.DomEvent.off(document, 'keyup', this.onKeyPress, this);
            this.off('remove', this.stopEdit.bind(this));
            this._map
                .off('click', this.onMapClick, this)
                .off('dragend', this.onMapEndDrag, this);
            this.setStyle(this._storedStyle);
            L.DomUtil.removeClass(this._map._container, 'leaflet-line-editing');
            this.fire('editend', {target: this, userCancelled});
        }
    },

    removeMarkers: function() {
        this.getLatLngs().forEach(function(node) {
                if (node._nodeMarker) {
                    this._map.removeLayer(node._nodeMarker);
                    delete node._nodeMarker._lineNode;
                    delete node._nodeMarker;
                }
                if (node._segmentOverlay) {
                    this._map.removeLayer(node._segmentOverlay);
                    delete node._segmentOverlay._lineNode;
                    delete node._segmentOverlay;
                }
            }.bind(this)
        );
    },

    onNodeMarkerDragEnd: function(e) {
        var marker = e.target,
            nodeIndex = this.getLatLngs().indexOf(marker._lineNode);
        this.replaceNode(nodeIndex, marker.getLatLng());
        this._setupEndMarkers();
    },

    onNodeMarkerMovedChangeNode: function(e) {
        var marker = e.target,
            latlng = marker.getLatLng(),
            node = marker._lineNode;
        node.lat = latlng.lat;
        node.lng = latlng.lng;
        this.redraw();
        this.fire('nodeschanged');
    },

    onNodeMarkerDblClickedRemoveNode: function(e) {
        if (this.fixedNodesLength() < 2) {
            return;
        }
        var marker = e.target,
            nodeIndex = this.getLatLngs().indexOf(marker._lineNode);
        this.removeNode(nodeIndex);
        this._setupEndMarkers();
        this.fire('nodeschanged');
    },

    onMapClick: function(e) {
        if (this._drawingDirection) {
            let newNodeIndex,
                refNodeIndex;
            if (this._drawingDirection === -1) {
                newNodeIndex = this.startFixedNodeIndex;
                refNodeIndex = 0;
            } else {
                newNodeIndex = this.endFixedNodeIndex + 1;
                refNodeIndex = this._latlngs.length - 1;
            }
            this.addNode(newNodeIndex, wrapLatLngToTarget(e.latlng, this._latlngs[refNodeIndex]), true);
        } else {
            if (!this.preventStopEdit) {
                this.stopEdit(true);
            }
        }
    },

    onMapEndDrag: function(e) {
        if (e.distance < 15) {
            // get mouse position from map drag handler
            var handler = e.target.dragging._draggable;
            var mousePos = handler._startPoint.add(handler._newPos).subtract(handler._startPos);
            var latlng = e.target.mouseEventToLatLng({clientX: mousePos.x, clientY: mousePos.y});
            this.onMapClick({latlng: latlng});
        }
    },

    startDrawingLine: function(direction = 1) {
        if (!this._editing) {
            return;
        }
        if (this._drawingDirection === direction) {
            return;
        }
        this.stopDrawingLine();
        this._drawingDirection = direction;
        this._setupEndMarkers();

        this._map.on('mousemove', this.onMouseMoveFollowEndNode, this);
        L.DomUtil.addClass(this._map._container, 'leaflet-line-drawing');
        this._map.clickLocked = true;
    },

    stopDrawingLine: function() {
        if (!this._drawingDirection) {
            return;
        }
        this._map.off('mousemove', this.onMouseMoveFollowEndNode, this);
        if (this._drawingDirection === -1) {
            const headLength = this.startFixedNodeIndex;
            this.spliceLatLngs(0, headLength);
            this.startFixedNodeIndex = 0;
            this.endFixedNodeIndex -= headLength;
        } else {
            const tailLength = this.getLatLngs().length - this.endFixedNodeIndex - 1;
            this.spliceLatLngs(this.endFixedNodeIndex + 1, tailLength);
        }

        this.fire('nodeschanged');
        this._drawingDirection = 0;
        L.DomUtil.removeClass(this._map._container, 'leaflet-line-drawing');
        this._map.clickLocked = false;
        this._setupEndMarkers();
        this.fire('drawend');
    },

    onKeyPress: function(e) {
        if (e.target.tagName.toLowerCase() === 'input') {
            return;
        }
        var code = e.keyCode;
        switch (code) {
            case 27:
            case 13:
                if (this._drawingDirection) {
                    this.stopDrawingLine();
                } else {
                    if (!this.preventStopEdit) {
                        this.stopEdit(true);
                    }
                }
                L.DomEvent.stop(e);
                break;
            case 8:
            case 46:
                if (this._drawingDirection && this.fixedNodesLength() > 1) {
                    const nodeIndex = this._drawingDirection === -1 ? this.startFixedNodeIndex : this.endFixedNodeIndex;
                    this.removeNode(nodeIndex);
                    this.fire('nodeschanged');
                    L.DomEvent.preventDefault(e);
                }
                break;

            default:
        }
    },

    onMouseMoveFollowEndNode: function(e) {
        let cursorStart, cursorLength, refPointIndex, fixedNodeInc;
        const latlngs = this.getLatLngs();
        if (this._drawingDirection === -1) {
            cursorStart = 0;
            cursorLength = this.startFixedNodeIndex;
            refPointIndex = this.startFixedNodeIndex;
            fixedNodeInc = 1 - cursorLength;
        } else {
            cursorStart = this.endFixedNodeIndex + 1;
            cursorLength = latlngs.length - this.endFixedNodeIndex - 1;
            refPointIndex = this.endFixedNodeIndex;
            fixedNodeInc = 0;
        }
        const refPoint = latlngs[refPointIndex];
        let newLatlng = e.latlng;
        if (refPoint) {
            newLatlng = wrapLatLngToTarget(newLatlng, refPoint);
        }
        this.spliceLatLngs(cursorStart, cursorLength, newLatlng);
        this.startFixedNodeIndex += fixedNodeInc;
        this.endFixedNodeIndex += fixedNodeInc;
        this.fire('nodeschanged');
    },

    makeNodeMarker: function(nodeIndex) {
        var node = this.getLatLngs()[nodeIndex],
            marker = L.marker(node.clone(), {
                    icon: L.divIcon({
                        className: 'line-editor-node-marker-halo',
                        html: '<div class="line-editor-node-marker"></div>'
                    }),
                    draggable: true,
                    zIndexOffset: this.options.nodeMarkersZOffset,
                    projectedShift: () => this.shiftProjectedFitMapView()
                }
            );
        marker
            .on('drag', this.onNodeMarkerMovedChangeNode, this)
            // .on('dragstart', this.fire.bind(this, 'editingstart'))
            .on('dragend', this.onNodeMarkerDragEnd, this)
            .on('dblclick', this.onNodeMarkerDblClickedRemoveNode, this)
            .on('click', this.onNodeMarkerClickStartStopDrawing, this)
            .on('contextmenu', function(e) {
                    this.stopDrawingLine();
                    this.fire('noderightclick', {
                            nodeIndex: this.getLatLngs().indexOf(marker._lineNode),
                            line: this,
                            mouseEvent: e
                        }
                    );
                }, this
            );
        marker._lineNode = node;
        node._nodeMarker = marker;
        marker.addTo(this._map);
    },

    onNodeMarkerClickStartStopDrawing: function(e) {
        const marker = e.target;
        const nodeIndex = this.getLatLngs().indexOf(marker._lineNode);
        const isStartNodeClicked = nodeIndex === this.startFixedNodeIndex;
        const isEndNodeClicked = nodeIndex === this.endFixedNodeIndex;
        if ((this._drawingDirection === -1 && isStartNodeClicked) ||
            ((this._drawingDirection === 1 && isEndNodeClicked))) {
            this.stopDrawingLine();
        } else if (isEndNodeClicked) {
            this.startDrawingLine(1);
        } else if (isStartNodeClicked) {
            this.startDrawingLine(-1);
        }
    },

    makeSegmentOverlay: function(nodeIndex) {
        const latlngs = this.getLatLngs(),
            p1 = latlngs[nodeIndex],
            p2 = latlngs[nodeIndex + 1];
        if (!p2) {
            return;
        }
        const segmentOverlay = L.polyline([p1, p2], {
            weight: 10,
            opacity: 0.0,
            projectedShift: () => this.shiftProjectedFitMapView()
        });
        segmentOverlay.on('mousedown', this.onSegmentMouseDownAddNode, this);
        segmentOverlay.on('contextmenu', function(e) {
                this.stopDrawingLine();
                this.fire('segmentrightclick', {
                        nodeIndex: this.getLatLngs().indexOf(segmentOverlay._lineNode),
                        mouseEvent: e,
                        line: this
                    }
                );
            }, this
        );
        segmentOverlay._lineNode = p1;
        p1._segmentOverlay = segmentOverlay;
        segmentOverlay.addTo(this._map);
    },

    onSegmentMouseDownAddNode: function(e) {
        if (e.originalEvent.button !== 0) {
            return;
        }
        var segmentOverlay = e.target,
            latlngs = this.getLatLngs(),
            nodeIndex = latlngs.indexOf(segmentOverlay._lineNode) + 1;
        const midPoint = L.latLngBounds(latlngs[nodeIndex], latlngs[nodeIndex - 1]).getCenter();
        this.addNode(nodeIndex, wrapLatLngToTarget(e.latlng, midPoint));
        if (L.Draggable._dragging) {
            L.Draggable._dragging.finishDrag();
        }
        latlngs[nodeIndex]._nodeMarker.dragging._draggable._onDown(e.originalEvent);
        this.fire('nodeschanged');
    },

    addNode: function(index, latlng, isAddingAtEnd = false) {
        const nodes = this.getLatLngs(),
            isAddingLeft = (isAddingAtEnd && this._drawingDirection === -1),
            isAddingRight = (isAddingAtEnd && this._drawingDirection === 1);
        latlng = latlng.clone();
        this.spliceLatLngs(index, 0, latlng);
        this.endFixedNodeIndex += 1;
        this.makeNodeMarker(index);
        if (!isAddingLeft && (index >= 1)) {
            if (!isAddingRight) {
                var prevNode = nodes[index - 1];
                this._map.removeLayer(prevNode._segmentOverlay);
                delete prevNode._segmentOverlay._lineNode;
                delete prevNode._segmentOverlay;
            }
            this.makeSegmentOverlay(index - 1);
        }
        if (!isAddingRight) {
            this.makeSegmentOverlay(index);
        }
        if (nodes.length < 3) {
            this._setupEndMarkers();
        }
    },

    removeNode: function(index) {
        var nodes = this.getLatLngs(),
            node = nodes[index],
            marker = node._nodeMarker;
        delete node._nodeMarker;
        delete marker._lineNode;
        this.spliceLatLngs(index, 1);
        this.endFixedNodeIndex -= 1;
        this._map.removeLayer(marker);
        if (node._segmentOverlay) {
            this._map.removeLayer(node._segmentOverlay);
            delete node._segmentOverlay._lineNode;
            delete node._segmentOverlay;
        }
        var prevNode = nodes[index - 1];
        if (prevNode && prevNode._segmentOverlay) {
            this._map.removeLayer(prevNode._segmentOverlay);
            delete prevNode._segmentOverlay._lineNode;
            delete prevNode._segmentOverlay;
            if (index < this.endFixedNodeIndex) {
                this.makeSegmentOverlay(index - 1);
            }
        }
    },

    replaceNode: function(index, latlng) {
        var nodes = this.getLatLngs(),
            oldNode = nodes[index],
            oldMarker = oldNode._nodeMarker;
        this._map.removeLayer(oldNode._nodeMarker);
        delete oldNode._nodeMarker;
        delete oldMarker._lineNode;
        latlng = latlng.clone();
        this.spliceLatLngs(index, 1, latlng);
        this.makeNodeMarker(index);
        if (oldNode._segmentOverlay) {
            this._map.removeLayer(oldNode._segmentOverlay);
            delete oldNode._segmentOverlay._lineNode;
            delete oldNode._segmentOverlay;
            this.makeSegmentOverlay(index);
        }
        var prevNode = nodes[index - 1];
        if (prevNode && prevNode._segmentOverlay) {
            this._map.removeLayer(prevNode._segmentOverlay);
            delete prevNode._segmentOverlay._lineNode;
            delete prevNode._segmentOverlay;
            this.makeSegmentOverlay(index - 1);
        }
    },

    _setupEndMarkers: function() {
        if (this.fixedNodesLength() === 0) {
            return;
        }
        const startIcon = this._latlngs[this.startFixedNodeIndex]._nodeMarker._icon;
        L.DomUtil[this._drawingDirection === -1 ? 'removeClass' : 'addClass'](
            startIcon, 'line-editor-node-marker-start'
        );
        if (this.endFixedNodeIndex >= 0) {
            const endIcon = this._latlngs[this.endFixedNodeIndex]._nodeMarker._icon;
            let func;
            if (this._drawingDirection !== 1 && this.endFixedNodeIndex > 0) {
                func = L.DomUtil.addClass;
            } else {
                func = L.DomUtil.removeClass;
            }
            func(endIcon, 'line-editor-node-marker-end');
        }
    },

    setupMarkers: function() {
        this.removeMarkers();
        for (let i = this.startFixedNodeIndex; i <= this.endFixedNodeIndex; i++) {
            this.makeNodeMarker(i);
            if (i < this.endFixedNodeIndex) {
                this.makeSegmentOverlay(i);
            }
        }
        this._setupEndMarkers();
    },

    spliceLatLngs: function(...args) {
        const latlngs = this.getLatLngs();
        const res = latlngs.splice(...args);
        this.setLatLngs(latlngs);
        return res;
    },

    fixedNodesLength: function() {
        return this.endFixedNodeIndex - this.startFixedNodeIndex + 1;
    },

    getFixedLatLngs: function() {
        return this._latlngs.slice(this.startFixedNodeIndex, this.endFixedNodeIndex + 1);
    },
});
}

export {subclassEditableLine};
