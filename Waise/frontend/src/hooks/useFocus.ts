import { useState, useCallback, useEffect } from 'react';

interface UseFocusReturn {
  focusValue: string;
  setFocusValue: (value: string) => void;
  saveFocus: () => void;
  loadFocus: () => void;
}

export const useFocus = (): UseFocusReturn => {
  const [focusValue, setFocusValue] = useState<string>('');

  const saveFocus = useCallback(() => {
    try {
      localStorage.setItem('waise_focus', focusValue);
    } catch (error) {
      console.error('Error saving focus to localStorage:', error);
    }
  }, [focusValue]);

  const loadFocus = useCallback(() => {
    try {
      const savedFocus = localStorage.getItem('waise_focus');
      if (savedFocus) {
        setFocusValue(savedFocus);
      }
    } catch (error) {
      console.error('Error loading focus from localStorage:', error);
    }
  }, []);

  useEffect(() => {
    loadFocus();
  }, [loadFocus]);

  return {
    focusValue,
    setFocusValue,
    saveFocus,
    loadFocus
  };
};