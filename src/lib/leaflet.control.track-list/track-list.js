import L from 'leaflet';
import ko from 'knockout';
import Contextmenu from '~/lib/contextmenu';
import '~/lib/knockout.component.progress/progress';
import './track-list.css';
import {selectFiles, readFiles} from '~/lib/file-read';
import parseGeoFile from './lib/parseGeoFile';
import loadFromUrl from './lib/loadFromUrl';
import * as geoExporters from './lib/geo_file_exporters';
import copyToClipboard from '~/lib/clipboardCopy';
import {saveAs} from '~/vendored/github.com/eligrey/FileSaver';
import '~/lib/leaflet.layer.canvasMarkers';
import '~/lib/leaflet.lineutil.simplifyLatLngs';
import iconFromBackgroundImage from '~/lib/iconFromBackgroundImage';
import '~/lib/controls-styles/controls-styles.css';
import {ElevationProfile, calcSamplingInterval} from '~/lib/leaflet.control.elevation-profile';
import '~/lib/leaflet.control.commons';
import {blobFromString} from '~/lib/binary-strings';
import '~/lib/leaflet.polyline-edit';
import '~/lib/leaflet.polyline-measure';
import * as logging from '~/lib/logging';
import {notify, query} from '~/lib/notifications';
import {fetch} from '~/lib/xhr-promise';
import config from '~/config';
import md5 from 'blueimp-md5';
import {wrapLatLngToTarget, wrapLatLngBoundsToTarget} from '~/lib/leaflet.fixes/fixWorldCopyJump';
import {splitLinesAt180Meridian} from "./lib/meridian180";
import {ElevationProvider} from '~/lib/elevations';

const TRACKLIST_TRACK_COLORS = ['#77f', '#f95', '#0ff', '#f77', '#f7f', '#ee5'];

const TrackSegment = L.MeasuredLine.extend({
    includes: L.Polyline.EditMixin,

    options: {
        weight: 6,
        lineCap: 'round',
        opacity: 0.5,

    }
});
TrackSegment.mergeOptions(L.Polyline.EditMixinOptions);

function getLinkToShare(keysToExclude, paramsToAdd) {
    const {origin, pathname, hash} = window.location;

    const params = new URLSearchParams(hash.substring(1));

    for (const key of keysToExclude) {
        params.delete(key);
    }

    for (const [key, value] of Object.entries(paramsToAdd)) {
        params.set(key, value);
    }

    return origin + pathname + '#' + decodeURIComponent(params.toString());
}

function unwrapLatLngsCrossing180Meridian(latngs) {
    if (latngs.length === 0) {
        return [];
    }
    const unwrapped = [latngs[0]];
    let lastUnwrapped;
    let prevUnwrapped = latngs[0];
    for (let i = 1; i < latngs.length; i++) {
        lastUnwrapped = wrapLatLngToTarget(latngs[i], prevUnwrapped);
        unwrapped.push(lastUnwrapped);
        prevUnwrapped = lastUnwrapped;
    }
    return unwrapped;
}

function closestPointToLineSegment(latlngs, segmentIndex, point) {
    const crs = L.CRS.EPSG3857;
    point = crs.latLngToPoint(point);
    const segStart = crs.latLngToPoint(latlngs[segmentIndex]);
    const segEnd = crs.latLngToPoint(latlngs[segmentIndex + 1]);
    return crs.pointToLatLng(L.LineUtil.closestPointOnSegment(point, segStart, segEnd));
}

function isPointCloserToStart(latlngs, latlng) {
    const distToStart = latlng.distanceTo(latlngs[0]);
    const distToEnd = latlng.distanceTo(latlngs[latlngs.length - 1]);
    return distToStart < distToEnd;
}

L.Control.TrackList = L.Control.extend({
        options: {
            position: 'bottomright',
            lineCursorStyle: {interactive: false, weight: 1.5, opacity: 1, dashArray: '7,7'},
            lineCursorValidStyle: {color: 'green'},
            lineCursorInvalidStyle: {color: 'red'},
            splitExtensions: ['gpx', 'kml', 'geojson', 'kmz', 'wpt', 'rte', 'plt', 'fit', 'tmp', 'jpg', 'crdownload'],
            splitExtensionsFirstStage: ['xml', 'txt', 'html', 'php', 'tmp', 'gz'],
            trackHighlightStyle: {
                color: 'yellow',
                weight: 15,
                opacity: 0.5,
            },
            trackMarkerHighlightStyle: {
                color: 'yellow',
                weight: 20,
                opacity: 0.6,
            },
            trackStartHighlightStyle: {
                color: 'green',
                weight: 13,
                opacity: 0.6,
            },
            trackEndHighlightStyle: {
                color: 'red',
                weight: 13,
                opacity: 0.6,
            },
            keysToExcludeOnCopyLink: [],
        },
        includes: L.Mixin.Events,

        colors: TRACKLIST_TRACK_COLORS,

        initialize: function(options) {
            L.Control.prototype.initialize.call(this, options);
            this.tracks = ko.observableArray();
            this.url = ko.observable('');
            this.readingFiles = ko.observable(0);
            this.readProgressRange = ko.observable();
            this.readProgressDone = ko.observable();
            this._lastTrackColor = 0;
            this.trackListHeight = ko.observable(0);
            this.isPlacingPoint = false;
            this.trackAddingPoint = ko.observable(null);
            this.trackAddingSegment = ko.observable(null);
        },

        onAdd: function(map) {
            this.map = map;
            this.tracks.removeAll();
            var container = this._container = L.DomUtil.create('div', 'leaflet-control leaflet-control-tracklist');
            this._stopContainerEvents();

            /* eslint-disable max-len */
            container.innerHTML = `
                <div class="leaflet-control-button-toggle" data-bind="click: setExpanded"
                 title="Load, edit and save tracks"></div>
                <div class="leaflet-control-content">
                <div class="header">
                    <div class="hint"
                     title="gpx kml Ozi geojson zip YandexMaps Strava GPSLib Etomesto GarminConnect SportsTracker OSM Tracedetrail OpenStreetMap.ru Wikiloc">
                        gpx kml Ozi geojson zip YandexMaps Strava
                        <span class="formats-hint-more">&hellip;</span>
                    </div>
                    <div class="button-minimize" data-bind="click: setMinimized"></div>
                </div>
                <div class="inputs-row" data-bind="visible: !readingFiles()">
                    <a class="button add-track" title="New track" data-bind="click: onButtonNewTrackClicked"></a
                    ><a class="button open-file" title="Open file" data-bind="click: loadFilesFromDisk"></a
                    ><input type="text" class="input-url" placeholder="Track URL"
                        data-bind="textInput: url, event: {keypress: onEnterPressedInInput, contextmenu: defaultEventHandle, mousemove: defaultEventHandle}"
                    ><a class="button download-url" title="Download URL" data-bind="click: loadFilesFromUrl"></a
                    ><a class="button menu-icon" data-bind="click: function(_,e){this.showMenu(e)}" title="Menu"></a>
                </div>
                <div style="text-align: center">
                    <div data-bind="
                        component: {
                        name: 'progress-indicator',
                        params: {progressRange: readProgressRange, progressDone: readProgressDone}
                        },
                        visible: readingFiles"></div>
                </div>
                <div class="tracks-rows-wrapper" data-bind="style: {maxHeight: trackListHeight}">
                <table class="tracks-rows"><tbody data-bind="foreach: {data: tracks, as: 'track'}">
                    <tr data-bind="event: {
                                       contextmenu: $parent.showTrackMenu.bind($parent),
                                       mouseenter: $parent.onTrackRowMouseEnter.bind($parent, track),
                                       mouseleave: $parent.onTrackRowMouseLeave.bind($parent, track)
                                   },
                                   css: {hover: hover() && $parent.tracks().length > 1, edit: isEdited() && $parent.tracks().length > 1}">
                        <td><input type="checkbox" class="visibility-switch" data-bind="checked: track.visible"></td>
                        <td><div class="color-sample" data-bind="style: {backgroundColor: $parent.colors[track.color()]}, click: $parent.onColorSelectorClicked.bind($parent)"></div></td>
                        <td><div class="track-name-wrapper"><div class="track-name" data-bind="text: track.name, attr: {title: track.name}, click: $parent.setViewToTrack.bind($parent)"></div></div></td>
                        <td>
                            <div class="button-length" title="Show distance marks" data-bind="
                                text: $parent.formatLength(track.length()),
                                css: {'ticks-enabled': track.measureTicksShown},
                                click: $parent.switchMeasureTicksVisibility.bind($parent)"></div>
                        </td>
                        <td><div class="button-add-track" title="Add track segment" data-bind="click: $parent.onButtonAddSegmentClicked.bind($parent, track), css: {active: $parent.trackAddingSegment() === track}"></div></td>
                        <td><div class="button-add-point" title="Add point" data-bind="click: $parent.onButtonAddPointClicked.bind($parent, track), css: {active: $parent.trackAddingPoint() === track}"></div></td>
                        <td><a class="track-text-button" title="Actions" data-bind="click: $parent.showTrackMenu.bind($parent)">&hellip;</a></td>
                    </tr>
                </tbody></table>
                </div>
                </div>
            `;
            /* eslint-enable max-len */

            ko.applyBindings(this, container);
            // FIXME: add onRemove method and unsubscribe
            L.DomEvent.addListener(map.getContainer(), 'drop', this.onFileDragDrop, this);
            L.DomEvent.addListener(map.getContainer(), 'dragover', this.onFileDraging, this);
            this.menu = new Contextmenu([
                    {text: 'Copy link for all tracks', callback: this.copyAllTracksToClipboard.bind(this)},
                    {text: 'Copy link for visible tracks', callback: this.copyVisibleTracksToClipboard.bind(this)},
                {
                    text: 'Create new track from all visible tracks',
                    callback: this.createNewTrackFromVisibleTracks.bind(this)
                },
                    '-',
                    {text: 'Delete all tracks', callback: this.deleteAllTracks.bind(this)},
                    {text: 'Delete hidden tracks', callback: this.deleteHiddenTracks.bind(this)}
                ]
            );
            this._markerLayer = new L.Layer.CanvasMarkers(null, {
                print: true,
                scaleDependent: true,
                zIndex: 1000,
                printTransparent: true
            }).addTo(map);
            this._markerLayer.on('markerclick markercontextmenu', this.onMarkerClick, this);
            this._markerLayer.on('markerenter', this.onMarkerEnter, this);
            this._markerLayer.on('markerleave', this.onMarkerLeave, this);
            map.on('resize', this._setAdaptiveHeight, this);
            setTimeout(() => this._setAdaptiveHeight(), 0);
            return container;
        },

        defaultEventHandle: function(_, e) {
            L.DomEvent.stopPropagation(e);
            return true;
        },

        _setAdaptiveHeight: function() {
            const mapHeight = this._map.getSize().y;
            let maxHeight;
            maxHeight =
                mapHeight -
                this._container.offsetTop - // controls above
                // controls below
                (this._container.parentNode.offsetHeight - this._container.offsetTop - this._container.offsetHeight) -
                105; // margin
            this.trackListHeight(maxHeight + 'px');
        },

        setExpanded: function() {
            L.DomUtil.removeClass(this._container, 'minimized');
        },

        setMinimized: function() {
            L.DomUtil.addClass(this._container, 'minimized');
        },

        onFileDraging: function(e) {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);
            e.dataTransfer.dropEffect = 'copy';
        },

        onFileDragDrop: function(e) {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);
            const files = e.dataTransfer.files;
            if (files && files.length) {
                this.loadFilesFromFilesObject(files);
            }
        },

        onEnterPressedInInput: function(this_, e) {
            if (e.keyCode === 13) {
                this_.loadFilesFromUrl();
                L.DomEvent.stop(e);
                return false;
            }
            return true;
        },

        getTrackPolylines: function(track) {
            return track.feature.getLayers().filter(function(layer) {
                    return layer instanceof L.Polyline;
                }
            );
        },

        getTrackPoints: function(track) {
            return track.markers;
        },

        onButtonNewTrackClicked: function() {
            let name = this.url().trim();
            if (name.length > 0) {
                this.url('');
            } else {
                name = 'New track';
            }
            this.addTrackAndEdit(name);
        },

        addSegmentAndEdit: function(track) {
            this.stopPlacingPoint();
            const segment = this.addTrackSegment(track);
            this.startEditTrackSegement(segment);
            segment.startDrawingLine();
            this.trackAddingSegment(track);
        },

        addTrackAndEdit: function(name) {
            const track = this.addTrack({name: name});
            this.addSegmentAndEdit(track);
            return track;
        },

        loadFilesFromFilesObject: function(files) {
            this.readingFiles(this.readingFiles() + 1);

            readFiles(files).then(function(fileDataArray) {
                const geodataArray = [];
                for (let fileData of fileDataArray) {
                        geodataArray.push(...parseGeoFile(fileData.filename, fileData.data));
                }
                this.readingFiles(this.readingFiles() - 1);

                this.addTracksFromGeodataArray(geodataArray);
            }.bind(this));
        },

        loadFilesFromDisk: function() {
            logging.captureBreadcrumb('load track from disk');
            selectFiles(true).then(this.loadFilesFromFilesObject.bind(this));
        },

        loadFilesFromUrl: function() {
            var url = this.url().trim();
            if (!url) {
                return;
            }

            this.readingFiles(this.readingFiles() + 1);

            logging.captureBreadcrumb('load track from url', {trackUrl: url});
            loadFromUrl(url)
                .then((geodata) => {
                    this.addTracksFromGeodataArray(geodata);
                    this.readingFiles(this.readingFiles() - 1);
                });
            this.url('');
        },

        whenLoadDone: function(cb) {
            if (this.readingFiles() === 0) {
                cb();
                return;
            }
            const subscription = this.readingFiles.subscribe((value) => {
                if (value === 0) {
                    subscription.dispose();
                    cb();
                }
            });
        },

        addTracksFromGeodataArray: function(geodata_array) {
            let hasData = false;
            var messages = [];
            if (geodata_array.length === 0) {
                messages.push('No tracks loaded');
            }
            geodata_array.forEach(function(geodata) {
                    var data_empty = !((geodata.tracks && geodata.tracks.length) ||
                        (geodata.points && geodata.points.length));

                    if (!data_empty) {
                        if (geodata.tracks) {
                            geodata.tracks = geodata.tracks.map(function(line) {
                                    line = unwrapLatLngsCrossing180Meridian(line);
                                    line = L.LineUtil.simplifyLatlngs(line, 360 / (1 << 24));
                                    if (line.length === 1) {
                                        line.push(line[0]);
                                    }
                                    return line;
                                }
                            );
                        }
                        hasData = true;
                        this.addTrack(geodata);
                    }
                    var error_messages = {
                        CORRUPT: 'File "{name}" is corrupt',
                        UNSUPPORTED: 'File "{name}" has unsupported format or is badly corrupt',
                        NETWORK: 'Could not download file from url "{name}"',
                        INVALID_URL: '"{name}"  is not of supported URL type',
                    };
                    var message;
                    if (geodata.error) {
                        message = error_messages[geodata.error] || geodata.error;
                        if (data_empty) {
                            message += ', no data could be loaded';
                        } else {
                            message += ', loaded data can be invalid or incomplete';
                        }
                    } else if (data_empty) {
                        message =
                            'No data could be loaded from file "{name}". ' +
                            'File is empty or contains only unsupported data.';
                    }
                    if (message) {
                        message = L.Util.template(message, {name: geodata.name});
                        messages.push(message);
                    }
                }.bind(this)
            );
            if (messages.length) {
                notify(messages.join('\n'));
            }
            return hasData;
        },

        onTrackColorChanged: function(track) {
            var color = this.colors[track.color()];
            this.getTrackPolylines(track).forEach(
                function(polyline) {
                    polyline.setStyle({color: color});
                }
            );
            var markers = this.getTrackPoints(track);
            markers.forEach(this.setMarkerIcon.bind(this));
            if (track.visible()) {
                this._markerLayer.updateMarkers(markers);
            }
        },

        onTrackVisibilityChanged: function(track) {
            if (track.visible()) {
                this.map.addLayer(track.feature);
                this._markerLayer.addMarkers(track.markers);
            } else {
                if (this.trackAddingPoint() === track) {
                    this.stopPlacingPoint();
                }
                this.map.removeLayer(track.feature);
                this._markerLayer.removeMarkers(track.markers);
            }
            this.updateTrackHighlight();
        },

        onTrackSegmentNodesChanged: function(track, segment) {
            if (segment.getFixedLatLngs().length > 0) {
                this.trackAddingSegment(null);
            }
            this.recalculateTrackLength(track);
        },

        recalculateTrackLength: function(track) {
            const lines = this.getTrackPolylines(track);
            let length = 0;
            for (let line of lines) {
                length += line.getLength();
            }
            track.length(length);
        },

        formatLength: function(x) {
            var digits = 0;
            if (x < 10000) {
                digits = 2;
            } else if (x < 100000) {
                digits = 1;
            }
            return (x / 1000).toFixed(digits) + ' km';
        },

        setTrackMeasureTicksVisibility: function(track) {
            var visible = track.measureTicksShown(),
                lines = this.getTrackPolylines(track);
            lines.forEach((line) => line.setMeasureTicksVisible(visible));
        },

        switchMeasureTicksVisibility: function(track) {
            track.measureTicksShown(!(track.measureTicksShown()));
        },

        onColorSelectorClicked: function(track, e) {
            track._contextmenu.show(e);
        },

        setViewToTrack: function(track) {
            this.setViewToBounds(this.getTrackBounds(track));
        },

        setViewToAllTracks: function(immediate) {
            const bounds = L.latLngBounds([]);
            for (let track of this.tracks()) {
                bounds.extend(this.getTrackBounds(track));
            }
            this.setViewToBounds(bounds, immediate);
        },

        setViewToBounds: function(bounds, immediate) {
            if (bounds && bounds.isValid()) {
                bounds = wrapLatLngBoundsToTarget(bounds, this.map.getCenter());
                if (L.Browser.mobile || immediate) {
                    this.map.fitBounds(bounds, {maxZoom: 16});
                } else {
                    this.map.flyToBounds(bounds, {maxZoom: 16});
                }
            }
        },

        getTrackBounds: function(track) {
            const lines = this.getTrackPolylines(track);
            const points = this.getTrackPoints(track);
            const bounds = L.latLngBounds([]);
            if (lines.length || points.length) {
                lines.forEach((l) => {
                        if (l.getLatLngs().length > 1) {
                            bounds.extend(wrapLatLngBoundsToTarget(l.getBounds(), bounds));
                        }
                    }
                );
                points.forEach((p) => {
                        bounds.extend(wrapLatLngToTarget(p.latlng, bounds));
                    }
                );
            }
            return bounds;
        },

        attachColorSelector: function(track) {
            var items = this.colors.map(function(color, index) {
                    return {
                        text: '<div style="display: inline-block; vertical-align: middle; width: 50px; height: 0; ' +
                            'border-top: 4px solid ' + color + '"></div>',
                        callback: track.color.bind(null, index)
                    };
                }
            );
            track._contextmenu = new Contextmenu(items);
        },

        attachActionsMenu: function(track) {
            var items = [
                function() {
                    return {text: `${track.name()}`, header: true};
                },
                '-',
                {text: 'Rename', callback: this.renameTrack.bind(this, track)},
                {text: 'Duplicate', callback: this.duplicateTrack.bind(this, track)},
                {text: 'Reverse', callback: this.reverseTrack.bind(this, track)},
                {text: 'Show elevation profile', callback: this.showElevationProfileForTrack.bind(this, track)},
                '-',
                {text: 'Delete', callback: this.removeTrack.bind(this, track)},
                '-',
                {text: 'Save as GPX', callback: () => this.saveTrackAsFile(track, geoExporters.saveGpx, '.gpx')},
                {text: 'Save as KML', callback: () => this.saveTrackAsFile(track, geoExporters.saveKml, '.kml')},
                {text: 'Copy link for track', callback: this.copyTrackLinkToClipboard.bind(this, track)},
                {text: 'Extra', separator: true},
                {
                    text: 'Save as GPX with added elevation (SRTM)',
                    callback: this.saveTrackAsFile.bind(this, track, geoExporters.saveGpxWithElevations, '.gpx', true),
                },
            ];
            track._actionsMenu = new Contextmenu(items);
        },

        onButtonAddSegmentClicked: function(track) {
            if (!track.visible()) {
                return;
            }
            if (this.trackAddingSegment() === track) {
                this.trackAddingSegment(null);
                this.stopEditLine();
            } else {
                this.addSegmentAndEdit(track);
            }
        },

        duplicateTrack: function(track) {
            const segments = this.getTrackPolylines(track).map((line) =>
                line.getLatLngs().map((latlng) => [latlng.lat, latlng.lng])
            );
            const points = this.getTrackPoints(track)
                .map((point) => ({lat: point.latlng.lat, lng: point.latlng.lng, name: point.label}));
            this.addTrack({name: track.name(), tracks: segments, points});
        },

        reverseTrackSegment: function(trackSegment) {
            trackSegment.stopDrawingLine();
            var latlngs = trackSegment.getLatLngs();
            latlngs = latlngs.map(function(ll) {
                    return [ll.lat, ll.lng];
                }
            );
            latlngs.reverse();
            var isEdited = (this._editedLine === trackSegment);
            this.deleteTrackSegment(trackSegment);
            var newTrackSegment = this.addTrackSegment(trackSegment._parentTrack, latlngs);
            if (isEdited) {
                this.startEditTrackSegement(newTrackSegment);
            }
        },

        reverseTrack: function(track) {
            var that = this;
            this.getTrackPolylines(track).forEach(function(trackSegment) {
                    that.reverseTrackSegment(trackSegment);
                }
            );
        },

        copyTracksLinkToClipboard: function(tracks, mouseEvent) {
            if (!tracks.length) {
                notify('No tracks to copy');
                return;
            }
            let serialized = tracks.map((track) => this.trackToString(track)).join('/');
            const hashDigest = md5(serialized, null, true);
            const key = btoa(hashDigest).replace(/\//ug, '_').replace(/\+/ug, '-').replace(/=/ug, '');
            const url = getLinkToShare(this.options.keysToExcludeOnCopyLink, {nktl: key});
            copyToClipboard(url, mouseEvent);
            fetch(`${config.tracksStorageServer}/track/${key}`, {
                method: 'POST',
                data: serialized,
                withCredentials: true
            }).then(
                null, (e) => {
                    let message = e.message || e;
                    if (e.xhr.status === 413) {
                        message = 'track is too big';
                    }
                    logging.captureMessage('Failed to save track to server',
                        {status: e.xhr.status, response: e.xhr.responseText});
                    notify('Error making link: ' + message);
                }
            );
        },

        copyTrackLinkToClipboard: function(track, mouseEvent) {
            this.copyTracksLinkToClipboard([track], mouseEvent);
        },

        saveTrackAsFile: async function(track, exporter, extension, addElevations = false) {
            var lines = this.getTrackPolylines(track)
                .map(function(line) {
                        return line.getFixedLatLngs();
                    }
                );
            lines = splitLinesAt180Meridian(lines);
            var points = this.getTrackPoints(track);
            let name = track.name();
            // Browser (Chrome) removes leading dots.
            name = name.replace(/^\./u, '_');
            for (let extensions of [this.options.splitExtensionsFirstStage, this.options.splitExtensions]) {
                let i = name.lastIndexOf('.');
                if (i > -1 && extensions.includes(name.slice(i + 1).toLowerCase())) {
                    name = name.slice(0, i);
                }
            }
            if (lines.length === 0 && points.length === 0) {
                notify('Track is empty, nothing to save');
                return;
            }

            if (addElevations) {
                const request = [
                    ...points.map((p) => p.latlng),
                    ...lines.reduce((acc, cur) => {
                        acc.push(...cur);
                        return acc;
                    }, [])
                ];
                let elevations;
                try {
                    elevations = await new ElevationProvider().get(request);
                } catch (e) {
                    logging.captureException(e, 'error getting elevation for gpx');
                    notify(`Failed to get elevation data: ${e.message}`);
                }
                let n = 0;
                for (let p of points) {
                    // we make copy of latlng as we are changing it
                    p.latlng = L.latLng(p.latlng.lat, p.latlng.lng, elevations[n]);
                    n += 1;
                }
                for (let line of lines) {
                    for (let p of line) {
                        // we do not need to create new LatLng since splitLinesAt180Meridian() have already done it
                        p.alt = elevations[n];
                        n += 1;
                    }
                }
            }

            var fileText = exporter(lines, name, points);
            var filename = name + extension;
            saveAs(blobFromString(fileText), filename, true);
        },

        renameTrack: function(track) {
            var newName = query('Enter new name', track.name());
            if (newName && newName.length) {
                track.name(newName);
            }
        },

        showTrackMenu: function(track, e) {
            track._actionsMenu.show(e);
        },

        showMenu: function(e) {
            this.menu.show(e);
        },

        stopEditLine: function() {
            if (this._editedLine) {
                this._editedLine.stopEdit();
            }
        },

        onTrackSegmentClick: function(e) {
            if (this.isPlacingPoint) {
                return;
            }
            const trackSegment = e.target;
            if (this._lineJoinActive) {
                L.DomEvent.stopPropagation(e);
                this.joinTrackSegments(trackSegment, isPointCloserToStart(e.target.getLatLngs(), e.latlng));
            } else {
                this.startEditTrackSegement(trackSegment);
                L.DomEvent.stopPropagation(e);
            }
        },

        startEditTrackSegement: function(polyline) {
            if (this._editedLine && this._editedLine !== polyline) {
                this.stopEditLine();
            }
            polyline.startEdit();
            this._editedLine = polyline;
            polyline.once('editend', this.onLineEditEnd, this);
            this.fire('startedit');
        },

        onButtonAddPointClicked: function(track) {
            if (!track.visible()) {
                return;
            }
            if (this.trackAddingPoint() === track) {
                this.stopPlacingPoint();
            } else {
                this.beginPointCreate(track);
            }
        },

        _beginPointEdit: function() {
            this.stopPlacingPoint();
            this.stopEditLine();
            L.DomUtil.addClass(this._map._container, 'leaflet-point-placing');
            this.isPlacingPoint = true;
            L.DomEvent.on(document, 'keydown', this.stopPlacingPointOnEscPressed, this);
            this.fire('startedit');
        },

        beginPointMove: function(marker) {
            this._beginPointEdit();
            this._movingMarker = marker;
            this.map.on('click', this.movePoint, this);
        },

        beginPointCreate: function(track) {
            this._beginPointEdit();
            this.map.on('click', this.createNewPoint, this);
            this.trackAddingPoint(track);
        },

        movePoint: function(e) {
            const marker = this._movingMarker;
            const newLatLng = e.latlng.wrap();
            this._markerLayer.setMarkerPosition(marker, newLatLng);
            this.stopPlacingPoint();
        },

        getNewPointName: function(track) {
            let maxNumber = 0;
            for (let marker of track.markers) {
                const label = marker.label;
                if (label.match(/^\d{3}([^\d.]|$)/u)) {
                    maxNumber = parseInt(label, 10);
                }
            }
            return maxNumber === 999 ? '' : String(maxNumber + 1).padStart(3, '0');
        },

        createNewPoint: function(e) {
            if (!this.isPlacingPoint) {
                return;
            }
            const parentTrack = this.trackAddingPoint();
            const name = e.suggested && this._map.suggestedPoint?.title || this.getNewPointName(parentTrack);
            const newLatLng = e.latlng.wrap();
            const marker = this.addPoint(parentTrack, {name: name, lat: newLatLng.lat, lng: newLatLng.lng});
            this._markerLayer.addMarker(marker);
            // we need to show prompt after marker is dispalyed;
            // grid layer is updated in setTimout(..., 0)after adding marker
            // it is better to do it on 'load' event but when it is fired marker is not yet displayed
            setTimeout(() => {
                this.renamePoint(marker);
                this.beginPointCreate(parentTrack);
            }, 10);
        },

        stopPlacingPointOnEscPressed: function(e) {
            if (e.keyCode === 27) {
                this.stopPlacingPoint();
            }
        },

        stopPlacingPoint: function() {
            this.isPlacingPoint = false;
            this.trackAddingPoint(null);
            L.DomUtil.removeClass(this._map._container, 'leaflet-point-placing');
            L.DomEvent.off(document, 'keydown', this.stopPlacingPointOnEscPressed, this);
            this.map.off('click', this.createNewPoint, this);
            this.map.off('click', this.movePoint, this);
        },

        joinTrackSegments: function(newSegment, joinToStart) {
            this.hideLineCursor();
            var originalSegment = this._editedLine;
            var latlngs = originalSegment.getLatLngs(),
                latngs2 = newSegment.getLatLngs();
            if (joinToStart === this._lineJoinFromStart) {
                latngs2.reverse();
            }
            if (this._lineJoinFromStart) {
                latlngs.unshift(...latngs2);
            } else {
                latlngs.push(...latngs2);
            }
            latlngs = latlngs.map(function(ll) {
                    return [ll.lat, ll.lng];
                }
            );
            this.deleteTrackSegment(originalSegment);
            if (originalSegment._parentTrack === newSegment._parentTrack) {
                this.deleteTrackSegment(newSegment);
            }
            this.addTrackSegment(originalSegment._parentTrack, latlngs);
        },

        onLineEditEnd: function(e) {
            const polyline = e.target;
            const track = polyline._parentTrack;
            if (polyline.getLatLngs().length < 2) {
                this.deleteTrackSegment(polyline);
            }
            if (this._editedLine === polyline) {
                this._editedLine = null;
            }
            if (!this.getTrackPolylines(track).length && !this.getTrackPoints(track).length && e.userCancelled) {
                this.removeTrack(track);
            }
        },

        addTrackSegment: function(track, sourcePoints) {
            var polyline = new TrackSegment(sourcePoints || [], {
                    color: this.colors[track.color()],
                    print: true
                }
            );
            polyline._parentTrack = track;
            polyline.setMeasureTicksVisible(track.measureTicksShown());
            polyline.on('click', this.onTrackSegmentClick, this);
            polyline.on('nodeschanged', this.onTrackSegmentNodesChanged.bind(this, track, polyline));
            polyline.on('noderightclick', this.onNodeRightClickShowMenu, this);
            polyline.on('segmentrightclick', this.onSegmentRightClickShowMenu, this);
            polyline.on('mouseover', () => this.onTrackMouseEnter(track));
            polyline.on('mouseout', () => this.onTrackMouseLeave(track));
            polyline.on('editstart', () => this.onTrackEditStart(track));
            polyline.on('editend', () => this.onTrackEditEnd(track));
            polyline.on('drawend', this.onTrackSegmentDrawEnd, this);

            // polyline.on('editingstart', polyline.setMeasureTicksVisible.bind(polyline, false));
            // polyline.on('editingend', this.setTrackMeasureTicksVisibility.bind(this, track));
            track.feature.addLayer(polyline);
            this.recalculateTrackLength(track);
            return polyline;
        },

        onNodeRightClickShowMenu: function(e) {
            var items = [];
            if (e.nodeIndex > 0 && e.nodeIndex < e.line.getLatLngs().length - 1) {
                items.push({
                        text: 'Cut',
                        callback: this.splitTrackSegment.bind(this, e.line, e.nodeIndex, null)
                    }
                );
            }
            if (e.nodeIndex === 0 || e.nodeIndex === e.line.getLatLngs().length - 1) {
                items.push({text: 'Join', callback: this.startLineJoinSelection.bind(this, e)});
            }
            items.push({text: 'Reverse', callback: this.reverseTrackSegment.bind(this, e.line)});
            items.push({text: 'Shortcut', callback: this.startShortCutSelection.bind(this, e, true)});
            items.push({text: 'Delete segment', callback: this.deleteTrackSegment.bind(this, e.line)});
            items.push({text: 'New track from segment', callback: this.newTrackFromSegment.bind(this, e.line)});
            items.push({
                    text: 'Show elevation profile for segment',
                    callback: this.showElevationProfileForSegment.bind(this, e.line)
                }
            );

            var menu = new Contextmenu(items);
            menu.show(e.mouseEvent);
        },

        onSegmentRightClickShowMenu: function(e) {
            var menu = new Contextmenu([
                    {
                        text: 'Cut',
                        callback: this.splitTrackSegment.bind(this, e.line, e.nodeIndex, e.mouseEvent.latlng)
                    },
                    {text: 'Reverse', callback: this.reverseTrackSegment.bind(this, e.line)},
                    {text: 'Shortcut', callback: this.startShortCutSelection.bind(this, e, false)},
                    {text: 'Delete segment', callback: this.deleteTrackSegment.bind(this, e.line)},
                    {text: 'New track from segment', callback: this.newTrackFromSegment.bind(this, e.line)},
                    {
                        text: 'Show elevation profile for segment',
                        callback: this.showElevationProfileForSegment.bind(this, e.line)
                    }
                ]
            );
            menu.show(e.mouseEvent);
        },

        showLineCursor: function(start, mousepos) {
            this.hideLineCursor();
            this._editedLine.stopDrawingLine();
            this._lineCursor = L.polyline([start.clone(), mousepos], {
                ...this.options.lineCursorStyle,
                ...this.options.lineCursorInvalidStyle,
            }).addTo(this._map);
            this.map.on('mousemove', this.onMouseMoveOnMapForLineCursor, this);
            this.map.on('click', this.hideLineCursor, this);
            L.DomEvent.on(document, 'keyup', this.onKeyUpForLineCursor, this);
            L.DomUtil.addClass(this.map.getContainer(), 'tracklist-line-cursor-shown');
            this._editedLine.preventStopEdit = true;
        },

        hideLineCursor: function() {
            if (this._lineCursor) {
                this.map.off('mousemove', this.onMouseMoveOnMapForLineCursor, this);
                this.map.off('click', this.hideLineCursor, this);
                L.DomUtil.removeClass(this.map.getContainer(), 'tracklist-line-cursor-shown');
                L.DomEvent.off(document, 'keyup', this.onKeyUpForLineCursor, this);
                this.map.removeLayer(this._lineCursor);
                this._lineCursor = null;
                this.fire('linecursorhide');
                this._editedLine.preventStopEdit = false;
            }
        },

        onMouseMoveOnMapForLineCursor: function(e) {
            this.updateLineCursor(e.latlng, false);
        },

        updateLineCursor: function(latlng, isValid) {
            if (!this._lineCursor) {
                return;
            }
            this._lineCursor.getLatLngs().splice(1, 1, latlng);
            this._lineCursor.redraw();
            this._lineCursor.setStyle(
                isValid ? this.options.lineCursorValidStyle : this.options.lineCursorInvalidStyle
            );
        },

        onKeyUpForLineCursor: function(e) {
            if (e.target.tagName.toLowerCase() === 'input') {
                return;
            }
            switch (e.keyCode) {
                case 27:
                case 13:
                    this.hideLineCursor();
                    L.DomEvent.stop(e);
                    break;
                default:
            }
        },

        startLineJoinSelection: function(e) {
            this._lineJoinFromStart = (e.nodeIndex === 0);
            const cursorStart = this._editedLine.getLatLngs()[e.nodeIndex];
            this.showLineCursor(cursorStart, e.mouseEvent.latlng);
            this.on('linecursorhide', this.onLineCursorHideForJoin, this);
            for (let track of this.tracks()) {
                track.feature.on('mousemove', this.onMouseMoveOnLineForJoin, this);
            }
            this._lineJoinActive = true;
            this._editedLine.disableEditOnLeftClick(true);
        },

        onMouseMoveOnLineForJoin: function(e) {
            const latlngs = e.layer.getLatLngs();
            const lineJoinToStart = isPointCloserToStart(latlngs, e.latlng);
            const cursorEnd = lineJoinToStart ? latlngs[0] : latlngs[latlngs.length - 1];
            L.DomEvent.stopPropagation(e);
            this.updateLineCursor(cursorEnd, true);
        },

        onLineCursorHideForJoin: function() {
            for (let track of this.tracks()) {
                track.feature.off('mousemove', this.onMouseMoveOnLineForJoin, this);
            }
            this.off('linecursorhide', this.onLineCursorHideForJoin, this);
            this._editedLine.disableEditOnLeftClick(false);
            this._lineJoinActive = false;
        },

        startShortCutSelection: function(e, startFromNode) {
            const line = this._editedLine;
            this._shortCut = {startNodeIndex: e.nodeIndex, startFromNode};
            let cursorStart;
            if (startFromNode) {
                cursorStart = line.getLatLngs()[e.nodeIndex];
            } else {
                cursorStart = closestPointToLineSegment(line.getLatLngs(), e.nodeIndex, e.mouseEvent.latlng);
                this._shortCut.startLatLng = cursorStart;
            }
            this.showLineCursor(cursorStart, e.mouseEvent.latlng);
            line.nodeMarkers.on('mousemove', this.onMouseMoveOnNodeMarkerForShortCut, this);
            line.segmentOverlays.on('mousemove', this.onMouseMoveOnLineSegmentForShortCut, this);
            this.map.on('mousemove', this.onMouseMoveOnMapForShortCut, this);
            line.nodeMarkers.on('click', this.onClickNodeMarkerForShortCut, this);
            line.segmentOverlays.on('click', this.onClickLineSegmentForShortCut, this);
            this.on('linecursorhide', this.onLineCursorHideForShortCut, this);
            line.disableEditOnLeftClick(true);
        },

        onMouseMoveOnLineSegmentForShortCut: function(e) {
            this.updateShortCutSelection(e, false);
        },

        onMouseMoveOnNodeMarkerForShortCut: function(e) {
            this.updateShortCutSelection(e, true);
        },

        onMouseMoveOnMapForShortCut: function() {
            this._editedLine.highlighNodesForDeletion();
        },

        updateShortCutSelection: function(e, endAtNode) {
            L.DomEvent.stopPropagation(e);
            const line = this._editedLine;
            const {firstNodeToDelete, lastNodeToDelete, rangeValid} = this.getShortCutNodes(e, endAtNode);
            this.updateLineCursor(e.latlng, rangeValid);
            if (rangeValid) {
                line.highlighNodesForDeletion(firstNodeToDelete, lastNodeToDelete);
            } else {
                line.highlighNodesForDeletion();
            }
        },

        onLineCursorHideForShortCut: function() {
            const line = this._editedLine;
            line.highlighNodesForDeletion();
            line.nodeMarkers.off('mousemove', this.onMouseMoveOnNodeMarkerForShortCut, this);
            line.segmentOverlays.off('mousemove', this.onMouseMoveOnLineSegmentForShortCut, this);
            this.map.off('mousemove', this.onMouseMoveOnMapForShortCut, this);
            line.nodeMarkers.off('click', this.onClickNodeMarkerForShortCut, this);
            line.segmentOverlays.off('click', this.onClickLineSegmentForShortCut, this);
            this.off('linecursorhide', this.onLineCursorHideForShortCut, this);
            line.disableEditOnLeftClick(false);
            this._shortCut = null;
        },

        onClickLineSegmentForShortCut: function(e) {
            this.shortCutSegment(e, false);
        },

        onClickNodeMarkerForShortCut: function(e) {
            this.shortCutSegment(e, true);
        },

        getShortCutNodes: function(e, endAtNode) {
            const line = this._editedLine;
            let startFromNode = this._shortCut.startFromNode;
            let startNodeIndex = this._shortCut.startNodeIndex;
            let endNodeIndex = line[endAtNode ? 'getMarkerIndex' : 'getSegmentOverlayIndex'](e.layer);
            const newNodes = [];
            if (!startFromNode) {
                newNodes.push(this._shortCut.startLatLng);
            }
            if (!endAtNode) {
                newNodes.push(closestPointToLineSegment(line.getLatLngs(), endNodeIndex, e.latlng));
            }
            let firstNodeToDelete, lastNodeToDelete;
            if (endNodeIndex > startNodeIndex) {
                firstNodeToDelete = startNodeIndex + 1;
                lastNodeToDelete = endNodeIndex - 1;
                if (!endAtNode) {
                    lastNodeToDelete += 1;
                }
            } else {
                newNodes.reverse();
                firstNodeToDelete = endNodeIndex + 1;
                lastNodeToDelete = startNodeIndex - 1;
                if (!startFromNode) {
                    lastNodeToDelete += 1;
                }
            }
            return {firstNodeToDelete, lastNodeToDelete, newNodes, rangeValid: lastNodeToDelete >= firstNodeToDelete};
        },

        shortCutSegment: function(e, endAtNode) {
            L.DomEvent.stopPropagation(e);
            const line = this._editedLine;
            const {firstNodeToDelete, lastNodeToDelete, newNodes, rangeValid} = this.getShortCutNodes(e, endAtNode);
            if (!rangeValid) {
                return;
            }
            this.stopEditLine();
            line.spliceLatLngs(firstNodeToDelete, lastNodeToDelete - firstNodeToDelete + 1, ...newNodes);
            this.startEditTrackSegement(line);
        },

        onTrackMouseEnter: function(track) {
            track.hover(true);
        },

        onTrackMouseLeave: function(track) {
            track.hover(false);
        },

        onTrackEditStart: function(track) {
            track.isEdited(true);
        },

        onTrackEditEnd: function(track) {
            track.isEdited(false);
            this.hideLineCursor();
            this._editedLine = null;
        },

        onTrackRowMouseEnter: function(track) {
            track.hover(true);
        },

        onTrackRowMouseLeave: function(track) {
            track.hover(false);
        },

        onTrackSegmentDrawEnd: function() {
            this.trackAddingSegment(null);
        },

        splitTrackSegment: function(trackSegment, nodeIndex, latlng) {
            var latlngs = trackSegment.getLatLngs();
            latlngs = latlngs.map((latlng) => latlng.clone());
            var latlngs1 = latlngs.slice(0, nodeIndex + 1),
                latlngs2 = latlngs.slice(nodeIndex + 1);
            if (latlng) {
                latlng = closestPointToLineSegment(latlngs, nodeIndex, latlng);
                latlngs1.push(latlng.clone());
            } else {
                latlng = latlngs[nodeIndex];
            }
            latlngs2.unshift(latlng.clone());
            this.deleteTrackSegment(trackSegment);
            var segment1 = this.addTrackSegment(trackSegment._parentTrack, latlngs1);
            this.addTrackSegment(trackSegment._parentTrack, latlngs2);
            this.startEditTrackSegement(segment1);
        },

        deleteTrackSegment: function(trackSegment) {
            const track = trackSegment._parentTrack;
            track.feature.removeLayer(trackSegment);
            this.recalculateTrackLength(track);
        },

        newTrackFromSegment: function(trackSegment) {
            var srcNodes = trackSegment.getLatLngs(),
                newNodes = [],
                i;
            for (i = 0; i < srcNodes.length; i++) {
                newNodes.push([srcNodes[i].lat, srcNodes[i].lng]);
            }
            this.addTrack({name: "New track", tracks: [newNodes]});
        },

        addTrack: function(geodata) {
            var color;
            color = geodata.color;
            if (!(color >= 0 && color < this.colors.length)) {
                color = this._lastTrackColor;
                this._lastTrackColor = (this._lastTrackColor + 1) % this.colors.length;
            }
            var track = {
                name: ko.observable(geodata.name),
                color: ko.observable(color),
                visible: ko.observable(!geodata.trackHidden),
                length: ko.observable(0),
                measureTicksShown: ko.observable(geodata.measureTicksShown || false),
                feature: L.featureGroup([]),
                markers: [],
                hover: ko.observable(false),
                isEdited: ko.observable(false)
            };
            (geodata.tracks || []).forEach(this.addTrackSegment.bind(this, track));
            (geodata.points || []).forEach(this.addPoint.bind(this, track));

            this.tracks.push(track);

            track.visible.subscribe(this.onTrackVisibilityChanged.bind(this, track));
            track.measureTicksShown.subscribe(this.setTrackMeasureTicksVisibility.bind(this, track));
            track.color.subscribe(this.onTrackColorChanged.bind(this, track));
            if (!L.Browser.touch) {
                track.feature.bindTooltip(() => track.name(), {sticky: true, delay: 500});
            }
            track.hover.subscribe(this.onTrackHoverChanged.bind(this, track));

            // this.onTrackColorChanged(track);
            this.onTrackVisibilityChanged(track);
            this.attachColorSelector(track);
            this.attachActionsMenu(track);
            return track;
        },

        onTrackHoverChanged: function(track, hover) {
            if (hover) {
                this._highlightedTrack = track;
            } else if (this._highlightedTrack === track) {
                this._highlightedTrack = null;
            }
            this.updateTrackHighlight();
        },

        updateTrackHighlight: function() {
            if (L.Browser.touch) {
                return;
            }
            if (this._trackHighlight) {
                this._trackHighlight.removeFrom(this._map);
                this._trackHighlight = null;
            }
            if (this._highlightedTrack && this._highlightedTrack.visible()) {
                const trackHighlight = L.featureGroup([]).addTo(this._map).bringToBack();
                for (const line of this._highlightedTrack.feature.getLayers()) {
                    let latlngs = line.getFixedLatLngs();
                    if (latlngs.length === 0) {
                        continue;
                    }
                    L.polyline(latlngs, {...this.options.trackHighlightStyle, interactive: false}).addTo(
                        trackHighlight
                    );
                    const start = latlngs[0];
                    const end = latlngs[latlngs.length - 1];
                    L.polyline([start, start], {...this.options.trackStartHighlightStyle, interactive: false}).addTo(
                        trackHighlight
                    );
                    L.polyline([end, end], {...this.options.trackEndHighlightStyle, interactive: false}).addTo(
                        trackHighlight
                    );
                }
                for (const marker of this._highlightedTrack.markers) {
                    const latlng = marker.latlng.clone();
                    L.polyline([latlng, latlng], {...this.options.trackMarkerHighlightStyle, interactive: false}).addTo(
                        trackHighlight
                    );
                }
                this._trackHighlight = trackHighlight;
            }
        },

        setMarkerIcon: function(marker) {
            var symbol = 'marker',
                colorInd = marker._parentTrack.color() + 1,
                className = 'symbol-' + symbol + '-' + colorInd;
            marker.icon = iconFromBackgroundImage('track-waypoint ' + className);
        },

        setMarkerLabel: function(marker, label) {
            marker.label = label;
        },

        addPoint: function(track, srcPoint) {
            var marker = {
                latlng: L.latLng([srcPoint.lat, srcPoint.lng]),
                _parentTrack: track,
            };
            this.setMarkerIcon(marker);
            this.setMarkerLabel(marker, srcPoint.name);
            track.markers.push(marker);
            marker._parentTrack = track;
            return marker;
        },

        onMarkerClick: function(e) {
            new Contextmenu([
                    {text: e.marker.label, header: true},
                    '-',
                    {text: 'Rename', callback: this.renamePoint.bind(this, e.marker)},
                    {text: 'Move', callback: this.beginPointMove.bind(this, e.marker)},
                    {text: 'Delete', callback: this.removePoint.bind(this, e.marker)},
                ]
            ).show(e);
        },

        onMarkerEnter: function(e) {
            e.marker._parentTrack.hover(true);
        },

        onMarkerLeave: function(e) {
            e.marker._parentTrack.hover(false);
        },

        removePoint: function(marker) {
            this.stopPlacingPoint();
            this._markerLayer.removeMarker(marker);
            const markers = marker._parentTrack.markers;
            const i = markers.indexOf(marker);
            markers.splice(i, 1);
        },

        renamePoint: function(marker) {
            this.stopPlacingPoint();
            var newLabel = query('New point name', marker.label);
            if (newLabel !== null) {
                this.setMarkerLabel(marker, newLabel);
                this._markerLayer.updateMarker(marker);
            }
        },

        removeTrack: function(track) {
            track.visible(false);
            this.tracks.remove(track);
        },

        deleteAllTracks: function() {
            var tracks = this.tracks().slice(0),
                i;
            for (i = 0; i < tracks.length; i++) {
                this.removeTrack(tracks[i]);
            }
        },

        deleteHiddenTracks: function() {
            var tracks = this.tracks().slice(0),
                i, track;
            for (i = 0; i < tracks.length; i++) {
                track = tracks[i];
                if (!track.visible()) {
                    this.removeTrack(tracks[i]);
                }
            }
        },

        trackToString: function(track, forceVisible) {
            var lines = this.getTrackPolylines(track).map(function(line) {
                    var points = line.getFixedLatLngs();
                    points = L.LineUtil.simplifyLatlngs(points, 360 / (1 << 24));
                    return points;
                }
            );
            return geoExporters.saveToString(lines, track.name(), track.color(), track.measureTicksShown(),
                this.getTrackPoints(track), forceVisible ? false : !track.visible()
            );
        },

        copyAllTracksToClipboard: function(mouseEvent) {
            this.copyTracksLinkToClipboard(this.tracks(), mouseEvent);
        },

        copyVisibleTracksToClipboard: function(mouseEvent) {
            const tracks = this.tracks().filter((track) => track.visible());
            this.copyTracksLinkToClipboard(tracks, mouseEvent);
        },

        createNewTrackFromVisibleTracks: function() {
            const tracks = this.tracks().filter((track) => track.visible());
            if (tracks.length === 0) {
                return;
            }
            let newTrackName = tracks[0].name();
            newTrackName = query('New track name', newTrackName);
            if (newTrackName === null) {
                return;
            }

            const newTrackSegments = [];
            const newTrackPoints = [];

            for (const track of tracks) {
                for (let segment of this.getTrackPolylines(track)) {
                    const points = segment.getFixedLatLngs().map(({lat, lng}) => ({lat, lng}));
                    newTrackSegments.push(points);
                }
                const points = this.getTrackPoints(track).map((point) => ({
                    lat: point.latlng.lat,
                    lng: point.latlng.lng,
                    name: point.label
                }));
                newTrackPoints.push(...points);
            }

            this.addTrack({name: newTrackName, tracks: newTrackSegments, points: newTrackPoints});
        },

        exportTracks: function(minTicksIntervalMeters) {
            var that = this;
            /* eslint-disable max-nested-callbacks */
            return this.tracks()
                .filter(function(track) {
                        return that.getTrackPolylines(track).length;
                    }
                )
                .map(function(track) {
                        var capturedTrack = track.feature.getLayers().map(function(pl) {
                                return pl.getLatLngs().map(function(ll) {
                                        return [ll.lat, ll.lng];
                                    }
                                );
                            }
                        );
                        var bounds = track.feature.getBounds();
                        var capturedBounds = [
                            [bounds.getSouth(), bounds.getWest()],
                            [bounds.getNorth(), bounds.getEast()]
                        ];
                        return {
                            color: track.color(),
                            visible: track.visible(),
                            segments: capturedTrack,
                            bounds: capturedBounds,
                            measureTicksShown: track.measureTicksShown(),
                            measureTicks: [].concat(...track.feature.getLayers().map(function(pl) {
                                    return pl.getTicksPositions(minTicksIntervalMeters);
                                }
                                )
                            )
                        };
                    }
                );
            /* eslint-enable max-nested-callbacks */
        },

        showElevationProfileForSegment: function(line) {
            this.hideElevationProfile();
            this.stopEditLine();
            this._elevationControl = new ElevationProfile(this._map, line.getLatLngs(), {
                    samplingInterval: calcSamplingInterval(line.getLength())
                }
            );
            this.fire('elevation-shown');
        },

        showElevationProfileForTrack: function(track) {
            var lines = this.getTrackPolylines(track),
                path = [],
                i;
            for (i = 0; i < lines.length; i++) {
                if (lines[i] === this._editedLine) {
                    this.stopEditLine();
                }
                path = path.concat(lines[i].getLatLngs());
            }
            this.hideElevationProfile();
            this._elevationControl = new ElevationProfile(this._map, path, {
                    samplingInterval: calcSamplingInterval(new L.MeasuredLine(path).getLength())
                }
            );
            this.fire('elevation-shown');
        },

        hideElevationProfile: function() {
            if (this._elevationControl) {
                this._elevationControl.removeFrom(this._map);
            }
            this._elevationControl = null;
        },

        hasTracks: function() {
            return this.tracks().length > 0;
        }
    }
);

export {TRACKLIST_TRACK_COLORS};
