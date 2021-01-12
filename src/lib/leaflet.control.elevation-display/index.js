import L from 'leaflet';

import {ElevationProvider} from '~/lib/elevations';
import {makeButton} from '~/lib/leaflet.control.commons';

import './style.css';

class ElevationDisplay extends L.Control {
    options = {
        position: 'topleft',
        requestsInterval: 100,
        maxDistanceElevationValid: 8,
        minOffsetToRequestElevation: 2,
        maxMouseSpeed: 70, // pixels per second
    };

    constructor(options) {
        super(options);
        this.elevations = new ElevationProvider();
        this.label = L.tooltip(
            {
                direction: 'bottom',
                className: 'elevation-display-label',
                offset: [0, 4],
            },
            null
        );
    }

    onAdd(map) {
        const {container, link} = makeButton(null, 'Show elevation at cursor', '');

        this._map = map;
        this._container = container;

        this.label.setLatLng(L.latLng(0, 0));
        this._active = false;
        this.updateActiveState();

        L.DomEvent.on(link, 'click', this.onButtonClick, this);
        return container;
    }

    onButtonClick() {
        this._active = !this._active;
        this.updateActiveState();
    }

    updateActiveState() {
        const classFunc = this._active ? 'addClass' : 'removeClass';
        const eventFunc = this._active ? 'on' : 'off';

        L.DomUtil[classFunc](this._container, 'highlight');
        L.DomUtil[classFunc](this._map._container, 'elevation-display-control-active');
        this._map[eventFunc]('mousemove', this.onMouseMove, this);
        this._map[eventFunc]('zoomstart', this.onZoom, this);

        clearInterval(this._periodicHandle);
        this.reset();
        if (this._active) {
            this._periodicHandle = setInterval(this.maybeRequestElevation.bind(this), this.options.requestsInterval);
        }
        this.updateLabelVisible();
    }

    reset() {
        this._mousePos = null;
        this._lastPeriodicMousePos = null;
        this._requestPromise = null;
        this._requestPos = null;
        this._elevation = null;
        this._elevationPos = null;
    }

    maybeRequestElevation() {
        if (!this._mousePos) {
            return;
        }
        if (this._lastPeriodicMousePos) {
            const mouseSpeed =
                (this._lastPeriodicMousePos.distanceTo(this._mousePos.layerPoint) / this.options.requestsInterval) *
                1000;
            if (
                mouseSpeed <= this.options.maxMouseSpeed &&
                (!this._requestPos || // mouse has moved at least a little from previous request
                    this._mousePos.layerPoint.distanceTo(this._requestPos) >= this.options.minOffsetToRequestElevation)
            ) {
                this._requestPos = this._mousePos.layerPoint;
                this.elevations
                    .get([this._mousePos.latlng])
                    .then((elevations) => elevations[0])
                    .then(this.onResponse.bind(this, this._requestPos));
            }
        }
        this._lastPeriodicMousePos = this._mousePos.layerPoint;
    }

    onResponse(pos, elevation) {
        if (
            !this._elevationPos ||
            (this._mousePos &&
                pos.distanceTo(this._mousePos.layerPoint) < this._elevationPos.distanceTo(this._mousePos.layerPoint))
        ) {
            this._elevationPos = pos;
            this._elevation = elevation;
            if (elevation !== null) {
                this.label.setContent(String(Math.round(elevation)));
            }
            this.updateLabelVisible();
        }
    }

    onZoom() {
        this.reset();
        this.updateLabelVisible();
    }

    onMouseMove(e) {
        this._mousePos = {
            layerPoint: e.layerPoint,
            latlng: e.latlng,
        };
        this.label.setLatLng(e.latlng);
        this.updateLabelVisible();
    }

    updateLabelVisible() {
        if (!this.label || !this._map) {
            return;
        }
        if (
            this._active &&
            this._mousePos &&
            this._elevationPos &&
            this._elevation !== null &&
            this._mousePos.layerPoint.distanceTo(this._elevationPos) <= this.options.maxDistanceElevationValid
        ) {
            this._map.addLayer(this.label);
        } else {
            this._map.removeLayer(this.label);
        }
    }
}

export {ElevationDisplay};
