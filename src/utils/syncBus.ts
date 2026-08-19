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

// ─── Remote API Cloud Synchronization ─────────────────────────────────────────

const API_BASE = '/api';

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

  // 3. Automatically push changes to AWS EC2 Backend
  if (typeof window !== 'undefined') {
    const savedHospitals = localStorage.getItem('insta_hospitals');
    const savedHDocs = localStorage.getItem('insta_hospital_doctors');
    const savedHProfile = localStorage.getItem('insta_hospital_profile');
    const savedHDepts = localStorage.getItem('insta_hospital_departments');
    const savedHToks = localStorage.getItem('insta_hospital_tokens');
    const savedAppts = localStorage.getItem('insta_appointments');

    const targetHospId = savedHProfile ? (JSON.parse(savedHProfile).id || 'hosp-apollo') : 'hosp-apollo';

    pushCloudSync({
      hospitals: savedHospitals ? JSON.parse(savedHospitals) : undefined,
      hospitalDoctors: savedHDocs ? { [targetHospId]: JSON.parse(savedHDocs) } : undefined,
      hospitalProfiles: savedHProfile ? { [targetHospId]: JSON.parse(savedHProfile) } : undefined,
      hospitalDepartments: savedHDepts ? { [targetHospId]: JSON.parse(savedHDepts) } : undefined,
      tokens: savedHToks ? JSON.parse(savedHToks) : undefined,
      appointments: savedAppts ? JSON.parse(savedAppts) : undefined,
    }).catch(() => {});
  }
};

export const subscribeGlobalSync = (callback: SyncCallback) => {
  if (typeof window === 'undefined') return () => {};

  const handleBroadcastMessage = (event: MessageEvent) => {
    if (event.data && event.data.type) {
      callback(event.data);
    }
  };

  const handleLocalEvent = (event: Event) => {
    const customEvent = event as CustomEvent;
    if (customEvent.detail && customEvent.detail.type) {
      callback(customEvent.detail);
    }
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key && event.key.startsWith('insta_')) {
      callback({ type: 'STORAGE_CHANGED', data: { key: event.key, newValue: event.newValue } });
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcastMessage);
  }
  window.addEventListener(LOCAL_EVENT_NAME, handleLocalEvent);
  window.addEventListener('storage', handleStorageEvent);

  // 4. Background Poller to sync with AWS backend every 4 seconds (for other devices/browsers)
  let lastKnownServerTime = 0;
  const pollInterval = setInterval(async () => {
    try {
      const serverData = await fetchCloudSync();
      if (serverData && serverData.lastUpdated && serverData.lastUpdated > lastKnownServerTime) {
        lastKnownServerTime = serverData.lastUpdated;

        let hasChanged = false;
        if (serverData.hospitalDoctors) {
          const targetHospId = Object.keys(serverData.hospitalDoctors)[0] || 'hosp-apollo';
          const docs = serverData.hospitalDoctors[targetHospId];
          if (docs && Array.isArray(docs) && docs.length > 0) {
            const currentDocs = localStorage.getItem('insta_hospital_doctors');
            if (JSON.stringify(docs) !== currentDocs) {
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
            if (JSON.stringify(prof) !== currentProf) {
              localStorage.setItem('insta_hospital_profile', JSON.stringify(prof));
              hasChanged = true;
            }
          }
        }

        if (serverData.hospitalDepartments) {
          const targetHospId = Object.keys(serverData.hospitalDepartments)[0] || 'hosp-apollo';
          const depts = serverData.hospitalDepartments[targetHospId];
          if (depts && Array.isArray(depts)) {
            const currentDepts = localStorage.getItem('insta_hospital_departments');
            if (JSON.stringify(depts) !== currentDepts) {
              localStorage.setItem('insta_hospital_departments', JSON.stringify(depts));
              hasChanged = true;
            }
          }
        }

        if (serverData.hospitals && Array.isArray(serverData.hospitals) && serverData.hospitals.length > 0) {
          const currentHosp = localStorage.getItem('insta_hospitals');
          if (JSON.stringify(serverData.hospitals) !== currentHosp) {
            localStorage.setItem('insta_hospitals', JSON.stringify(serverData.hospitals));
            hasChanged = true;
          }
        }

        if (hasChanged) {
          callback({ type: 'CLOUD_SYNC_UPDATED', data: serverData });
        }
      }
    } catch (e) {}
  }, 3500);

  return () => {
    clearInterval(pollInterval);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcastMessage);
    }
    window.removeEventListener(LOCAL_EVENT_NAME, handleLocalEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
};
