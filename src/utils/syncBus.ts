// Real-time synchronization bus across browser tabs, windows, and React contexts

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

export const broadcastGlobalSync = (type: string, data?: any) => {
  const payload = { type, data, timestamp: Date.now() };

  // 1. Send via BroadcastChannel for other tabs/windows
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

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcastMessage);
    }
    window.removeEventListener(LOCAL_EVENT_NAME, handleLocalEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
};
