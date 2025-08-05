import { useEffect, useRef } from 'react';
import { useSession } from './useSession';

export const useSessionPolling = (enabled: boolean = true, interval: number = 10000) => {
  const { validateSession, isInitializing, sessionError } = useSession();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || isInitializing || sessionError) return;

    const checkSession = async () => {
      try {
        await validateSession();
      } catch (error) {
        console.error('Session validation failed during polling:', error);
        // No necesitamos manejar el error aquí ya que useSession lo manejará
      }
    };

    pollingRef.current = setInterval(checkSession, interval);
    checkSession();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [enabled, interval, validateSession, isInitializing, sessionError]);

  return null;
}; 