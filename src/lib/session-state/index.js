import {openDB} from 'idb';

const EVENT_STORED_SESSIONS_CHANGED = 'storedsessionschanged';
const EVENT_ACTIVE_SESSIONS_CHANGED = 'activesessionschanged';

class SessionRepository {
    static DB_NAME = 'sessions';
    static STORE_NAME = 'sessionData';
    static MAX_HISTORY_ENTRIES = 100;
    static MESSAGE_SESSION_CHANGED = 'sessionchanged';

    constructor() {
        this.channel = new BroadcastChannel('sessionrepository');
        this.channel.addEventListener('message', (e) => this.onChannelMessage(e));
        this.dbPromise = openDB(SessionRepository.DB_NAME, 1, {
            upgrade(db) {
                const store = db.createObjectStore(SessionRepository.STORE_NAME, {keyPath: 'sessionId'});
                store.createIndex('mtime', 'mtime', {unique: false});
            },
        });
    }

    onChannelMessage(e) {
        if (e.data.message === SessionRepository.MESSAGE_SESSION_CHANGED) {
            window.dispatchEvent(new Event(EVENT_STORED_SESSIONS_CHANGED));
        }
    }

    async listSessionStates() {
        const db = await this.dbPromise;
        return db.getAll(SessionRepository.STORE_NAME);
    }

    async getSessionState(sessionId) {
        const db = await this.dbPromise;
        const record = await db.get(SessionRepository.STORE_NAME, sessionId);
        return record?.data;
    }

    async pruneOldSessions() {
        const db = await this.dbPromise;
        const tx = db.transaction(SessionRepository.STORE_NAME, 'readwrite');
        const recordsCount = await tx.store.count();
        const recordsCountToDelete = recordsCount - SessionRepository.MAX_HISTORY_ENTRIES;
        if (recordsCountToDelete > 0) {
            let cursor = await tx.store.index('mtime').openCursor();
            for (let i = 0; i < recordsCountToDelete; i++) {
                if (!cursor) {
                    break;
                }
                await cursor.delete();
                cursor = await cursor.continue();
            }
        }
    }

    async setSessionState(sessionId, data) {
        const db = await this.dbPromise;
        await db.put(SessionRepository.STORE_NAME, {
            sessionId,
            mtime: Date.now(),
            data,
        });
        this.broadcastStorageChanged();
        this.pruneOldSessions();
    }

    async clearSessionState(sessionId) {
        await (await this.dbPromise).delete(SessionRepository.STORE_NAME, sessionId);
        this.broadcastStorageChanged();
    }

    broadcastStorageChanged() {
        this.channel.postMessage({message: SessionRepository.MESSAGE_SESSION_CHANGED});
    }
}

const sessionRepository = new SessionRepository();

class Session {
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

    async loadState() {
        return sessionRepository.getSessionState(this.sessionId);
    }

    async saveState(data) {
        sessionRepository.setSessionState(this.sessionId, data);
    }

    async clearState() {
        sessionRepository.clearSessionState(this.sessionId);
    }
}

const session = new Session();

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
            sessionId: session.sessionId,
        });
    }

    broadcastSessionEnd() {
        this.channel.postMessage({
            message: ActiveSessionsMonitor.MESSAGE_CLOSE_SESSION,
            sessionId: session.sessionId,
        });
    }

    notifyActiveSessionsChanged() {
        window.dispatchEvent(new Event(EVENT_ACTIVE_SESSIONS_CHANGED));
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
    session,
    sessionRepository,
    activeSessionsMonitor,
    EVENT_STORED_SESSIONS_CHANGED,
    EVENT_ACTIVE_SESSIONS_CHANGED,
};
