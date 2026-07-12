export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  codeOutput?: CodeOutput;
  projectOutput?: ProjectOutput;
}

export interface CodeOutput {
  html: string;
  css: string;
  js: string;
}

export interface ProjectFile {
  path: string;
  content: string;
}

export interface ProjectOutput {
  projectName: string;
  files: ProjectFile[];
}

export interface Version {
  id: string;
  timestamp: Date;
  label: string;
  code: CodeOutput;
  project?: ProjectOutput;
}

export interface ChatState {
  messages: Message[];
  versions: Version[];
  currentVersion: string | null;
  isLoading: boolean;
}

export type ChatMode = 'quick' | 'architect';

export type ChatStepStatus = 'pending' | 'loading' | 'completed' | 'error';

export interface ChatStep {
  id: string;
  label: string;
  status: ChatStepStatus;
}
