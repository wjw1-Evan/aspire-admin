import { Platform } from 'react-native';
import { API_BASE_URL } from '../utils/constants';
import { getToken } from './api';

type SseEventHandler = (data: any) => void;

interface SseEventHandlers {
  onStats?: SseEventHandler;
  onConnected?: SseEventHandler;
  onError?: (error: Error) => void;
}

class SseService {
  private eventSource: EventSource | null = null;
  private xhr: XMLHttpRequest | null = null;
  private cleanup: (() => void) | null = null;

  async connect(handlers: SseEventHandlers) {
    this.disconnect();
    const token = await getToken();
    if (!token) return;

    const url = `${API_BASE_URL}/api/stream/sse?token=${encodeURIComponent(token)}`;

    if (Platform.OS === 'web' && typeof EventSource !== 'undefined') {
      this.connectWeb(url, handlers);
    } else {
      this.connectRN(url, handlers);
    }
  }

  private connectWeb(url: string, handlers: SseEventHandlers) {
    const es = new EventSource(url);
    this.eventSource = es;

    es.addEventListener('stats', (event) => {
      try {
        const data = JSON.parse(event.data);
        handlers.onStats?.(data.Statistics);
      } catch {}
    });

    es.addEventListener('connected', (event) => {
      try {
        handlers.onConnected?.(JSON.parse(event.data));
      } catch {}
    });

    es.onerror = () => {
      handlers.onError?.(new Error('SSE connection error'));
    };

    this.cleanup = () => {
      es.close();
      this.eventSource = null;
    };
  }

  private connectRN(url: string, handlers: SseEventHandlers) {
    let buffer = '';
    let lastIndex = 0;

    const xhr = new XMLHttpRequest();
    this.xhr = xhr;
    xhr.open('GET', url);
    xhr.setRequestHeader('Accept', 'text/event-stream');
    xhr.setRequestHeader('Cache-Control', 'no-cache');

    xhr.onprogress = () => {
      const newData = xhr.responseText.substring(lastIndex);
      lastIndex = xhr.responseText.length;
      buffer += newData;

      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const eventStr of events) {
        this.parseSseEvent(eventStr, handlers);
      }
    };

    xhr.onerror = () => {
      handlers.onError?.(new Error('SSE connection error'));
    };

    xhr.send();

    this.cleanup = () => {
      xhr.abort();
      this.xhr = null;
    };
  }

  private parseSseEvent(eventStr: string, handlers: SseEventHandlers) {
    const lines = eventStr.split('\n');
    let eventType = '';
    let dataStr = '';

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
        handlers.onStats?.(data.Statistics);
      } else if (eventType === 'connected') {
        handlers.onConnected?.(data);
      }
    } catch {}
  }

  disconnect() {
    this.cleanup?.();
    this.cleanup = null;
  }
}

export const sseService = new SseService();
