// @ts-ignore
import io from 'socket.io-client/dist/socket.io.js';
import type { Socket } from 'socket.io-client';
import Config from '../constants/config';
import { storage } from '../utils/storage';

class SocketService {
  private socket: Socket | null = null;
  private listeners: { [event: string]: Function[] } = {};

  async connect(userId?: string) {
    if (this.socket) {
      this.socket.disconnect();
    }

    const token = await storage.getToken();

    const authPayload: any = {};
    if (token) {
      authPayload.token = token;
    }
    if (userId) {
      authPayload.xUserId = userId;
    }

    // Replace backend api suffix to get base server url
    const baseUrl = Config.API_BASE_URL.replace('/api', '');

    const socketInstance = io(baseUrl, {
      auth: authPayload,
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
    }) as Socket;

    this.socket = socketInstance;

    socketInstance.on('connect', () => {
      console.log('🔌 Socket connected successfully:', socketInstance.id);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error);
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
  }

  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);

    if (this.socket) {
      this.socket.on(event, callback as any);
    }
  }

  off(event: string, callback?: Function) {
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

  emit(event: string, data: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
