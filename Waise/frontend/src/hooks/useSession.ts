import { useAuth0 } from "@auth0/auth0-react";
import { useCallback, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

const MAX_RETRIES = 5;
const SESSION_CHECK_INTERVAL = 300000; // 5 minutes - much less aggressive polling

// Global polling interval for the whole app
let globalPollingInterval: NodeJS.Timeout | null = null;

async function waitForToken(getAccessTokenSilently: () => Promise<string>, maxTries = 5, delay = 500) {
    let tries = 0;
    while (tries < maxTries) {
        try {
            const token = await getAccessTokenSilently();
            if (token) return token;
        } catch (e) {
            console.warn(`[waitForToken] Attempt ${tries + 1} failed:`, e);
        }
        await new Promise(res => setTimeout(res, delay));
        tries++;
    }
    throw new Error('Failed to get Auth0 token');
}

export const useSession = () => {
    const { getAccessTokenSilently, user, isAuthenticated, isLoading, logout } = useAuth0();
    const navigate = useNavigate();
    const [isInitializing, setIsInitializing] = useState(true);
    const [sessionError, setSessionError] = useState<string | null>(null);
    const retryCount = useRef(0);
    const isCreatingSession = useRef(false);

    const clearSession = useCallback(() => {
        localStorage.removeItem('sessionToken');
        sessionStorage.clear();
        if (globalPollingInterval) {
            clearInterval(globalPollingInterval);
            globalPollingInterval = null;
        }
    }, []);

    const stopPolling = useCallback(() => {
        if (globalPollingInterval) {
            clearInterval(globalPollingInterval);
            globalPollingInterval = null;
        }
    }, []);

    const destroySession = useCallback(async () => {
        if (!user?.sub) return;
        try {
            const token = await waitForToken(getAccessTokenSilently);
            await fetch(`${import.meta.env.VITE_API_URL}/session`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('[useSession] Error destroying session:', error);
        } finally {
            clearSession();
            stopPolling();
            await logout();
            navigate('/welcome');
        }
    }, [user, clearSession, stopPolling, navigate, logout, getAccessTokenSilently]);

    const validateSession = useCallback(async () => {
        if (!user?.sub) return false;
        try {
            const token = await waitForToken(getAccessTokenSilently);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/session/validate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.warn('[useSession] Session validation failed with 401');
                    return false;
                }
                throw new Error(`Session validation failed: ${response.statusText}`);
            }

            const sessionData = await response.json();
            const localToken = localStorage.getItem('sessionToken');

            if (!localToken || localToken !== sessionData.sessionToken) {
                console.warn('[useSession] Session token mismatch');
                return false;
            }

            retryCount.current = 0;
            return true;
        } catch (error) {
            console.error('[useSession] Session validation error:', error);
            retryCount.current++;
            
            if (retryCount.current >= MAX_RETRIES) {
                return false;
            }
            
            return false;
        }
    }, [user, getAccessTokenSilently]);

    const createSession = useCallback(async () => {
        if (!user?.sub || isCreatingSession.current) return null;
        
        isCreatingSession.current = true;
        try {
            console.log('[useSession] Creating new session for user:', user.sub);
            const token = await waitForToken(getAccessTokenSilently);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/session`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to create session');
            }

            const sessionData = await response.json();
            console.log('[useSession] Session created successfully:', sessionData);
            
            localStorage.setItem('sessionToken', sessionData.sessionToken);
            retryCount.current = 0;
            setSessionError(null);
            return sessionData;
        } catch (error) {
            console.error('[useSession] Error creating session:', error);
            setSessionError('Failed to create session. Please try again.');
            return null;
        } finally {
            isCreatingSession.current = false;
        }
    }, [user, getAccessTokenSilently]);

    useEffect(() => {
        if (isLoading) return;

        let isCurrentEffectActive = true; // Prevent stale closure issues

        const initializeSession = async () => {
            if (!isAuthenticated || !user?.sub) {
                if (isCurrentEffectActive) {
                    setIsInitializing(false);
                    clearSession();
                }
                return;
            }

            // Prevent multiple concurrent initializations
            if (isCreatingSession.current) {
                console.log('[useSession] Session initialization already in progress, skipping');
                return;
            }

            try {
                console.log('[useSession] Initializing session for user:', user.sub);
                const valid = await validateSession();
                
                if (!isCurrentEffectActive) return; // Effect cleanup happened
                
                if (!valid) {
                    console.log('[useSession] No valid session found, creating new session');
                    const sessionResult = await createSession();
                    if (!isCurrentEffectActive) return; // Effect cleanup happened
                    
                    if (!sessionResult) {
                        throw new Error('Failed to create session');
                    }
                } else {
                    console.log('[useSession] Valid session found');
                }
            } catch (error) {
                if (isCurrentEffectActive) {
                    console.error('[useSession] Session initialization error:', error);
                    setSessionError('Failed to initialize session');
                }
            } finally {
                if (isCurrentEffectActive) {
                    setIsInitializing(false);
                }
            }
        };

        initializeSession();

        // Polling: solo iniciar si está autenticado y no está iniciado
        if (isAuthenticated && !globalPollingInterval) {
            globalPollingInterval = setInterval(async () => {
                if (!isAuthenticated) {
                    if (globalPollingInterval) {
                        clearInterval(globalPollingInterval);
                        globalPollingInterval = null;
                    }
                    return;
                }
                
                try {
                    const valid = await validateSession();
                    if (!valid) {
                        console.warn('[useSession] Session validation failed during polling - will retry next cycle');
                        // Solo deslogueamos después de múltiples fallos consecutivos
                        if (retryCount.current >= MAX_RETRIES) {
                            console.error('[useSession] Maximum validation failures reached, logging out');
                            await destroySession();
                        }
                    } else {
                        // Reset retry count on successful validation
                        retryCount.current = 0;
                    }
                } catch (error) {
                    console.error('[useSession] Polling validation error:', error);
                    // No auto-logout on network errors, just log
                }
            }, SESSION_CHECK_INTERVAL);
        }

        return () => {
            isCurrentEffectActive = false; // Mark effect as inactive
            // Solo limpiar si no está autenticado
            if (!isAuthenticated && globalPollingInterval) {
                clearInterval(globalPollingInterval);
                globalPollingInterval = null;
            }
        };
    }, [isLoading, isAuthenticated, user?.sub]); // Simplified dependencies

    const retryCreateSession = useCallback(() => {
        setSessionError(null);
        setIsInitializing(true);
        createSession();
    }, [createSession]);

    return {
        createSession,
        validateSession,
        destroySession,
        stopPolling,
        isInitializing,
        sessionError,
        retryCreateSession
    };
}; 