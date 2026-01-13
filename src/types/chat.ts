export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  codeOutput?: CodeOutput;
}

export interface CodeOutput {
  html: string;
  css: string;
  js: string;
}

export interface Version {
  id: string;
  timestamp: Date;
  label: string;
  code: CodeOutput;
}

export interface ChatState {
  messages: Message[];
  versions: Version[];
  currentVersion: string | null;
  isLoading: boolean;
}
