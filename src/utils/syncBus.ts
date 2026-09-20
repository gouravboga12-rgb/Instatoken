// Real-time synchronization bus across browser tabs, windows, devices, and AWS backend

type SyncCallback = (event: { type: string; data?: any }) => void;

const CHANNEL_NAME = 'instatoken_global_channel';
const LOCAL_EVENT_NAME = 'instatoken_local_sync';

let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch (e) {
  console.warn('BroadcastChannel not supported or restricted', e);
}

export const formatTimeSlot = (timeStr?: string, defaultFallback: string = '09:00 AM'): string => {
  if (!timeStr) return defaultFallback;
  const clean = timeStr.trim();
  if (clean.toUpperCase().includes('AM') || clean.toUpperCase().includes('PM')) {
    return clean;
  }
  const [hStr, mStr] = clean.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr ? mStr.slice(0, 2) : '00';
  if (isNaN(h)) return defaultFallback;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const padH = h < 10 ? `0${h}` : `${h}`;
  return `${padH}:${m} ${ampm}`;
};

// ─── Remote API Cloud Synchronization ─────────────────────────────────────────

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

export const pushCloudSync = async (payload: {
  hospitals?: any[];
  hospitalDoctors?: Record<string, any[]>;
  hospitalProfiles?: Record<string, any>;
  hospitalDepartments?: Record<string, any[]>;
  tokens?: any[];
  appointments?: any[];
}) => {
  try {
    const res = await fetch(`${API_BASE}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    // Non-blocking fallback
    return null;
  }
};

export const fetchCloudSync = async () => {
  try {
    const res = await fetch(`${API_BASE}/sync`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
};

export const broadcastGlobalSync = (type: string, data?: any) => {
  const payload = { type, data, timestamp: Date.now() };

  // 1. Send via BroadcastChannel for other tabs/windows in same browser
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(payload);
    } catch (e) {
      console.warn('Error posting message to BroadcastChannel', e);
    }
  }

  // 2. Dispatch local custom event for current window/tab components
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent(LOCAL_EVENT_NAME, { detail: payload }));
    } catch (e) {
      console.warn('Error dispatching local sync event', e);
    }
  }

  // 3. Automatically push tokens/appointments changes to AWS EC2 Backend ONLY if valid new records exist
  if (typeof window !== 'undefined') {
    const isTokenEvent = ['TOKEN_BOOKED', 'HOSPITAL_TOKEN_CREATED', 'HOSPITAL_TOKENS_UPDATED'].includes(type);
    if (isTokenEvent && data) {
      const isDummyToken = (t: any) =>
        !t ||
        ['tok-101', 'tok-102', 'tok-103', 'tok-104', 'tok-105', 'tok-106', 'tok-107', 'tok-108', 'tok-98', 'tok-99', 'tok-100', 'tok-1001'].includes(t.id) ||
        ['Rahul Kumar', 'Priya Sharma', 'Mohan Reddy', 'Ananya Patel', 'Ramesh Kumar', 'Neha Singh', 'Mohan Das', 'Lakshmi Devi', 'Suresh Reddy', 'Kavitha Rao', 'Arun Verma', 'Guest Patient'].includes(t.patientName);

      const toSync: any = {};
      if (data.tokens && Array.isArray(data.tokens) && data.tokens.length > 0) {
        const clean = data.tokens.filter((t: any) => !isDummyToken(t));
        if (clean.length > 0) toSync.tokens = clean;
      }
      if (data.token && !isDummyToken(data.token)) {
        toSync.tokens = [data.token];
      }
      if (data.appointment && !isDummyToken(data.appointment)) {
        toSync.appointments = [data.appointment];
      }

      if (Object.keys(toSync).length > 0) {
        pushCloudSync(toSync).catch(() => {});
      }
    }
  }
};

// ─── Centralized Cloud Sync & Event Bus (Manual & Local Events) ────────────────

const subscribers = new Set<SyncCallback>();
let lastKnownServerTime = 0;
let isSyncInProgress = false;

export const runCloudSyncOnce = async (force: boolean = false): Promise<boolean> => {
  if (isSyncInProgress) return false;
  isSyncInProgress = true;

  try {
    const serverData = await fetchCloudSync();
    if (!serverData) return false;

    if (force || (serverData.lastUpdated && serverData.lastUpdated > lastKnownServerTime)) {
      lastKnownServerTime = serverData.lastUpdated || Date.now();

      let hasChanged = false;
      if (serverData.hospitalDoctors) {
        const targetHospId = Object.keys(serverData.hospitalDoctors)[0] || 'hosp-apollo';
        const docs = serverData.hospitalDoctors[targetHospId];
        if (docs && Array.isArray(docs) && docs.length > 0) {
          const currentDocs = localStorage.getItem('insta_hospital_doctors');
          if (force || JSON.stringify(docs) !== currentDocs) {
            localStorage.setItem('insta_hospital_doctors', JSON.stringify(docs));
            hasChanged = true;
          }
        }
      }

      if (serverData.hospitalProfiles) {
        const targetHospId = Object.keys(serverData.hospitalProfiles)[0] || 'hosp-apollo';
        const prof = serverData.hospitalProfiles[targetHospId];
        if (prof) {
          const currentProf = localStorage.getItem('insta_hospital_profile');
          if (force || JSON.stringify(prof) !== currentProf) {
            localStorage.setItem('insta_hospital_profile', JSON.stringify(prof));
            hasChanged = true;
          }
        }
      }

      if (serverData.hospitalDepartments) {
        const targetHospId = Object.keys(serverData.hospitalDepartments)[0] || 'hosp-apollo';
        const depts = serverData.hospitalDepartments[targetHospId];
        if (depts && Array.isArray(depts)) {
          const normalizedDepts = depts.map((d: any) => ({
            ...d,
            active: d.active !== false
          }));
          const currentDepts = localStorage.getItem('insta_hospital_departments');
          if (force || JSON.stringify(normalizedDepts) !== currentDepts) {
            localStorage.setItem('insta_hospital_departments', JSON.stringify(normalizedDepts));
            hasChanged = true;
          }
        }
      }

      if (serverData.hospitals && Array.isArray(serverData.hospitals) && serverData.hospitals.length > 0) {
        const currentHosp = localStorage.getItem('insta_hospitals');
        if (force || JSON.stringify(serverData.hospitals) !== currentHosp) {
          localStorage.setItem('insta_hospitals', JSON.stringify(serverData.hospitals));
          hasChanged = true;
        }
      }

      // Sync active broadcast notifications into patient notifications store
      if (serverData.broadcastNotifications && Array.isArray(serverData.broadcastNotifications)) {
        try {
          const currentNotifsRaw = localStorage.getItem('insta_notifications');
          const currentNotifs = currentNotifsRaw ? JSON.parse(currentNotifsRaw) : [];
          const readIds = new Set(currentNotifs.filter((n: any) => n.read).map((n: any) => n.id));

          const mappedBroadcasts = serverData.broadcastNotifications.map((b: any) => ({
            id: b.id,
            title: b.type === 'push' ? `Push Alert • ${b.hospitalName || 'Hospital'}` : `Hospital Alert • ${b.hospitalName || 'Hospital'}`,
            message: b.message,
            type: 'info' as const,
            timestamp: b.sentAt ? new Date(b.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: readIds.has(b.id)
          }));

          const nonBroadcastNotifs = currentNotifs.filter((n: any) => !serverData.broadcastNotifications.some((b: any) => b.id === n.id));
          const mergedNotifs = [...mappedBroadcasts, ...nonBroadcastNotifs];

          if (force || JSON.stringify(mergedNotifs) !== currentNotifsRaw) {
            localStorage.setItem('insta_notifications', JSON.stringify(mergedNotifs));
            hasChanged = true;
          }
        } catch (e) {
          console.warn('Error syncing broadcast notifications in runCloudSyncOnce:', e);
        }
      }

      // Sync hospital notifications per hospital
      if (serverData.hospitalNotifications && typeof serverData.hospitalNotifications === 'object') {
        try {
          Object.entries(serverData.hospitalNotifications).forEach(([hId, notifs]) => {
            if (Array.isArray(notifs)) {
              const key = `insta_hospital_notifications_${hId}`;
              const cur = localStorage.getItem(key);
              if (force || JSON.stringify(notifs) !== cur) {
                localStorage.setItem(key, JSON.stringify(notifs));
                hasChanged = true;
              }
            }
          });
        } catch (e) {}
      }

      if (hasChanged || force) {
        const eventPayload = { type: 'CLOUD_SYNC_UPDATED', data: serverData };
        subscribers.forEach(cb => {
          try {
            cb(eventPayload);
          } catch (e) {
            console.error('Error notifying sync subscriber', e);
          }
        });
      }
    }
    return true;
  } catch (e) {
    return false;
  } finally {
    isSyncInProgress = false;
  }
};

/**
 * Explicit manual refresh trigger callable from any Header button,
 * pull-to-refresh action, or on-scroll event.
 */
export const triggerManualSync = async (): Promise<boolean> => {
  return await runCloudSyncOnce(true);
};

const handleBroadcastMessage = (event: MessageEvent) => {
  if (event.data && event.data.type) {
    subscribers.forEach(cb => {
      try {
        cb(event.data);
      } catch (e) {}
    });
  }
};

const handleLocalEvent = (event: Event) => {
  const customEvent = event as CustomEvent;
  if (customEvent.detail && customEvent.detail.type) {
    subscribers.forEach(cb => {
      try {
        cb(customEvent.detail);
      } catch (e) {}
    });
  }
};

const handleStorageEvent = (event: StorageEvent) => {
  if (event.key && event.key.startsWith('insta_')) {
    const payload = { type: 'STORAGE_CHANGED', data: { key: event.key, newValue: event.newValue } };
    subscribers.forEach(cb => {
      try {
        cb(payload);
      } catch (e) {}
    });
  }
};

let listenersActive = false;
let initialSyncDone = false;

const startCentralListeners = () => {
  if (listenersActive || typeof window === 'undefined') return;
  listenersActive = true;

  // Single initial sync when the app first loads
  if (!initialSyncDone) {
    initialSyncDone = true;
    runCloudSyncOnce(false).catch(() => {});
  }

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcastMessage);
  }
  window.addEventListener(LOCAL_EVENT_NAME, handleLocalEvent);
  window.addEventListener('storage', handleStorageEvent);
};

const stopCentralListeners = () => {
  listenersActive = false;
  if (broadcastChannel) {
    broadcastChannel.removeEventListener('message', handleBroadcastMessage);
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener(LOCAL_EVENT_NAME, handleLocalEvent);
    window.removeEventListener('storage', handleStorageEvent);
  }
};

export const subscribeGlobalSync = (callback: SyncCallback) => {
  if (typeof window === 'undefined') return () => {};

  subscribers.add(callback);
  if (subscribers.size === 1) {
    startCentralListeners();
  }

  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0) {
      stopCentralListeners();
    }
  };
};

export const onGlobalSync = subscribeGlobalSync;

