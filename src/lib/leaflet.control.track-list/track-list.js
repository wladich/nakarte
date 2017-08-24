import L from 'leaflet';
import ko from 'vendored/knockout';
import Contextmenu from 'lib/contextmenu';
import 'lib/knockout.component.progress/progress';
import './track-list.css';
import {selectFiles, readFiles} from 'lib/file-read';
import {parseGeoFile} from './lib/geo_file_formats';
import urlViaCorsProxy from 'lib/CORSProxy';
import {fetch} from 'lib/xhr-promise';
import geoExporters from './lib/geo_file_exporters';
import copyToClipboard from 'lib/clipboardCopy';
import {saveAs} from 'browser-filesaver';
import 'lib/leaflet.layer.canvasMarkers';
import 'lib/leaflet.lineutil.simplifyLatLngs';
import iconFromBackgroundImage from 'lib/iconFromBackgroundImage';
import 'lib/controls-styles/controls-styles.css';
import {ElevationProfile, calcSamplingInterval} from 'lib/leaflet.control.elevation-profile';
import 'lib/leaflet.control.commons';
import {blobFromString} from 'lib/binary-strings';
import 'lib/leaflet.polyline-edit';
import 'lib/leaflet.polyline-measure';
import logging from 'lib/logging';
import {notify} from 'lib/notifications';
import {isGpsiesUrl, gpsiesXhrOptions} from './lib/gpsies';


const TrackSegment = L.MeasuredLine.extend({
    includes: L.Polyline.EditMixin,

    options: {
        weight: 6,
        lineCap: 'butt',
        opacity: 0.5,

    }
});
TrackSegment.mergeOptions(L.Polyline.EditMixinOptions);


L.Control.TrackList = L.Control.extend({
        options: {position: 'bottomright'},
        includes: L.Mixin.Events,

        colors: ['#77f', '#f95', '#0ff', '#f77', '#f7f', '#ee5'],


        initialize: function() {
            L.Control.prototype.initialize.call(this);
            this.tracks = ko.observableArray();
            this.url = ko.observable('');
            this.readingFiles = ko.observable(false);
            this.readProgressRange = ko.observable();
            this.readProgressDone = ko.observable();
            this._lastTrackColor = 0;
            this.trackListHeight = ko.observable(0);
            this.isPlacingPoint = false;
        },

        onAdd: function(map) {
            this.map = map;
            this.tracks.removeAll();
            var container = this._container = L.DomUtil.create('div', 'leaflet-control leaflet-control-tracklist');
            this._stopContainerEvents();

            container.innerHTML = `
                <div class="leaflet-control-button-toggle" data-bind="click: setExpanded"
                 title="Load, edit and save tracks"></div>
                <div class="leaflet-control-content">
                <div class="header">
                    <div class="hint">
                        GPX Ozi GoogleEarth ZIP YandexMaps GPSies
                    </div>
                    <div class="button-minimize" data-bind="click: setMinimized"></div>
                </div>
                <div class="inputs-row" data-bind="visible: !readingFiles()">
                    <a class="button add-track" title="New track" data-bind="click: function(){this.addNewTrack()}"></a
                    ><a class="button open-file" title="Open file" data-bind="click: loadFilesFromDisk"></a
                    ><input type="text" class="input-url" placeholder="Track URL"
                        data-bind="textInput: url, event: {keypress: onEnterPressedInInput, contextmenu: onFileInputRightClick}"
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
                    <tr data-bind="event: {contextmenu: $parent.showTrackMenu.bind($parent)}">
                        <td><input type="checkbox" class="visibility-switch" data-bind="checked: track.visible"></td>
                        <td><div class="color-sample" data-bind="style: {backgroundColor: $parent.colors[track.color()]}, click: $parent.onColorSelectorClicked.bind($parent)"></div></td>
                        <td><div class="track-name-wrapper"><div class="track-name" data-bind="text: track.name, attr: {title: track.name}, click: $parent.setViewToTrack.bind($parent)"></div></div></td>
                        <td><div class="button-length" data-bind="text: $parent.formatLength(track.length()), css: {'ticks-enabled': track.measureTicksShown}, click: $parent.switchMeasureTicksVisibility.bind($parent)"></div></td>
                        <td><div class="button-add-track" title="Add track segment" data-bind="click: $parent.addSegmentAndEdit.bind($parent, track)"></div></td>
                        <td><div class="button-add-point" title="Add point" data-bind="click: $parent.beginPointCreate.bind($parent, track)"></div></td>
                        <td><a class="track-text-button" title="Actions" data-bind="click: $parent.showTrackMenu.bind($parent)">&hellip;</a></td>
                    </tr>
                </tbody></table>
                </div>
                </div>
            `;

            ko.applyBindings(this, container);
            // FIXME: add onRemove method and unsubscribe
            L.DomEvent.addListener(map.getContainer(), 'drop', this.onFileDragDrop, this);
            L.DomEvent.addListener(map.getContainer(), 'dragover', this.onFileDraging, this);
            this.menu = new Contextmenu([
                    {text: 'Copy all tracks to clipboard', callback: this.copyAllTracks.bind(this)},
                    {text: 'Copy visible tracks to clipboard', callback: this.copyVisibleTracks.bind(this)},
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
            map.on('resize', this._setAdaptiveHeight, this);
            setTimeout(() => this._setAdaptiveHeight(), 0);
            return container;
        },

        onFileInputRightClick: function(_, e) {
            L.DomEvent.stopPropagation(e);
            return true;
        },

        _setAdaptiveHeight: function() {
            const mapHeight = this._map.getSize().y;
            let maxHeight;
            maxHeight = (mapHeight
            - this._container.offsetTop // controls above
            - (this._container.parentNode.offsetHeight - this._container.offsetTop - this._container.offsetHeight) //controls below
            - 105); // margin
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
            const files  = e.dataTransfer.files;
            if (files && files.length) {
                this.loadFilesFromFilesObject(files);
            }
        },

        onEnterPressedInInput: function(this_, e) {
            if (e.keyCode === 13) {
                this_.loadFilesFromUrl();
                L.DomEvent.stop(e);
            } else {
                return true;
            }
        },

        getTrackPolylines: function(track) {
            return track.feature.getLayers().filter(function(layer) {
                    return layer instanceof L.Polyline;
                }
            )
        },

        getTrackPoints: function(track) {
            return track.markers;
        },

        addNewTrack: function(name) {
            if (!name) {
                name = this.url().slice(0, 50);
                if (!name.length) {
                    name = 'New track';
                } else {
                    this.url('');
                }
            }
            var track = this.addTrack({name: name}),
                line = this.addTrackSegment(track);
            this.startEditTrackSegement(track, line);
            line.startDrawingLine();
            return track;
        },

        loadFilesFromFilesObject: function(files) {
            this.readProgressDone(undefined);
            this.readProgressRange(1);
            this.readingFiles(true);

            readFiles(files).then(function(fileDataArray) {
                    var geodataArray = fileDataArray.map(function(fileData) {
                            return parseGeoFile(fileData.filename, fileData.data);
                        }
                    ).reduce(function(prev, next) {
                            Array.prototype.push.apply(prev, next);
                            return prev;
                        }, []
                    );
                    this.addTracksFromGeodataArray(geodataArray);
                }.bind(this)
            );
        },

        loadFilesFromDisk: function() {
            logging.captureBreadcrumb({message: 'load track from disk'});
            selectFiles(true).then(this.loadFilesFromFilesObject.bind(this));
        },

        loadFilesFromUrl: function() {
            var url = this.url().trim();
            logging.captureBreadcrumb({message: 'load track from url', data: {url: url}});
            try {
                url = decodeURIComponent(url);
            } catch (e) {
            }
            var geodata;
            if (url.length > 0) {
                this.readingFiles(true);
                this.readProgressDone(undefined);
                this.readProgressRange(1);
                geodata = parseGeoFile('', url);
                if (geodata.length === 0 || geodata.length > 1 || geodata[0].error !== 'UNSUPPORTED') {
                    this.addTracksFromGeodataArray(geodata);
                } else {
                    var name = url
                        .split('#')[0]
                        .split('?')[0]
                        .replace(/\/*$/, '')
                        .split('/')
                        .pop();
                    let url_for_request, xhrOptions, preferNameFromFile;
                    if (isGpsiesUrl(url)) {
                        [url_for_request, xhrOptions] = gpsiesXhrOptions(url);
                        preferNameFromFile = true;
                    } else {
                        url_for_request = urlViaCorsProxy(url);
                        xhrOptions = {responseType: 'binarystring'};
                        preferNameFromFile = false;
                    }
                    fetch(url_for_request, xhrOptions)
                        .then(function(xhr) {
                                var geodata = parseGeoFile(name, xhr.responseBinaryText, preferNameFromFile);
                                this.addTracksFromGeodataArray(geodata);
                            }.bind(this),
                            function() {
                                var geodata = [{name: url, error: 'NETWORK'}];
                                this.addTracksFromGeodataArray(geodata);
                            }.bind(this)
                        );
                }
            }
            this.url('');
        },

        addTracksFromGeodataArray: function(geodata_array) {
            let hasData = false;
            var messages = [];
            if (geodata_array.length === 0) {
                messages.push('No tracks loaded');
            }
            geodata_array.forEach(function(geodata) {
                    var data_empty = !((geodata.tracks && geodata.tracks.length) || (geodata.points && geodata.points.length));

                    if (!data_empty) {
                        if (geodata.tracks) {
                            geodata.tracks = geodata.tracks.map(function(line) {
                                    return L.LineUtil.simplifyLatlngs(line, 360 / (1 << 24));
                                }
                            );
                        }
                        hasData = true;
                        this.addTrack(geodata);
                    }
                    var error_messages = {
                        'CORRUPT': 'File "{name}" is corrupt',
                        'UNSUPPORTED': 'File "{name}" has unsupported format or is badly corrupt',
                        'NETWORK': 'Could not download file from url "{name}"'
                    };
                    var message;
                    if (geodata.error) {
                        message = error_messages[geodata.error] || geodata.error;
                        if (data_empty) {
                            message += ', no data could be loaded';
                        } else {
                            message += ', loaded data can be invalid or incomplete';
                        }
                    }
                    if (message) {
                        message = L.Util.template(message, {name: geodata.name});
                        messages.push(message);
                    }
                }.bind(this)
            );
            this.readingFiles(false);
            if (messages.length) {
                logging.captureMessage('errors in loaded tracks', {extra: {message: messages.join('\n')}});
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
            this._markerLayer.updateMarkers(markers);
        },

        onTrackVisibilityChanged: function(track) {
            if (track.visible()) {
                this.map.addLayer(track.feature);
                this._markerLayer.addMarkers(track.markers);
            } else {
                this.map.removeLayer(track.feature);
                this.stopPlacingPoint();
                this._markerLayer.removeMarkers(track.markers);
            }
        },

        onTrackLengthChanged: function(track) {
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
            var lines = this.getTrackPolylines(track);
            var points = this.getTrackPoints(track);
            if (lines.length || points.length) {
                var bounds = L.latLngBounds([]);
                lines.forEach(function(l) {
                        if (l.getLatLngs().length > 1) {
                            bounds.extend(l.getBounds());
                        }
                    }
                );
                points.forEach(function(p) {
                        bounds.extend([p.latlng.lat, p.latlng.lng]);
                    }
                );
                if (bounds.isValid()) {
                    if (L.Browser.mobile) {
                        this.map.fitBounds(bounds);
                    } else {
                        this.map.flyToBounds(bounds);
                    }
                }

            }
        },

        attachColorSelector: function(track) {
            var items = this.colors.map(function(color, index) {
                    return {
                        text: '<div style="display: inline-block; vertical-align: middle; width: 50px; height: 0; border-top: 4px solid ' +
                        color + '"></div>',
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
                {text: 'Save as GPX', callback: this.saveTrackAsFile.bind(this, track, geoExporters.saveGpx, '.gpx')},
                {text: 'Save as KML', callback: this.saveTrackAsFile.bind(this, track, geoExporters.saveKml, '.kml')},
                {text: 'Copy link to clipboard', callback: this.copyLinkToClipboard.bind(this, track)},
            ];
            track._actionsMenu = new Contextmenu(items);
        },

        addSegmentAndEdit: function(track) {
            if (!track.visible()) {
                return;
            }
            this.stopPlacingPoint();
            var polyline = this.addTrackSegment(track, []);
            this.startEditTrackSegement(track, polyline);
            polyline.startDrawingLine(1);
        },

        duplicateTrack: function(track) {
            var segments = [], segment,
                line,
                lines = this.getTrackPolylines(track);
            for (var i = 0; i < lines.length; i++) {
                segment = [];
                line = lines[i].getLatLngs();
                for (var j = 0; j < line.length; j++) {
                    segment.push([line[j].lat, line[j].lng]);
                }
                segments.push(segment);
            }
            this.addTrack({name: track.name(), tracks: segments});
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
                this.startEditTrackSegement(trackSegment._parentTrack, newTrackSegment);
            }
        },

        reverseTrack: function(track) {
            var self = this;
            this.getTrackPolylines(track).forEach(function(trackSegment) {
                    self.reverseTrackSegment(trackSegment);
                }
            );
        },

        copyLinkToClipboard: function(track, mouseEvent) {
            this.stopActiveDraw();
            var s = this.trackToString(track, true);
            var url = window.location + '&nktk=' + s;
            copyToClipboard(url, mouseEvent);
        },

        saveTrackAsFile: function(track, exporter, extension) {
            this.stopActiveDraw();
            var lines = this.getTrackPolylines(track)
                .map(function(line) {
                        return line.getLatLngs();
                    }
                );
            var points = this.getTrackPoints(track);
            var name = track.name(),
                i = name.lastIndexOf('.');
            if (i > -1 && i >= name.length - 5) {
                name = name.slice(0, i);
            }

            if (lines.length === 0 && points.length === 0) {
                notify('Track is empty, nothing to save');
                return;
            }

            var fileText = exporter(lines, name, points);
            var filename = name + extension;
            saveAs(blobFromString(fileText), filename, true);
        },

        renameTrack: function(track) {
            var newName = prompt('Enter new name', track.name());
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

        stopActiveDraw: function() {
            if (this._editedLine) {
                this._editedLine.stopDrawingLine();
            }
        },

        stopEditLine: function() {
            if (this._editedLine) {
                this.stopLineJoinSelection();
                this._editedLine.stopEdit();
                this._editedLine = null;
            }
        },

        onTrackSegmentClick: function(track, trackSegment, e) {
            if (this.isPlacingPoint) {
                return;
            }
            if (this._lineJoinCursor) {
                L.DomEvent.stopPropagation(e);
                this.joinTrackSegments(trackSegment);
            } else {
                this.startEditTrackSegement(track, trackSegment);
                L.DomEvent.stopPropagation(e);
            }
        },

        startEditTrackSegement: function(track, polyline) {
            if (this._editedLine && this._editedLine !== polyline) {
                this.stopEditLine();
            }
            polyline.startEdit();
            this._editedLine = polyline;
            polyline.once('editend', function(e) {
                    setTimeout(this.onLineEditEnd.bind(this, e, track, polyline), 0);
                }.bind(this)
            );
            this.fire('startedit');
        },

        beginPointMove: function(marker) {
            const track = marker._parentTrack;
            if (!track.visible()) {
                return;
            }
            this.stopPlacingPoint();
            this.stopEditLine();
            L.DomUtil.addClass(this._map._container, 'leaflet-point-placing');
            this.isPlacingPoint = true;
            this.map.on('click', this.movePoint.bind(this, marker));
            L.DomEvent.on(document, 'keydown', this.stopPlacingPointOnEscPressed, this);
            this.fire('startedit');

        },

        beginPointCreate: function(track) {
            if (!track.visible()) {
                return;
            }
            this.stopPlacingPoint();
            this.stopEditLine();
            L.DomUtil.addClass(this._map._container, 'leaflet-point-placing');
            this.isPlacingPoint = true;
            this.map.on('click', this.createNewPoint.bind(this, track));
            L.DomEvent.on(document, 'keydown', this.stopPlacingPointOnEscPressed, this);
            this.fire('startedit');

        },

        movePoint: function(marker, e) {
            this._markerLayer.setMarkerPosition(marker, e.latlng);
            this.stopPlacingPoint();
        },

        createNewPoint: function(parentTrack, e) {
            if (!this.isPlacingPoint) {
                return;
            }
            parentTrack._pointAutoInc += 1;
            let name = parentTrack._pointAutoInc.toString();
            while (name.length < 3) {
                name = '0' + name;
            }
            const marker = this.addPoint(parentTrack, {name: name, lat: e.latlng.lat, lng: e.latlng.lng});
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
            this.isPlacingPoint = true;
            L.DomUtil.removeClass(this._map._container, 'leaflet-point-placing');
            L.DomEvent.off(document, 'keyup', this.stopPlacingPointOnEscPressed, this);
            this.map.off('click', this.placePoint, this);
        },

        joinTrackSegments: function(newSegment) {
            this.stopLineJoinSelection();
            var originalSegment = this._editedLine;
            var latlngs = originalSegment.getLatLngs(),
                latngs2 = newSegment.getLatLngs();
            if (this._lineJoinToStart === this._lineJoinFromStart) {
                latngs2.reverse();
            }
            if (this._lineJoinFromStart) {
                latlngs.unshift.apply(latlngs, latngs2);
            } else {
                latlngs.push.apply(latlngs, latngs2);
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

        onLineEditEnd: function(e, track, polyline) {
            if (polyline.getLatLngs().length < 2) {
                track.feature.removeLayer(polyline);
            }
            this.onTrackLengthChanged(track);
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
            polyline.on('click', this.onTrackSegmentClick.bind(this, track, polyline));
            polyline.on('nodeschanged', this.onTrackLengthChanged.bind(this, track));
            polyline.on('noderightclick', this.onNodeRightClickShowMenu, this);
            polyline.on('segmentrightclick', this.onSegmentRightClickShowMenu, this);
            polyline.on('mousemove', this.onMouseMoveOnSegmentUpdateLineJoinCursor, this);

            //polyline.on('editingstart', polyline.setMeasureTicksVisible.bind(polyline, false));
            //polyline.on('editingend', this.setTrackMeasureTicksVisibility.bind(this, track));
            track.feature.addLayer(polyline);
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

        startLineJoinSelection: function(e) {
            this.stopLineJoinSelection();
            this._editedLine.stopDrawingLine();
            this._lineJoinFromStart = (e.nodeIndex === 0);
            var p = this._editedLine.getLatLngs()[e.nodeIndex];
            p = [p.lat, p.lng];
            this._lineJoinCursor = L.polyline([p, e.mouseEvent.latlng], {
                    clickable: false,
                    color: 'red',
                    weight: 1.5,
                    opacity: 1,
                    dashArray: '7,7'
                }
            )
                .addTo(this.map);
            this.map.on('mousemove', this.onMouseMoveUpdateLineJoinCursor, this);
            this.map.on('click', this.stopLineJoinSelection, this);
            L.DomEvent.on(document, 'keyup', this.onEscPressedStopLineJoinSelection, this);
            var self = this;
            setTimeout(function() {
                    self._editedLine.preventStopEdit = true;
                }, 0
            );
        },

        onMouseMoveUpdateLineJoinCursor: function(e) {
            if (this._lineJoinCursor) {
                this._lineJoinCursor.getLatLngs().splice(1, 1, e.latlng);
                this._lineJoinCursor.redraw();
                this._lineJoinCursor.setStyle({color: 'red'});
            }
        },

        onMouseMoveOnSegmentUpdateLineJoinCursor: function(e) {
            if (!this._lineJoinCursor) {
                return;
            }
            var trackSegment = e.target,
                latlngs = trackSegment.getLatLngs(),
                distToStart = e.latlng.distanceTo(latlngs[0]),
                distToEnd = e.latlng.distanceTo(latlngs[latlngs.length - 1]);
            this._lineJoinToStart = (distToStart < distToEnd);
            var cursorEnd = this._lineJoinToStart ? latlngs[0] : latlngs[latlngs.length - 1];
            this._lineJoinCursor.setStyle({color: 'green'});
            this._lineJoinCursor.getLatLngs().splice(1, 1, cursorEnd);
            this._lineJoinCursor.redraw();
            L.DomEvent.stopPropagation(e);
        },

        onEscPressedStopLineJoinSelection: function(e) {
            if ('input' === e.target.tagName.toLowerCase()) {
                return;
            }
            switch (e.keyCode) {
                case 27:
                case 13:
                    this.stopLineJoinSelection();
                    L.DomEvent.stop(e);
                    break;
                default:
            }
        },

        stopLineJoinSelection: function() {
            if (this._lineJoinCursor) {
                this.map.off('mousemove', this.onMouseMoveUpdateLineJoinCursor, this);
                this.map.off('click', this.stopLineJoinSelection, this);
                L.DomEvent.off(document, 'keyup', this.onEscPressedStopLineJoinSelection, this);
                this.map.removeLayer(this._lineJoinCursor);
                this._lineJoinCursor = null;
                var self = this;
                setTimeout(function() {
                        self._editedLine.preventStopEdit = false;
                    }, 0
                );
            }
        },

        splitTrackSegment: function(trackSegment, nodeIndex, latlng) {
            var latlngs = trackSegment.getLatLngs();
            latlngs = latlngs.map(function(ll) {
                    return [ll.lat, ll.lng];
                }
            );
            var latlngs1 = latlngs.slice(0, nodeIndex + 1),
                latlngs2 = latlngs.slice(nodeIndex + 1);
            if (latlng) {
                var p = this.map.project(latlng),
                    p1 = this.map.project(latlngs[nodeIndex]),
                    p2 = this.map.project(latlngs[nodeIndex + 1]),
                    pnew = L.LineUtil.closestPointOnSegment(p, p1, p2);
                latlng = this.map.unproject(pnew);
                latlngs1.push(latlng);
                latlng = [latlng.lat, latlng.lng];
            } else {
                latlng = latlngs[nodeIndex];
            }
            latlngs2.unshift(latlng);
            this.deleteTrackSegment(trackSegment);
            var segment1 = this.addTrackSegment(trackSegment._parentTrack, latlngs1);
            this.addTrackSegment(trackSegment._parentTrack, latlngs2);
            this.startEditTrackSegement(trackSegment._parentTrack, segment1);
        },

        deleteTrackSegment: function(trackSegment) {
            trackSegment._parentTrack.feature.removeLayer(trackSegment);
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
                length: ko.observable('empty'),
                measureTicksShown: ko.observable(geodata.measureTicksShown || false),
                feature: L.featureGroup([]),
                _pointAutoInc: 0,
                markers: []
            };
            (geodata.tracks || []).forEach(this.addTrackSegment.bind(this, track));
            (geodata.points || []).forEach(this.addPoint.bind(this, track));

            this.tracks.push(track);

            track.visible.subscribe(this.onTrackVisibilityChanged.bind(this, track));
            track.measureTicksShown.subscribe(this.setTrackMeasureTicksVisibility.bind(this, track));
            track.color.subscribe(this.onTrackColorChanged.bind(this, track));

            //this.onTrackColorChanged(track);
            this.onTrackVisibilityChanged(track);
            this.attachColorSelector(track);
            this.attachActionsMenu(track);
            this.onTrackLengthChanged(track);
            return track;
        },


        setMarkerIcon: function(marker) {
            var symbol = 'marker',
                colorInd = marker._parentTrack.color() + 1,
                className = 'symbol-' + symbol + '-' + colorInd;
            marker.icon = iconFromBackgroundImage('track-waypoint ' + className);
        },

        setMarkerLabel: function(marker, label) {
            if (label.match(/\d{3,}/)) {
                var n = parseInt(label, 10);
                marker._parentTrack._pointAutoInc =
                    Math.max(n, marker._parentTrack._pointAutoInc | 0);
            }
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
                    {text: 'Rename', callback: this.renamePoint.bind(this, e.marker)},
                    {text: 'Move', callback: this.beginPointMove.bind(this, e.marker)},
                    {text: 'Delete', callback: this.removePoint.bind(this, e.marker)},
                ]
            ).show(e);
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
            var newLabel = prompt('New point name', marker.label);
            if (newLabel !== null) {
                this.setMarkerLabel(marker, newLabel);
                this._markerLayer.updateMarker(marker);
            }
        },

        removeTrack: function(track) {
            track.visible(false);
            this.tracks.remove(track);
            this.stopPlacingPoint();
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
                    var points = line.getLatLngs();
                    points = L.LineUtil.simplifyLatlngs(points, 360 / (1 << 24));
                    return points;
                }
            );
            return geoExporters.saveToString(lines, track.name(), track.color(), track.measureTicksShown(),
                this.getTrackPoints(track), forceVisible ? false : !track.visible()
            );
        },

        copyAllTracks: function(mouseEvent) {
            this.stopActiveDraw();
            var tracks = this.tracks(),
                serialized = [],
                i, track, s;
            for (i = 0; i < tracks.length; i++) {
                track = tracks[i];
                s = this.trackToString(track);
                serialized.push(s);
            }
            var url = window.location + '&nktk=' + serialized.join('/');
            copyToClipboard(url, mouseEvent);
        },

        copyVisibleTracks: function(mouseEvent) {
            this.stopActiveDraw();
            var tracks = this.tracks(),
                serialized = [],
                i, track, s;
            for (i = 0; i < tracks.length; i++) {
                track = tracks[i];
                if (track.visible()) {
                    s = this.trackToString(track);
                    serialized.push(s);
                }
            }
            var url = window.location + '&nktk=' + serialized.join('/');
            copyToClipboard(url, mouseEvent);
        },

        exportTracks: function(minTicksIntervalMeters) {
            var self = this;
            return this.tracks()
                .filter(function(track) {
                        return self.getTrackPolylines(track).length;
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
                        var capturedBounds = [[bounds.getSouth(), bounds.getWest()], [bounds.getNorth(), bounds.getEast()]];
                        return {
                            color: track.color(),
                            visible: track.visible(),
                            segments: capturedTrack,
                            bounds: capturedBounds,
                            measureTicksShown: track.measureTicksShown(),
                            measureTicks: [].concat.apply([], track.feature.getLayers().map(function(pl) {
                                    return pl.getTicksPositions(minTicksIntervalMeters);
                                }
                                )
                            )
                        };
                    }
                );
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
            return !!this.tracks().length;
        }
    }
);
