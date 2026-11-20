import React, { createContext, useContext, useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { SOCKET_URL } from '../api/client';
import * as Haptics from 'expo-haptics';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  activeCallingToken: any | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  activeCallingToken: null,
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [activeCallingToken, setActiveCallingToken] = useState<any | null>(null);

  useEffect(() => {
    const s = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    s.on('connect', () => {
      console.log('Connected to InstaToken Live Socket');
      setConnected(true);
    });

    s.on('disconnect', () => {
      console.log('Disconnected from InstaToken Socket');
      setConnected(false);
    });

    s.on('TOKEN_CALLED', (data: any) => {
      console.log('📢 Realtime Token Called:', data);
      setActiveCallingToken(data);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        // ignore
      }
    });

    s.on('QUEUE_ADVANCED', (data: any) => {
      console.log('📢 Queue Advanced:', data);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected, activeCallingToken }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
