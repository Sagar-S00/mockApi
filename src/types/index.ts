export interface MatchConditions {
  bodyContains?: Record<string, unknown>;
  headersContain?: Record<string, string>;
  queryContains?: Record<string, string>;
  pathPattern?: string;
}

export interface Mock {
  id: string;
  name: string;
  method: string;
  path: string;
  responseStatus: number;
  responseBody: unknown;
  responseHeaders: Record<string, string>;
  delay: number;
  matchConditions?: MatchConditions;
  hitCount: number;
  lastAccessed: number | null;
  createdAt: number;
  updatedAt: number;
  createdByChatId?: string | null;
  source?: 'manual' | 'ai';
}

export interface Paginated<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface ChatSummary {
  id: string;
  title?: string | null;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
  preview?: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
  generatedMockId?: string | null;
  mockSuggestion?: AiMockSuggestion | null;
  rationale?: string;
  questions?: string[];
  raw?: string;
}

export interface ChatDetail {
  id: string;
  title?: string | null;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface AiMockSuggestion {
  name?: string;
  method?: string;
  path?: string;
  responseStatus?: number;
  responseBody?: unknown;
  responseHeaders?: Record<string, string>;
  delay?: number;
  matchConditions?: MatchConditions;
}

export interface Stats {
  totalMocks: number;
  totalChats: number;
  totalRequests: number;
  topMocks: Array<{
    mockId: string;
    name: string;
    hitCount: number;
    lastAccessed: number | null;
  }>;
  recentRequests: Array<{
    mockId: string;
    requestMethod: string | null;
    requestPath: string | null;
    responseStatus: number | null;
    timestamp: number;
  }>;
}

export interface RequestLog {
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: string;
  response?: {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
    executionTime: number;
  };
  timestamp: string;
}
