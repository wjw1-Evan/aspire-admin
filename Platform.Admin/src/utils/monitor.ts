import { onLCP, onCLS, onFCP, onTTFB, onINP } from 'web-vitals';

export interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

export interface MonitorError {
  message: string;
  stack?: string;
  severity: string;
  context?: Record<string, unknown>;
  timestamp: number;
}

export interface MonitorConfig {
  metricsReporter?: (metrics: WebVitalMetric) => void;
  errorReporter?: (error: MonitorError) => void;
  devLogging?: boolean;
}

let config: MonitorConfig = { devLogging: true };

function devLog(...args: unknown[]) {
  if (config.devLogging && process.env.NODE_ENV === 'development') {
    console.log('[Monitor]', ...args);
  }
}

function reportVital(metric: { name: string; value: number; rating: 'good' | 'needs-improvement' | 'poor' }) {
  const data: WebVitalMetric = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    timestamp: Date.now(),
  };
  devLog(`${data.name}: ${data.value.toFixed(2)} (${data.rating})`);
  config.metricsReporter?.(data);
}

export function initMonitor(cfg?: MonitorConfig) {
  if (cfg) config = { ...config, ...cfg };
  try {
    onLCP(reportVital);
    onCLS(reportVital);
    onFCP(reportVital);
    onTTFB(reportVital);
    onINP(reportVital);
    devLog('Web Vitals tracking initialized');
  } catch {
    // silently ignore
  }
}

export function reportError(error: Omit<MonitorError, 'timestamp'>) {
  const data: MonitorError = { ...error, timestamp: Date.now() };
  devLog(`Error: ${data.message} (${data.severity})`);
  config.errorReporter?.(data);
}
