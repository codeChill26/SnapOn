// @ts-ignore
import io from 'socket.io-client/dist/socket.io.js';
import type { Socket } from 'socket.io-client';
import Config from '../constants/config';
import { storage } from '../utils/storage';
import { detectBackend } from '../utils/backendDetector';

type SocketCallback<T = unknown> = (payload: T) => void;

class SocketService {
  private socket: Socket | null = null;
  private listeners: Record<string, SocketCallback[]> = {};

  async connect(userId?: string) {
    if (this.socket) {
      this.socket.disconnect();
    }

    const token = await storage.getToken();

    const authPayload: { token?: string; xUserId?: string } = {};
    if (token) {
      authPayload.token = token;
    }
    if (userId) {
      authPayload.xUserId = userId;
    }

    // Resolve current active backend base URL dynamically
    const currentApiUrl = await detectBackend();
    const baseUrl = currentApiUrl.replace(/\/api\/?$/, '');

    const socketInstance = io(baseUrl, {
      auth: authPayload,
      transports: ['polling', 'websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
      timeout: 10000,
    }) as Socket;

    this.socket = socketInstance;

    socketInstance.on('connect', () => {
      if (__DEV__) {
        console.log('✅ Socket connected successfully:', socketInstance.id);
      }
    });

    socketInstance.on('disconnect', (reason) => {
      if (__DEV__) {
        console.log('Socket disconnected:', reason);
      }
    });

    socketInstance.on('connect_error', (error) => {
      if (__DEV__) {
        console.warn('Socket connection error:', error.message || error);
      }
    });

    // Re-register all existing event listeners on the new socket
    Object.keys(this.listeners).forEach((event) => {
      this.listeners[event].forEach((cb) => {
        this.socket?.on(event, cb as any);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners = {};
  }

  on<T = unknown>(event: string, callback: SocketCallback<T>) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    
    // Prevent duplicate listeners
    if (this.listeners[event].includes(callback as SocketCallback)) {
      return;
    }
    
    this.listeners[event].push(callback as SocketCallback);

    if (this.socket) {
      this.socket.on(event, callback as any);
    }
  }

  off<T = unknown>(event: string, callback?: SocketCallback<T>) {
    if (!this.listeners[event]) return;

    if (callback) {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
      if (this.socket) {
        this.socket.off(event, callback as any);
      }
    } else {
      delete this.listeners[event];
      if (this.socket) {
        this.socket.off(event);
      }
    }
  }

  emit(event: string, data?: unknown) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
