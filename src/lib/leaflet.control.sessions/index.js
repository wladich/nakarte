import ko from 'knockout';
import L from 'leaflet';

import {makeButton} from '~/lib/leaflet.control.commons';
import {bindHashStateReadOnly} from '~/lib/leaflet.hashState/hashState';
import {notify} from '~/lib/notifications';
import {
    EVENT_STORED_SESSIONS_CHANGED,
    EVENT_ACTIVE_SESSIONS_CHANGED,
    activeSessionsMonitor,
    sessionRepository,
    sessionState,
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

    initialize: function (options) {
        L.Control.prototype.initialize.call(this, options);
        this.sessionListWindowVisible = false;
        this.channel = new BroadcastChannel('session-control');
        this.channel.addEventListener('message', (e) => this.onChannelMessage(e));
        this.sessionListWindowModel = {
            activeSessions: ko.observableArray([]),
            inactiveSessions: ko.observableArray([]),
            visible: ko.observable(false),
            formatDateTime,
            maxTrackLines: 4,
            requestSwitchFocus: (sessionData) => this.requestSwitchFocus(sessionData.sessionId),
            openStoredSession: (sessionData) => this.openStoredSession(sessionData.sessionId),
        };
    },

    setupSessionListWindow: function () {
        // TODO: close window on button and esc
        const layout = `
            <div data-bind="visible: visible" class="leaflet-control-session-list-wrapper">
                <div class="leaflet-control-session-list-window">
                    <div class="leaflet-control-session-list-scrollbox">
                        <!-- ko if: activeSessions().length -->
                            <div class="leaflet-control-session-list-header">
                                Active sessions with tracks open in other tabs
                            </div>
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
                        <!-- /ko -->
                        
                        <!-- ko foreach: inactiveSessions -->
                            <div 
                                class="leaflet-control-session-list-item-inactive" 
                                data-bind="attr: {title: data.trackNames.join('\\n')}, click: $root.openStoredSession"
                            >
                                <div class="leaflet-control-session-list-item-date">
                                    Last opened at <span data-bind="text: $root.formatDateTime($data.atime)"></span>
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
        if (messageData.message === 'focus' && messageData.sessionId === sessionState.sessionId) {
            this.switchFocus();
        }
    },

    onActiveSessionsChange: function () {
        this.updateSessionLists();
    },

    onStoredSessionsChange: function () {
        this.updateSessionLists();
    },

    toggleSessionListsVisible: function () {
        this.sessionListWindowVisible = !this.sessionListWindowVisible;
        if (this.sessionListWindowVisible) {
            this.showSessionListWindow();
        } else {
            this.hideSessionListWindow();
        }
    },

    showSessionListWindow: function () {
        this.updateSessionLists();
        this.sessionListWindowModel.visible(true);
        activeSessionsMonitor.startMonitor();
    },

    hideSessionListWindow: function () {
        this.sessionListWindowModel.visible(false);
        activeSessionsMonitor.stopMonitor();
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

    openStoredSession: function (sessionId) {
        const sessionData = sessionRepository.getSessionState(sessionId);
        const {origin, pathname} = window.location;
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

    saveCurrentState: function (hash, tracks, trackNames) {
        if (trackNames.length) {
            const state = {hash, tracks, trackNames};
            sessionState.saveState(state);
        } else {
            sessionState.clearState();
        }
    },

    loadSessionFromHash: function (callback) {
        bindHashStateReadOnly('sid', (sessionId) => {
            if (!sessionId) {
                return;
            }
            const sessionState = sessionRepository.getSessionState(sessionId);
            if (!sessionState) {
                return;
            }
            callback(sessionState);
            sessionRepository.clearSessionState(sessionId);
        });
    },

    updateSessionLists: function () {
        // TODO: validate records
        const storedSessions = sessionRepository
            .listSessionStates()
            .filter((sess) => sess.sessionId !== sessionState.sessionId);
        const activeSessionIds = activeSessionsMonitor.getActiveSessions();
        const activeSessions = storedSessions.filter((sess) => activeSessionIds.includes(sess.sessionId));
        const inactiveSessions = storedSessions.filter((sess) => !activeSessionIds.includes(sess.sessionId));
        inactiveSessions.sort((sess1, sess2) => sess2.atime - sess1.atime);
        activeSessions.sort((sess1, sess2) => sess2.sessionId.localeCompare(sess1.sessionId));
        console.log('updateSessionLists', activeSessions, inactiveSessions);
        this.sessionListWindowModel.activeSessions(activeSessions);
        this.sessionListWindowModel.inactiveSessions(inactiveSessions);
    },
});

export {SessionsControl};
// TODO: fix loading empty tracks
