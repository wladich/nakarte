import ko from 'knockout';
import L from 'leaflet';

import {makeButton} from '~/lib/leaflet.control.commons';
import {bindHashStateReadOnly} from '~/lib/leaflet.hashState/hashState';
import {notify} from '~/lib/notifications';
import {
    activeSessionsMonitor,
    EVENT_ACTIVE_SESSIONS_CHANGED,
    EVENT_STORED_SESSIONS_CHANGED,
    session,
    sessionRepository,
} from '~/lib/session-state';

import './style.css';

function formatDateTime(ts) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const date = new Date(ts);

    const month = months[date.getMonth()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${month} ${date.getDate()} ${date.getFullYear()} ${hours}:${minutes}:${seconds}`;
}

const SessionsControl = L.Control.extend({
    includes: L.Mixin.Events,

    initialize: function (trackListControl, options) {
        L.Control.prototype.initialize.call(this, options);
        this.trackListControl = trackListControl;
        this.sessionListWindowVisible = false;
        this.loadingState = false;
        this.channel = new BroadcastChannel('session-control');
        this.channel.addEventListener('message', (e) => this.onChannelMessage(e));
        this.saveCurrentState = L.Util.throttle(this.saveCurrentStateImmediate, 1000, this);
        this.trackListControl.on('trackschanged', () => this.onCurrentStateChange());
        window.addEventListener('hashchange', () => this.onCurrentStateChange());
        window.addEventListener('beforeunload', () => this.saveCurrentStateImmediate());

        this.sessionListWindowModel = {
            activeSessions: ko.observableArray([]),
            inactiveSessions: ko.observableArray([]),
            visible: ko.observable(false),
            formatDateTime,
            maxTrackLines: 4,
            requestSwitchFocus: (sessionData) => this.requestSwitchFocus(sessionData.sessionId),
            openStoredSession: (sessionData) => this.openStoredSession(sessionData.sessionId),
            closeWindow: () => this.hideSessionListWindow(),
        };
        // TODO: import old states
    },

    setupSessionListWindow: function () {
        const layout = `
            <div data-bind="visible: visible" class="leaflet-control-session-list-wrapper">
                <div class="leaflet-control-session-list-window">
                    <div class="leaflet-control-session-list-window-header">
                        <div class="button-close" data-bind="click: closeWindow"></div>
                    </div>
                    <div class="leaflet-control-session-list-scrollbox">
                        <!-- ko if: activeSessions().length -->
                            <div class="leaflet-control-session-list-header">
                                Active sessions with tracks in other tabs
                            </div>
                            <div class="leaflet-control-session-list-header-info">Click to switch tab</div>
                        <!-- /ko -->
                        <!-- ko foreach: activeSessions -->
                            <div 
                                class="leaflet-control-session-list-item-active" 
                                data-bind="attr: {title: data.trackNames.join('\\n')}, click: $root.requestSwitchFocus"
                            >
                                <!-- ko foreach: data.trackNames.length <= $root.maxTrackLines 
                                    ? data.trackNames 
                                    : data.trackNames.slice(0, $root.maxTrackLines - 1) 
                                -->
                                    <div class="leaflet-control-session-list-item-track" data-bind="text: $data"></div>
                                <!-- /ko -->                 
                                <!-- ko if: data.trackNames.length > $root.maxTrackLines -->
                                    <div>
                                        &hellip;total <span data-bind="text: data.trackNames.length"></span>
                                        tracks&hellip;
                                    </div>
                                <!-- /ko -->
                            </div>
                        <!-- /ko -->

                        <!-- ko if: inactiveSessions().length -->
                            <div class="leaflet-control-session-list-header">Recently opened sessions with tracks</div>
                            <div class="leaflet-control-session-list-header-info">Click to open in new tab</div>
                        <!-- /ko -->
                        
                        <!-- ko foreach: inactiveSessions -->
                            <div 
                                class="leaflet-control-session-list-item-inactive" 
                                data-bind="attr: {title: data.trackNames.join('\\n')}, click: $root.openStoredSession"
                            >
                                <div class="leaflet-control-session-list-item-date">
                                    Last used at <span data-bind="text: $root.formatDateTime($data.mtime)"></span>
                                </div>
                                <!-- ko foreach: data.trackNames.length <= $root.maxTrackLines 
                                    ? data.trackNames 
                                    : data.trackNames.slice(0, $root.maxTrackLines - 1) 
                                -->
                                    <div class="leaflet-control-session-list-item-track" data-bind="text: $data"></div>
                                <!-- /ko -->                 
                                <!-- ko if: data.trackNames.length > $root.maxTrackLines -->
                                    <div>
                                        &hellip;total <span data-bind="text: data.trackNames.length"></span>
                                        tracks&hellip;
                                    </div>
                                <!-- /ko -->

                            </div>
                        <!-- /ko -->
                        <!-- ko if: !activeSessions().length && !inactiveSessions().length -->
                        <div class="leaflet-control-session-list-header">No recent sessions with tracks</div>
                        <!-- /ko -->
                    </div>
                </div>
            </div>
        `;

        const container = L.DomUtil.create('div');
        container.innerHTML = layout;
        const sessionListWindow = container.querySelector('.leaflet-control-session-list-window');
        L.DomEvent.disableClickPropagation(sessionListWindow);
        L.DomEvent.disableScrollPropagation(sessionListWindow);
        ko.applyBindings(this.sessionListWindowModel, container);
        this._map._controlContainer.appendChild(container);
    },

    onAdd: function () {
        const {container, link} = makeButton(null, 'Recent sessions');
        L.DomEvent.on(link, 'click', () => this.toggleSessionListsVisible());
        // TODO: setup/teardown events on window show/hide
        document.addEventListener(EVENT_ACTIVE_SESSIONS_CHANGED, (e) => this.onActiveSessionsChange(e));
        document.addEventListener(EVENT_STORED_SESSIONS_CHANGED, (e) => this.onStoredSessionsChange(e));
        this.setupSessionListWindow();
        return container;
    },

    onChannelMessage: function (e) {
        const messageData = e.data;
        if (messageData.message === 'focus' && messageData.sessionId === session.sessionId) {
            this.switchFocus();
        }
    },

    onActiveSessionsChange: function () {
        this.updateSessionLists();
    },

    onStoredSessionsChange: function () {
        this.updateSessionLists();
    },

    onCurrentStateChange: function () {
        if (!this.loadingState) {
            this.saveCurrentState();
        }
    },

    toggleSessionListsVisible: function () {
        if (this.sessionListWindowVisible) {
            this.hideSessionListWindow();
        } else {
            this.showSessionListWindow();
        }
    },

    showSessionListWindow: function () {
        if (this.sessionListWindowVisible) {
            return;
        }
        this.sessionListWindowVisible = true;
        this.updateSessionLists();
        this.sessionListWindowModel.visible(true);
        activeSessionsMonitor.startMonitor();
        L.DomEvent.on(
            window,
            {
                mousedown: this.hideSessionListWindow,
                touchstart: this.hideSessionListWindow,
                keydown: this.onKeyDown,
            },
            this
        );
    },

    hideSessionListWindow: function () {
        if (!this.sessionListWindowVisible) {
            return;
        }
        this.sessionListWindowVisible = false;
        this.sessionListWindowModel.visible(false);
        activeSessionsMonitor.stopMonitor();
        L.DomEvent.off(
            window,
            {
                mousedown: this.hideSessionListWindow,
                touchstart: this.hideSessionListWindow,
                keydown: this.onKeyDown,
            },
            this
        );
    },

    onKeyDown: function (e) {
        if (e.keyCode === 27) {
            this.hideSessionListWindow();
        }
    },

    requestSwitchFocus: async function (sessionId) {
        if (!window.Notification) {
            notify('Can not switch to another window, your browser does not support notifications.');
            return;
        }
        if (window.Notification.permission !== 'granted') {
            notify('Please allow notifications to be able to switch to other sessions.');
            await Notification.requestPermission();
        }
        this.channel.postMessage({message: 'focus', sessionId});
    },

    openStoredSession: async function (sessionId) {
        const sessionData = await sessionRepository.getSessionState(sessionId);
        const {origin, pathname} = window.location; // eslint-disable-line no-shadow
        const url = `${origin}${pathname}${sessionData.hash}&sid=${sessionId}`;
        window.open(url);
    },

    switchFocus: function () {
        const notification = new Notification('Switch nakarte.me window', {
            body: 'Click here to switch nakarte.me window.',
        });
        notification.addEventListener('click', () => {
            parent.focus();
            window.focus();
            notification.close();
        });
    },

    saveCurrentStateImmediate: function () {
        const tracks = this.trackListControl.tracks();
        if (!tracks.length) {
            session.clearState();
            return;
        }
        const {hash} = window.location;
        const trackNames = tracks.map((track) => track.name());
        const tracksSerialized = this.trackListControl.serializeTracks(tracks);
        session.saveState({hash, tracks: tracksSerialized, trackNames});
    },

    loadSession: async function () {
        const sessionSavedTracks = (await session.loadState())?.tracks;
        if (sessionSavedTracks) {
            this.loadingState = true;
            try {
                this.trackListControl.loadTracksFromString(sessionSavedTracks);
            } finally {
                this.loadingState = false;
            }
        }
        this.saveCurrentStateImmediate();
    },

    consumeSessionFromHash: function () {
        bindHashStateReadOnly(
            'sid',
            async (params) => {
                if (!params) {
                    return;
                }
                const sessionId = params[0];
                const sessionState = await sessionRepository.getSessionState(sessionId);
                if (!sessionState) {
                    return;
                }
                this.loadingState = true;
                try {
                    this.trackListControl.loadTracksFromString(sessionState.tracks);
                } finally {
                    this.loadingState = false;
                }
                this.saveCurrentStateImmediate();
                await sessionRepository.clearSessionState(sessionId);
            },
            true
        );
    },

    updateSessionLists: async function () {
        // TODO: validate records
        const storedSessions = (await sessionRepository.listSessionStates()).filter(
            (sess) => sess.sessionId !== session.sessionId
        );
        const activeSessionIds = activeSessionsMonitor.getActiveSessions();
        const activeSessions = storedSessions.filter((sess) => activeSessionIds.includes(sess.sessionId));
        const inactiveSessions = storedSessions.filter((sess) => !activeSessionIds.includes(sess.sessionId));
        inactiveSessions.sort((sess1, sess2) => sess2.mtime - sess1.mtime);
        activeSessions.sort((sess1, sess2) => sess2.sessionId.localeCompare(sess1.sessionId));
        this.sessionListWindowModel.activeSessions(activeSessions);
        this.sessionListWindowModel.inactiveSessions(inactiveSessions);
    },
});
export {SessionsControl};
// TODO: fix loading empty tracks
