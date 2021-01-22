import L from 'leaflet';

import urlViaCorsProxy from '~/lib/CORSProxy';

const origCreateTile = L.TileLayer.prototype.createTile;
const origIsValidTile = L.TileLayer.prototype._isValidTile;
const origOnAdd = L.TileLayer.prototype.onAdd;

function coordsListBounds(coordsList) {
    const bounds = L.latLngBounds();
    coordsList.forEach(([lon, lat]) => bounds.extend([lat, lon]));
    return bounds;
}

function latLngBoundsToBounds(latlLngBounds) {
    return L.bounds(
        L.point(latlLngBounds.getWest(), latlLngBounds.getSouth()),
        L.point(latlLngBounds.getEast(), latlLngBounds.getNorth())
    );
}

function isCoordsListIntersectingBounds(coordsList, latLngBounds) {
    const latLngBoundsAsBound = latLngBoundsToBounds(latLngBounds);
    for (let i = 1; i < coordsList.length; i++) {
        if (L.LineUtil.clipSegment(L.point(coordsList[i - 1]), L.point(coordsList[i]), latLngBoundsAsBound, i > 1)) {
            return true;
        }
    }
    return Boolean(
        L.LineUtil.clipSegment(L.point(coordsList[coordsList.length - 1]), L.point(coordsList[0]), latLngBoundsAsBound)
    );
}

function isPointInsidePolygon(polygon, latLng) {
    let inside = false;
    let prevNode = polygon[polygon.length - 1];
    for (let i = 0; i < polygon.length; i++) {
        const node = polygon[i];
        if (
            node[0] !== prevNode[1] &&
            ((node[0] <= latLng.lng && latLng.lng < prevNode[0]) ||
                (prevNode[0] <= latLng.lng && latLng.lng < node[0])) &&
            latLng.lat < ((prevNode[1] - node[1]) * (latLng.lng - node[0])) / (prevNode[0] - node[0]) + node[1]
        ) {
            inside = !inside;
        }
        prevNode = node;
    }
    return inside;
}

L.TileLayer.include({
    _drawTileClippedByCutline: function (coords, srcImg, destCanvas, done) {
        if (!this._map) {
            return;
        }
        const width = srcImg.naturalWidth;
        const height = srcImg.naturalHeight;
        destCanvas.width = width;
        destCanvas.height = height;

        const zoomScale = 2 ** coords.z;
        const tileScale = width / this.getTileSize().x;
        const tileNwPoint = coords.scaleBy(this.getTileSize());
        const tileLatLngBounds = this._tileCoordsToBounds(coords);
        const ctx = destCanvas.getContext('2d');
        ctx.beginPath();
        const projectedCutline = this.getProjectedCutline();
        for (let i = 0; i < projectedCutline.length; i++) {
            const cutlineLatLngBounds = this._cutline.bounds[i];
            if (tileLatLngBounds.intersects(cutlineLatLngBounds)) {
                const path = projectedCutline[i].map((point) =>
                    point.multiplyBy(zoomScale).subtract(tileNwPoint).multiplyBy(tileScale)
                );
                ctx.moveTo(path[0].x, path[0].y);
                for (let j = 1; j < path.length; j++) {
                    ctx.lineTo(path[j].x, path[j].y);
                }
                ctx.closePath();
            }
        }
        ctx.clip();
        ctx.drawImage(srcImg, 0, 0);
        destCanvas.complete = true; // HACK: emulate HTMLImageElement property to make L.TileLayer._abortLoading() happy
        this._tileOnLoad(done, destCanvas);
    },

    onAdd: function (map) {
        const result = origOnAdd.call(this, map);
        if (this.options.cutline && !this._cutlinePromise) {
            this._cutlinePromise = this._setCutline(this.options.cutline, this.options.cutlineApprox).then(() => {
                this._updateProjectedCutline();
                this.redraw();
            });
        }
        this._updateProjectedCutline();
        return result;
    },

    createTile: function (coords, done) {
        if (this._cutline && !this._cutline.approx && this.isCutlineIntersectingTile(coords, true)) {
            const img = document.createElement('img');
            img.crossOrigin = '';

            const tile = document.createElement('canvas');
            tile.setAttribute('role', 'presentation');

            L.DomEvent.on(img, 'load', L.bind(this._drawTileClippedByCutline, this, coords, img, tile, done));
            L.DomEvent.on(img, 'error', L.bind(this._tileOnError, this, done, tile));

            let url = this.getTileUrl(coords);
            if (this.options.noCors) {
                url = urlViaCorsProxy(url);
            }
            img.src = url;
            return tile;
        }
        return origCreateTile.call(this, coords, done);
    },

    isCutlineIntersectingTile: function (coords, onlyBorder) {
        const tileLatLngBounds = this._tileCoordsToBounds(coords);
        for (let i = 0; i < this._cutline.latlng.length; i++) {
            const cutline = this._cutline.latlng[i];
            const cutlineLatLngBounds = this._cutline.bounds[i];
            if (
                cutlineLatLngBounds.overlaps(tileLatLngBounds) &&
                (isCoordsListIntersectingBounds(cutline, tileLatLngBounds) ||
                    (!onlyBorder && isPointInsidePolygon(cutline, tileLatLngBounds.getNorthEast())))
            ) {
                return true;
            }
        }
        return false;
    },

    _isValidTile: function (coords) {
        const isOrigValid = origIsValidTile.call(this, coords);
        if (this._cutline && isOrigValid) {
            return this.isCutlineIntersectingTile(coords, false);
        }
        return isOrigValid;
    },

    getProjectedCutline: function () {
        const map = this._map;
        function projectCoordsList(coordsList) {
            return coordsList.map(([lng, lat]) => map.project([lat, lng], 0));
        }

        if (!this._cutline._projected || this._cutline._projectedWithMap !== map) {
            this._cutline._projected = this._cutline.latlng.map(projectCoordsList);
            this._cutline._projectedWithMap = map;
        }

        return this._cutline._projected;
    },

    _setCutline: async function (cutline, approx) {
        let cutlinePromise = cutline;
        if (typeof cutlinePromise === 'function') {
            cutlinePromise = cutlinePromise();
        }
        if (!cutlinePromise.then) {
            cutlinePromise = Promise.resolve(cutlinePromise);
        }
        let cutlineCoords;
        try {
            cutlineCoords = await cutlinePromise;
        } catch (_) {
            // will be handled as empty later
        }

        if (cutlineCoords) {
            this._cutline = {
                latlng: cutlineCoords,
                bounds: cutlineCoords.map(coordsListBounds),
                approx: approx,
            };
        } else {
            this._cutline = null;
        }
    },

    _updateProjectedCutline: function () {
        const map = this._map;
        if (!this._cutline || !map || (this._cutline._projected && this._cutline._projectedWithMap !== map)) {
            return;
        }
        function projectCoordsList(coordsList) {
            return coordsList.map(([lng, lat]) => map.project([lat, lng], 0));
        }

        this._cutline._projected = this._cutline.latlng.map(projectCoordsList);
        this._cutline._projectedWithMap = map;
    },
});
