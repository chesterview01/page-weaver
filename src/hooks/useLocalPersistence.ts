import { useEffect, useCallback } from 'react';
import { CodeOutput, Message, Version } from '@/types/chat';

const STORAGE_KEYS = {
  CURRENT_CODE: 'chester_current_code',
  MESSAGES: 'chester_messages',
  VERSIONS: 'chester_versions',
  CONVERSATION_ID: 'chester_conversation_id',
  PROJECT_ID: 'chester_project_id',
};

interface PersistedState {
  currentCode: CodeOutput | null;
  messages: Message[];
  versions: Version[];
  conversationId: string | null;
  projectId: string | null;
}

export const useLocalPersistence = () => {
  // Save state to localStorage
  const saveState = useCallback((state: Partial<PersistedState>) => {
    try {
      if (state.currentCode !== undefined) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_CODE, JSON.stringify(state.currentCode));
      }
      if (state.messages !== undefined) {
        localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(state.messages));
      }
      if (state.versions !== undefined) {
        localStorage.setItem(STORAGE_KEYS.VERSIONS, JSON.stringify(state.versions));
      }
      if (state.conversationId !== undefined) {
        localStorage.setItem(STORAGE_KEYS.CONVERSATION_ID, state.conversationId || '');
      }
      if (state.projectId !== undefined) {
        localStorage.setItem(STORAGE_KEYS.PROJECT_ID, state.projectId || '');
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, []);

  // Load state from localStorage
  const loadState = useCallback((): PersistedState => {
    try {
      const currentCode = localStorage.getItem(STORAGE_KEYS.CURRENT_CODE);
      const messages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      const versions = localStorage.getItem(STORAGE_KEYS.VERSIONS);
      const conversationId = localStorage.getItem(STORAGE_KEYS.CONVERSATION_ID);
      const projectId = localStorage.getItem(STORAGE_KEYS.PROJECT_ID);

      return {
        currentCode: currentCode ? JSON.parse(currentCode) : null,
        messages: messages ? JSON.parse(messages).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })) : [],
        versions: versions ? JSON.parse(versions).map((v: any) => ({
          ...v,
          timestamp: new Date(v.timestamp),
        })) : [],
        conversationId: conversationId || null,
        projectId: projectId || null,
      };
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return {
        currentCode: null,
        messages: [],
        versions: [],
        conversationId: null,
        projectId: null,
      };
    }
  }, []);

  // Clear persisted state
  const clearState = useCallback(() => {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }, []);

  return {
    saveState,
    loadState,
    clearState,
  };
};
