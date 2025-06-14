import { useState, useEffect } from 'react';
import { saveContentToDatabase, loadContentFromDatabase, subscribeToContentChanges } from '../lib/supabase';

// Deep merge utility function to ensure complete data structure
function deepMerge<T>(target: T, source: Partial<T>): T {
  if (!source || typeof source !== 'object') {
    return target;
  }

  const result = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue) &&
          targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
        // Recursively merge nested objects
        result[key] = deepMerge(targetValue, sourceValue);
      } else if (sourceValue !== undefined) {
        // Use source value if it's defined
        result[key] = sourceValue;
      }
      // Keep target value if source value is undefined
    }
  }

  return result;
}

export function useGlobalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true);

  // Load from database on mount with improved error handling
  useEffect(() => {
    const loadFromDatabase = async () => {
      try {
        console.log('🔄 Loading content from database...');
        const databaseContent = await loadContentFromDatabase();
        
        if (databaseContent) {
          console.log('✅ Database content loaded successfully');
          // Deep merge database content with initial value to ensure complete structure
          const mergedContent = deepMerge(initialValue, databaseContent);
          setStoredValue(mergedContent);
        } else {
          console.log('⚠️ No database content found, checking localStorage...');
          // Fallback to localStorage
          try {
            const item = window.localStorage.getItem(key);
            if (item) {
              const parsedItem = JSON.parse(item);
              // Deep merge localStorage content with initial value
              const mergedContent = deepMerge(initialValue, parsedItem);
              setStoredValue(mergedContent);
              console.log('✅ Content loaded from localStorage');
            } else {
              console.log('ℹ️ No stored content found, using initial values');
            }
          } catch (localError) {
            console.error('❌ Failed to load from localStorage:', localError);
            console.log('ℹ️ Using initial values');
          }
        }
      } catch (error) {
        console.error('❌ Failed to load from database:', error);
        console.log('⚠️ Falling back to localStorage...');
        
        // Fallback to localStorage
        try {
          const item = window.localStorage.getItem(key);
          if (item) {
            const parsedItem = JSON.parse(item);
            // Deep merge localStorage content with initial value
            const mergedContent = deepMerge(initialValue, parsedItem);
            setStoredValue(mergedContent);
            console.log('✅ Content loaded from localStorage fallback');
          } else {
            console.log('ℹ️ No fallback content found, using initial values');
          }
        } catch (localError) {
          console.error('❌ Failed to load from localStorage fallback:', localError);
          console.log('ℹ️ Using initial values');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadFromDatabase();
  }, [key, initialValue]);

  // Subscribe to real-time changes with error handling
  useEffect(() => {
    let subscription;
    
    try {
      subscription = subscribeToContentChanges((newContent) => {
        console.log('🔄 Real-time update received');
        // Deep merge new content with initial value to ensure complete structure
        const mergedContent = deepMerge(initialValue, newContent);
        setStoredValue(mergedContent);
        
        // Also update localStorage as backup
        try {
          window.localStorage.setItem(key, JSON.stringify(mergedContent));
        } catch (error) {
          console.error('❌ Failed to update localStorage:', error);
        }
      });
    } catch (error) {
      console.warn('⚠️ Real-time subscription failed, continuing without real-time updates:', error);
    }

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, [key, initialValue]);

  const setValue = async (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Update local state immediately
      setStoredValue(valueToStore);
      
      // Save to database (global) with error handling
      try {
        const success = await saveContentToDatabase(valueToStore);
        
        if (success) {
          console.log('✅ Content saved globally - visible to all users!');
        } else {
          console.warn('⚠️ Database save failed, content saved locally only');
        }
      } catch (dbError) {
        console.warn('⚠️ Database save error, content saved locally only:', dbError);
      }
      
      // Always save to localStorage as backup
      try {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        console.log('✅ Content saved to localStorage backup');
      } catch (error) {
        console.error('❌ localStorage backup failed:', error);
      }
      
    } catch (error) {
      console.error('❌ Failed to save content:', error);
    }
  };

  return [storedValue, setValue, isLoading] as const;
}