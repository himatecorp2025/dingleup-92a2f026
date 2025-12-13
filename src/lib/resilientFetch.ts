import { logger } from '@/lib/logger';
import { getNetworkStatus } from '@/hooks/useNetworkStatus';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

interface ResilientFetchOptions extends Omit<RequestInit, 'priority'> {
  retryConfig?: Partial<RetryConfig>;
  timeout?: number;
  fetchPriority?: 'high' | 'normal' | 'low';
  offlineQueue?: boolean;
}

// Offline request queue
interface QueuedRequest {
  id: string;
  url: string;
  options: RequestInit;
  timestamp: number;
  retryCount: number;
  resolve: (value: Response) => void;
  reject: (reason: Error) => void;
}

const offlineQueue: QueuedRequest[] = [];
let isProcessingQueue = false;

const generateRequestId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const calculateDelay = (attempt: number, config: RetryConfig): number => {
  const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
  // Add jitter (±20%)
  const jitter = delay * 0.2 * (Math.random() * 2 - 1);
  return Math.min(delay + jitter, config.maxDelay);
};

const isRetryableError = (error: Error): boolean => {
  // Network errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) return true;
  if (error.name === 'NetworkError') return true;
  if (error.message.includes('network')) return true;
  if (error.message.includes('timeout')) return true;
  if (error.message.includes('aborted')) return true;
  return false;
};

const isRetryableStatus = (status: number): boolean => {
  // 5xx server errors and 429 rate limit
  return status >= 500 || status === 429 || status === 408;
};

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function resilientFetch(
  url: string,
  options: ResilientFetchOptions = {}
): Promise<Response> {
  const {
    retryConfig: customRetryConfig,
    timeout = 30000,
    fetchPriority = 'normal',
    offlineQueue: shouldQueue = true,
    ...fetchOptions
  } = options;
  
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...customRetryConfig };
  const networkStatus = getNetworkStatus();
  
  // If offline and queueing is enabled, add to queue
  if (!networkStatus.isOnline && shouldQueue && fetchOptions.method !== 'GET') {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: generateRequestId(),
        url,
        options: fetchOptions,
        timestamp: Date.now(),
        retryCount: 0,
        resolve,
        reject,
      };
      offlineQueue.push(request);
      logger.log('[ResilientFetch] Request queued for offline', { url, id: request.id });
    });
  }
  
  // Adjust timeout based on connection quality
  let adjustedTimeout = timeout;
  if (networkStatus.connectionQuality === 'slow') {
    adjustedTimeout = timeout * 2;
  } else if (networkStatus.connectionQuality === 'excellent') {
    adjustedTimeout = timeout * 0.5;
  }
  
  // Adjust retries based on priority
  let adjustedMaxRetries = retryConfig.maxRetries;
  if (fetchPriority === 'high') {
    adjustedMaxRetries = retryConfig.maxRetries + 2;
  } else if (fetchPriority === 'low') {
    adjustedMaxRetries = Math.max(1, retryConfig.maxRetries - 1);
  }
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= adjustedMaxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, fetchOptions, adjustedTimeout);
      
      // Check for retryable HTTP status codes
      if (isRetryableStatus(response.status) && attempt < adjustedMaxRetries) {
        const delay = calculateDelay(attempt, retryConfig);
        logger.log('[ResilientFetch] Retrying after status', { 
          url, 
          status: response.status, 
          attempt: attempt + 1, 
          delay 
        });
        await sleep(delay);
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error as Error;
      
      // Check if we should retry
      if (isRetryableError(lastError) && attempt < adjustedMaxRetries) {
        const delay = calculateDelay(attempt, retryConfig);
        logger.log('[ResilientFetch] Retrying after error', { 
          url, 
          error: lastError.message, 
          attempt: attempt + 1, 
          delay 
        });
        
        // Wait for network to come back if offline
        if (!navigator.onLine) {
          await new Promise<void>(resolve => {
            const handler = () => {
              window.removeEventListener('online', handler);
              resolve();
            };
            window.addEventListener('online', handler);
            // Also timeout after max delay to prevent infinite wait
            setTimeout(resolve, retryConfig.maxDelay);
          });
        } else {
          await sleep(delay);
        }
        continue;
      }
      
      throw lastError;
    }
  }
  
  throw lastError || new Error('Request failed after retries');
}

// Process offline queue when back online
async function processOfflineQueue() {
  if (isProcessingQueue || offlineQueue.length === 0) return;
  
  isProcessingQueue = true;
  logger.log('[ResilientFetch] Processing offline queue', { count: offlineQueue.length });
  
  while (offlineQueue.length > 0) {
    const request = offlineQueue[0];
    
    // Skip if request is too old (> 5 minutes)
    if (Date.now() - request.timestamp > 5 * 60 * 1000) {
      offlineQueue.shift();
      request.reject(new Error('Request expired in offline queue'));
      continue;
    }
    
    try {
      const response = await resilientFetch(request.url, {
        ...request.options,
        offlineQueue: false, // Don't re-queue
      });
      offlineQueue.shift();
      request.resolve(response);
    } catch (error) {
      request.retryCount++;
      if (request.retryCount >= 3) {
        offlineQueue.shift();
        request.reject(error as Error);
      } else {
        // Move to end of queue for retry
        offlineQueue.shift();
        offlineQueue.push(request);
        await sleep(1000);
      }
    }
  }
  
  isProcessingQueue = false;
}

// Listen for online event to process queue
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    setTimeout(processOfflineQueue, 1000);
  });
}

// Export queue status for UI
export function getOfflineQueueStatus() {
  return {
    count: offlineQueue.length,
    isProcessing: isProcessingQueue,
  };
}
