import safeLocalStorage from '~/lib/safe-localstorage';

const EVENT_STORED_SESSIONS_CHANGED = 'storedsessionschanged';
const EVENT_ACTIVE_SESSIONS_CHANGED = 'activesessionschanged';

class SessionRepository {
    static STORAGE_KEY_PREFIX = 'session_';
    static MAX_HISTORY_ENTRIES = 10;

    constructor() {
        window.addEventListener('storage', (e) => this.onStorageChanged(e));
    }

    getStorageKey(sessionId) {
        return SessionRepository.STORAGE_KEY_PREFIX + sessionId;
    }

    onStorageChanged(e) {
        if (e.key === null || e.key.startsWith(SessionRepository.STORAGE_KEY_PREFIX)) {
            document.dispatchEvent(new Event(EVENT_STORED_SESSIONS_CHANGED));
        }
    }

    listSessionStates() {
        return Object.entries(safeLocalStorage)
            .filter(([key, _unused]) => key.startsWith(SessionRepository.STORAGE_KEY_PREFIX))
            .map(([_unused, value]) => {
                try {
                    return JSON.parse(value);
                } catch {
                    return null
                }
            })
            .filter((it) => !!it);
    }

    getSessionState(sessionId) {
        const storageKey = this.getStorageKey(sessionId);
        const sessionRecord = safeLocalStorage[storageKey];
        if (!sessionRecord) {
            return null;
        }
        let data;
        try {
            data = JSON.parse(sessionRecord)?.data;
        } catch {
            return null;
        }
        return data;
    }

    setSessionState(sessionId, data) {
        // TODO: remove old entries if total count > MAX_HISTORY_ENTRIES
        const storageKey = this.getStorageKey(sessionId);
        safeLocalStorage[storageKey] = JSON.stringify({
            mtime: Date.now(),
            sessionId,
            data,
        });
    }

    clearSessionState(sessionId) {
        const storageKey = this.getStorageKey(sessionId);
        delete safeLocalStorage[storageKey];
    }
}

const sessionRepository = new SessionRepository();

class SessionState {
    constructor() {
        let sessionId = window.history.state?.sessionId;
        if (!sessionId) {
            sessionId = this.generateSessionId();
            window.history.replaceState({sessionId}, '');
        }
        this.sessionId = sessionId;
        window.addEventListener('popstate', () => window.history.replaceState({sessionId}, ''));
    }

    generateSessionId() {
        return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2);
    }

    loadState() {
        return sessionRepository.getSessionState(this.sessionId);
    }

    saveState(data) {
        sessionRepository.setSessionState(this.sessionId, data);
    }

    clearState() {
        sessionRepository.clearSessionState(this.sessionId);
    }
}

const sessionState = new SessionState();

class ActiveSessionsMonitor {
    static MESSAGE_REQUEST_SESSION = 'requestsessions';
    static MESSAGE_ACTIVE_SESSION = 'activesession';
    static MESSAGE_CLOSE_SESSION = 'closesession';

    constructor() {
        this.channel = new BroadcastChannel('sessions');
        this.channel.addEventListener('message', (e) => this.onChannelMessage(e));
        this._activeSessions = {};
        this.broadcastActiveSession();
        window.addEventListener('beforeunload', () => this.broadcastSessionEnd());
        this.monitorRunning = false;
    }

    onChannelMessage(e) {
        switch (e.data.message) {
            case ActiveSessionsMonitor.MESSAGE_REQUEST_SESSION:
                this.broadcastActiveSession();
                break;
            case ActiveSessionsMonitor.MESSAGE_ACTIVE_SESSION:
                if (!this.monitorRunning) {
                    break;
                }
                this._activeSessions[e.data.sessionId] = true;
                this.notifyActiveSessionsChanged();
                break;
            case ActiveSessionsMonitor.MESSAGE_CLOSE_SESSION:
                if (!this.monitorRunning) {
                    break;
                }
                delete this._activeSessions[e.data.sessionId];
                this.notifyActiveSessionsChanged();
                break;
            default:
        }
    }

    startMonitor() {
        this._activeSessions = {};
        this.monitorRunning = true;
        this.requestActiveSessions();
    }

    stopMonitor() {
        this.monitorRunning = false;
        this._activeSessions = {};
    }

    broadcastActiveSession() {
        this.channel.postMessage({
            message: ActiveSessionsMonitor.MESSAGE_ACTIVE_SESSION,
            sessionId: sessionState.sessionId,
        });
    }

    broadcastSessionEnd() {
        this.channel.postMessage({
            message: ActiveSessionsMonitor.MESSAGE_CLOSE_SESSION,
            sessionId: sessionState.sessionId,
        });
    }

    notifyActiveSessionsChanged() {
        document.dispatchEvent(new Event(EVENT_ACTIVE_SESSIONS_CHANGED));
    }

    requestActiveSessions() {
        this.channel.postMessage({message: ActiveSessionsMonitor.MESSAGE_REQUEST_SESSION});
    }

    getActiveSessions() {
        return Object.keys(this._activeSessions);
    }
}

const activeSessionsMonitor = new ActiveSessionsMonitor();

export {
    sessionState,
    sessionRepository,
    activeSessionsMonitor,
    EVENT_STORED_SESSIONS_CHANGED,
    EVENT_ACTIVE_SESSIONS_CHANGED,
};
