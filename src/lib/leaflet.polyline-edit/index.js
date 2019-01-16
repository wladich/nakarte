import L from 'leaflet';
import './edit_line.css';
import {wrapLatLngToTarget} from 'lib/leaflet.fixes/fixWorldCopyJump';
import {confirm, notify} from 'lib/notifications';

L.Polyline.EditMixinOptions = {
    className: 'leaflet-editable-line'
};

L.Polyline.EditMixin = {
    _nodeMarkersZOffset: 10000,

    removePoints: function (points) {
        points.forEach(point => {
            const marker = point._nodeMarker;
            const nodeIndex = this.getLatLngs().indexOf(marker._lineNode);

            this.removeNode(nodeIndex);
        }, this);

        this._setupEndMarkers();
    },

    onAreaSelected: function (e) {
        const selectedPoints = this.getLatLngs().filter(point => e.bounds.contains(point));
        const selectedPointsLength = selectedPoints.length;

        if (!selectedPointsLength) {
            notify('No points selected');

            return;
        }

        const message = `Remove ${selectedPointsLength} points?`;
        const accept = () => this.removePoints(selectedPoints);
        const decline = () => {};

        confirm(message, accept, decline);
    },

    enableAreaSelected: function () {
        this._map.on('areaselected', this.onAreaSelected, this);
        this._map.selectArea.enable();
    },

    disabledAreaSelected: function () {
        this._map.off('areaselected', this.onAreaSelected, this);
        this._map.selectArea.disable();
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
            this.enableAreaSelected();
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
            this.disabledAreaSelected();
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
        //nodeIndex = this.getLatLngs().indexOf(marker._lineNode);
            node = marker._lineNode;
        node.lat = latlng.lat;
        node.lng = latlng.lng;
        this.redraw();
        this.fire('nodeschanged');
    },

    onNodeMarkerDblClickedRemoveNode: function(e) {
        if (this.getLatLngs().length < 2 || (this._drawingDirection && this.getLatLngs().length === 2)) {
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
                newNodeIndex = 1;
                refNodeIndex = 0;
            } else {
                newNodeIndex = this._latlngs.length - 1;
                refNodeIndex = this._latlngs.length - 1;
            }
            this.addNode(newNodeIndex, wrapLatLngToTarget(e.latlng, this._latlngs[refNodeIndex]));
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

    startDrawingLine: function(direction, e) {
        if (!this._editing) {
            return;
        }
        if (direction === undefined) {
            direction = 1;
        }
        if (this._drawingDirection === direction) {
            return;
        }
        this.stopDrawingLine();
        this._drawingDirection = direction;
        if (e) {
            var newNodeIndex = this._drawingDirection === -1 ? 0 : this.getLatLngs().length;
            this.spliceLatLngs(newNodeIndex, 0, e.latlng);
            this._setupEndMarkers();
            this.fire('nodeschanged');
        }

        this._map.on('mousemove', this.onMouseMoveFollowEndNode, this);
        L.DomUtil.addClass(this._map._container, 'leaflet-line-drawing');
        this._map.clickLocked = true;
    },


    stopDrawingLine: function() {
        if (!this._drawingDirection) {
            return;
        }
        this._map.off('mousemove', this.onMouseMoveFollowEndNode, this);
        var nodeIndex = this._drawingDirection === -1 ? 0 : this.getLatLngs().length - 1;
        this.spliceLatLngs(nodeIndex, 1);
        this.fire('nodeschanged');
        this._drawingDirection = 0;
        L.DomUtil.removeClass(this._map._container, 'leaflet-line-drawing');
        this._map.clickLocked = false;
        this._setupEndMarkers();
        this.fire('drawend');

    },

    onKeyPress: function(e) {
        if ('input' === e.target.tagName.toLowerCase()) {
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
                if (this._drawingDirection && this.getLatLngs().length > 2) {
                    const nodeIndex = this._drawingDirection === 1 ? this.getLatLngs().length - 2 : 1;
                    this.removeNode(nodeIndex);
                    this.fire('nodeschanged');
                    L.DomEvent.preventDefault(e);
                }
                break;

            default:
        }
    },

    onMouseMoveFollowEndNode: function(e) {
        var nodeIndex = this._drawingDirection === -1 ? 0 : this.getLatLngs().length - 1;
        let latlng = e.latlng;
        if (this._latlngs.length > 0) {
            latlng = wrapLatLngToTarget(latlng, this._latlngs[nodeIndex]);
        }
        this.spliceLatLngs(nodeIndex, 1, latlng);
        this.fire('nodeschanged');
    },

    makeNodeMarker: function(nodeIndex) {
        var node = this.getLatLngs()[nodeIndex],
            marker = L.marker(node.clone(), {
                    icon: L.divIcon({className: 'line-editor-node-marker-halo', 'html': '<div class="line-editor-node-marker"></div>'}),
                    draggable: true,
                    zIndexOffset: this._nodeMarkersZOffset,
                    projectedShift: () => this.shiftProjectedFitMapView()
                }
            );
        marker
            .on('drag', this.onNodeMarkerMovedChangeNode, this)
            //.on('dragstart', this.fire.bind(this, 'editingstart'))
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
        var marker = e.target,
            latlngs = this.getLatLngs(),
            latlngs_n = latlngs.length,
            nodeIndex = latlngs.indexOf(marker._lineNode);
        if ((this._drawingDirection === -1 && nodeIndex === 1) ||
            ((this._drawingDirection === 1 && nodeIndex === latlngs_n - 2))) {
            this.stopDrawingLine();
        } else if (nodeIndex === this.getLatLngs().length - 1) {
            this.startDrawingLine(1, e);
        } else if (nodeIndex === 0) {
            this.startDrawingLine(-1, e);
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
            L.Draggable._dragging.finishDrag()
        }
        latlngs[nodeIndex]._nodeMarker.dragging._draggable._onDown(e.originalEvent)
        this.fire('nodeschanged');
    },

    addNode: function(index, latlng) {
        var nodes = this.getLatLngs(),
            isAddingLeft = (index === 1 && this._drawingDirection === -1),
            isAddingRight = (index === nodes.length - 1 && this._drawingDirection === 1);
        latlng = latlng.clone();
        this.spliceLatLngs(index, 0, latlng);
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
            if ((index < nodes.length - 1) || (index < nodes.length && this._drawingDirection !== 1)) {
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
        const nodesCount = this._latlngs.length;
        if (nodesCount === 0) {
            return;
        }
        const startIndex = this._drawingDirection === -1 ? 1 : 0;
        const endIndex = this._drawingDirection === 1 ? nodesCount - 2 : nodesCount - 1;
        const startIcon = this._latlngs[startIndex]._nodeMarker._icon;
        L.DomUtil[this._drawingDirection !== -1 ? 'addClass' : 'removeClass'](startIcon, 'line-editor-node-marker-start');
        if (endIndex >= 0) {
            const endIcon = this._latlngs[endIndex]._nodeMarker._icon;
            let func;
            if (this._drawingDirection !== 1 && endIndex > 0) {
                func = L.DomUtil.addClass;
            } else {
                func = L.DomUtil.removeClass;
            }
            func(endIcon, 'line-editor-node-marker-end');
        }
    },

    setupMarkers: function() {
        this.removeMarkers();
        var latlngs = this.getLatLngs(),
            startNode = 0,
            endNode = latlngs.length - 1;
        if (this._drawingDirection === -1) {
            startNode += 1;
        }
        if (this._drawingDirection === 1) {
            endNode -= 1;
        }
        for (var i = startNode; i <= endNode; i++) {
            this.makeNodeMarker(i);
            if (i < endNode) {
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
        // this._latlngs.splice(...args);
        // this.redraw();
    },

    getFixedLatLngs: function() {
        const start = this._drawingDirection === -1 ? 1 : 0;
        let end = this._latlngs.length;
        if (this._drawingDirection === 1) {
            end -= 1;
        }
        return this._latlngs.slice(start, end);
    }

};