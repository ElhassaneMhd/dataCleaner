import { useEffect, useRef, useState } from 'react';

interface UseWebSocketOptions<T> {
  onMessage: (data: T) => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export function useWebSocket<T>(
  url: string | null,
  options: UseWebSocketOptions<T>
) {
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const maxReconnectAttempts = options.reconnectAttempts ?? 5;
  const reconnectInterval = options.reconnectInterval ?? 3000;

  useEffect(() => {
    if (!url) return;

    const connect = () => {
      try {
        // Convert http/https to ws/wss
        const wsUrl = url.replace(/^http/, 'ws');
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          reconnectCount.current = 0;
        };

        ws.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as T;
            options.onMessage(data);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        ws.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          options.onError?.(error);
        };

        ws.current.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
          options.onClose?.();

          // Attempt to reconnect
          if (reconnectCount.current < maxReconnectAttempts) {
            reconnectCount.current++;
            console.log(
              `Reconnecting... (${reconnectCount.current}/${maxReconnectAttempts})`
            );
            setTimeout(connect, reconnectInterval);
          } else {
            console.log('Max reconnection attempts reached');
          }
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
      }
    };

    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [url, maxReconnectAttempts, reconnectInterval]);

  const sendMessage = (data: unknown) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected');
    }
  };

  return { isConnected, sendMessage };
}
