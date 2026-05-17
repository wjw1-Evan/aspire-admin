import { Platform } from 'react-native';
import { API_BASE_URL } from '../utils/constants';
import { getToken, clearToken } from './api';
import { tokenUtils } from '../utils/token';
import TokenRefreshManager from '../utils/tokenRefreshManager';
import { authService } from './authService';

type SseEventHandler = (data: any) => void;

interface SseEventHandlers {
  onStats?: SseEventHandler;
  onConnected?: SseEventHandler;
  onError?: (error: Error) => void;
}

interface ChatSseEventHandlers {
  onReceiveMessage?: SseEventHandler;
  onMessageChunk?: SseEventHandler;
  onMessageComplete?: SseEventHandler;
  onSessionUpdated?: SseEventHandler;
}

class SseService {
  private eventSource: EventSource | null = null;
  private xhr: XMLHttpRequest | null = null;
  private cleanup: (() => void) | null = null;
  private baseHandlers: SseEventHandlers | null = null;
  private chatHandlers: ChatSseEventHandlers | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connected = false;

  setChatHandlers(handlers: ChatSseEventHandlers) {
    this.chatHandlers = handlers;
  }

  clearChatHandlers() {
    this.chatHandlers = null;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async ensureConnected() {
    if (this.connected) return;
    this.connect(this.baseHandlers || {});
  }

  async connect(handlers: SseEventHandlers) {
    this.disconnect();
    this.baseHandlers = handlers;

    const isExpired = await tokenUtils.isTokenExpired();
    if (isExpired) {
      const result = await TokenRefreshManager.refresh();
      if (!result?.success) {
        await clearToken();
        await tokenUtils.clearAllTokens();
        authService.notifyLogout();
        return;
      }
    }

    const token = await getToken();
    if (!token) return;

    const url = `${API_BASE_URL}/api/stream/sse?token=${encodeURIComponent(token)}`;

    if (Platform.OS === 'web' && typeof EventSource !== 'undefined') {
      this.connectWeb(url);
    } else {
      this.connectRN(url);
    }
  }

  private getHandlers(): SseEventHandlers {
    return this.baseHandlers || {};
  }

  private connectWeb(url: string) {
    const es = new EventSource(url);
    this.eventSource = es;
    this.connected = true;
    const h = this.getHandlers();

    es.addEventListener('stats', (event) => {
      try {
        const data = JSON.parse(event.data);
        h.onStats?.(data.Statistics);
      } catch {}
    });

    es.addEventListener('connected', (event) => {
      try {
        this.connected = true;
        h.onConnected?.(JSON.parse(event.data));
      } catch {}
    });

    es.addEventListener('ReceiveMessage', (event) => {
      try {
        this.chatHandlers?.onReceiveMessage?.(JSON.parse(event.data));
      } catch {}
    });

    es.addEventListener('MessageChunk', (event) => {
      try {
        this.chatHandlers?.onMessageChunk?.(JSON.parse(event.data));
      } catch {}
    });

    es.addEventListener('MessageComplete', (event) => {
      try {
        this.chatHandlers?.onMessageComplete?.(JSON.parse(event.data));
      } catch {}
    });

    es.addEventListener('SessionUpdated', (event) => {
      try {
        this.chatHandlers?.onSessionUpdated?.(JSON.parse(event.data));
      } catch {}
    });

    es.onerror = () => {
      this.connected = false;
      h.onError?.(new Error('SSE connection error'));
      this.scheduleReconnect();
    };

    this.cleanup = () => {
      es.close();
      this.eventSource = null;
      this.connected = false;
    };
  }

  private connectRN(url: string) {
    let buffer = '';
    let lastIndex = 0;
    let timedOut = false;
    const h = this.getHandlers();

    const xhr = new XMLHttpRequest();
    this.xhr = xhr;
    xhr.open('GET', url);
    xhr.setRequestHeader('Accept', 'text/event-stream');
    xhr.setRequestHeader('Cache-Control', 'no-cache');

    const timeout = setTimeout(() => {
      timedOut = true;
      xhr.abort();
      this.xhr = null;
    }, 10000);

    xhr.onprogress = () => {
      clearTimeout(timeout);
      this.connected = true;
      const newData = xhr.responseText.substring(lastIndex);
      lastIndex = xhr.responseText.length;
      buffer += newData;

      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const eventStr of events) {
        this.parseSseEvent(eventStr);
      }
    };

    xhr.onerror = () => {
      clearTimeout(timeout);
      this.connected = false;
      if (!timedOut) {
        h.onError?.(new Error('SSE connection error'));
        this.scheduleReconnect();
      }
    };

    xhr.send();

    this.cleanup = () => {
      clearTimeout(timeout);
      xhr.abort();
      this.xhr = null;
      this.connected = false;
    };
  }

  private parseSseEvent(eventStr: string) {
    const lines = eventStr.split('\n');
    let eventType = '';
    let dataStr = '';
    const h = this.getHandlers();

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.substring(7);
      } else if (line.startsWith('data: ')) {
        dataStr = line.substring(6);
      }
    }

    if (!eventType || !dataStr) return;

    try {
      const data = JSON.parse(dataStr);
      if (eventType === 'stats') {
        h.onStats?.(data.Statistics);
      } else if (eventType === 'connected') {
        h.onConnected?.(data);
      } else if (eventType === 'ReceiveMessage') {
        this.chatHandlers?.onReceiveMessage?.(data);
      } else if (eventType === 'MessageChunk') {
        this.chatHandlers?.onMessageChunk?.(data);
      } else if (eventType === 'MessageComplete') {
        this.chatHandlers?.onMessageComplete?.(data);
      } else if (eventType === 'SessionUpdated') {
        this.chatHandlers?.onSessionUpdated?.(data);
      }
    } catch {}
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(this.baseHandlers || {});
    }, 5000);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.cleanup?.();
    this.cleanup = null;
    this.connected = false;
  }
}

export const sseService = new SseService();
