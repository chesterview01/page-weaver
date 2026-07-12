import { useCallback } from 'react';
import { CodeOutput, Message, Version, ProjectOutput } from '@/types/chat';

const STORAGE_KEYS = {
  CURRENT_CODE: 'chester_current_code',
  CURRENT_PROJECT: 'chester_current_project',
  MESSAGES: 'chester_messages',
  VERSIONS: 'chester_versions',
  CONVERSATION_ID: 'chester_conversation_id',
  PROJECT_ID: 'chester_project_id',
  LAST_BUILD_ID: 'chester_last_build_id',
  LAST_SYNC: 'chester_last_sync',
};

export interface PersistedState {
  currentCode: CodeOutput | null;
  currentProject: ProjectOutput | null;
  messages: Message[];
  versions: Version[];
  conversationId: string | null;
  projectId: string | null;
  lastBuildId: string | null;
  lastSync: string | null;
}

export const useLocalPersistence = () => {
  // Save state to localStorage
  const saveState = useCallback((state: Partial<PersistedState>) => {
    try {
      if (state.currentCode !== undefined) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_CODE, JSON.stringify(state.currentCode));
      }
      if (state.currentProject !== undefined) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_PROJECT, JSON.stringify(state.currentProject));
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
      if (state.lastBuildId !== undefined) {
        localStorage.setItem(STORAGE_KEYS.LAST_BUILD_ID, state.lastBuildId || '');
      }
      if (state.lastSync !== undefined) {
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, state.lastSync || '');
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, []);

  // Load state from localStorage
  const loadState = useCallback((): PersistedState => {
    try {
      const currentCode = localStorage.getItem(STORAGE_KEYS.CURRENT_CODE);
      const currentProject = localStorage.getItem(STORAGE_KEYS.CURRENT_PROJECT);
      const messages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      const versions = localStorage.getItem(STORAGE_KEYS.VERSIONS);
      const conversationId = localStorage.getItem(STORAGE_KEYS.CONVERSATION_ID);
      const projectId = localStorage.getItem(STORAGE_KEYS.PROJECT_ID);
      const lastBuildId = localStorage.getItem(STORAGE_KEYS.LAST_BUILD_ID);
      const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);

      type SerializedMessage = Omit<Message, 'timestamp'> & { timestamp: string };
      type SerializedVersion = Omit<Version, 'timestamp'> & { timestamp: string };

      return {
        currentCode: currentCode ? JSON.parse(currentCode) as CodeOutput : null,
        currentProject: currentProject ? JSON.parse(currentProject) as ProjectOutput : null,
        messages: messages ? (JSON.parse(messages) as SerializedMessage[]).map((m) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })) : [],
        versions: versions ? (JSON.parse(versions) as SerializedVersion[]).map((v) => ({
          ...v,
          timestamp: new Date(v.timestamp),
        })) : [],
        conversationId: conversationId || null,
        projectId: projectId || null,
        lastBuildId: lastBuildId || null,
        lastSync: lastSync || null,
      };
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return {
        currentCode: null,
        currentProject: null,
        messages: [],
        versions: [],
        conversationId: null,
        projectId: null,
        lastBuildId: null,
        lastSync: null,
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

  // Check if cache is stale (older than 1 hour)
  const isCacheStale = useCallback((lastSync: string | null): boolean => {
    if (!lastSync) return true;
    const syncTime = new Date(lastSync).getTime();
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    return now - syncTime > oneHour;
  }, []);

  return {
    saveState,
    loadState,
    clearState,
    isCacheStale,
  };
};
