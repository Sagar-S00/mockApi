import {
  AiMockSuggestion,
  ChatDetail,
  ChatMessage,
  ChatSummary,
  MatchConditions,
  Mock,
  Paginated,
  Stats,
} from '../types';

const API_BASE = 'https://d1-template.trl0z2le.workers.dev';
const CLIENT_TOKEN_KEY = 'mockforgeClientId';

export function getClientToken(): string {
  if (typeof window === 'undefined') {
    return 'server-token';
  }
  let token = localStorage.getItem(CLIENT_TOKEN_KEY);
  if (!token) {
    if (crypto?.randomUUID) {
      token = crypto.randomUUID();
    } else {
      token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
    localStorage.setItem(CLIENT_TOKEN_KEY, token);
  }
  return token;
}

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Token': getClientToken(),
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (body?.error) {
        message = body.error;
      }
    } catch {
      const text = await response.text();
      if (text) message = text;
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

type MockRecord = {
  id: string;
  name: string;
  method: string;
  path: string;
  response_status: number;
  response_body: string;
  response_headers: string | null;
  delay: number;
  match_conditions: string | null;
  hit_count: number;
  created_at: number;
  updated_at: number;
  created_by_chat_id: string | null;
  last_accessed?: number | null;
};

type PaginatedMockResponse = {
  items: MockRecord[];
  pagination: Paginated<Mock>['pagination'];
};

function parseJson<T>(input: string | null): T | undefined {
  if (!input) return undefined;
  try {
    return JSON.parse(input) as T;
  } catch {
    return undefined;
  }
}

function normalizeMatchConditions(json?: MatchConditions | null): MatchConditions | undefined {
  if (!json) return undefined;
  const hasValues =
    !!json.bodyContains ||
    !!json.headersContain ||
    !!json.queryContains ||
    !!json.pathPattern;
  return hasValues ? json : undefined;
}

function mapMock(record: MockRecord): Mock {
  const responseBody = parseJson<unknown>(record.response_body) ?? record.response_body;
  const responseHeaders = parseJson<Record<string, string>>(record.response_headers) ?? {};
  const matchConditions = normalizeMatchConditions(
    parseJson<MatchConditions>(record.match_conditions)
  );

  return {
    id: record.id,
    name: record.name,
    method: record.method,
    path: record.path,
    responseStatus: record.response_status,
    responseBody,
    responseHeaders,
    delay: record.delay ?? 0,
    matchConditions,
    hitCount: record.hit_count ?? 0,
    lastAccessed: record.last_accessed ?? null,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    createdByChatId: record.created_by_chat_id,
    source: record.created_by_chat_id ? 'ai' : 'manual',
  };
}

type MockInput = {
  name?: string;
  method?: string;
  path?: string;
  responseStatus?: number;
  responseBody?: unknown;
  responseHeaders?: Record<string, string> | null;
  delay?: number;
  matchConditions?: MatchConditions | null;
  createdByChatId?: string | null;
};

function prepareMockPayload(input: MockInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) payload.name = input.name;
  if (input.method !== undefined) payload.method = input.method;
  if (input.path !== undefined) payload.path = input.path;
  if (input.responseStatus !== undefined) payload.responseStatus = input.responseStatus;
  if (input.responseBody !== undefined) payload.responseBody = input.responseBody;
  if (input.responseHeaders !== undefined) {
    if (input.responseHeaders === null) {
      payload.responseHeaders = null;
    } else {
      payload.responseHeaders = Object.keys(input.responseHeaders).length
        ? input.responseHeaders
        : {};
    }
  }
  if (input.delay !== undefined) payload.delay = input.delay;
  if (input.matchConditions !== undefined) {
    payload.matchConditions = input.matchConditions
      ? normalizeMatchConditions(input.matchConditions)
      : null;
  }
  if (input.createdByChatId !== undefined) payload.createdByChatId = input.createdByChatId;

  return payload;
}

export const mockApi = {
  async list(): Promise<Paginated<Mock>> {
    const data = await apiRequest<PaginatedMockResponse>('/api/mocks');
    return {
      items: data.items.map(mapMock),
      pagination: data.pagination,
    };
  },
  async get(id: string): Promise<Mock> {
    const record = await apiRequest<MockRecord>(`/api/mocks/${id}`);
    return mapMock(record);
  },
  async create(input: MockInput): Promise<Mock> {
    const payload = prepareMockPayload(input);
    const record = await apiRequest<MockRecord>('/api/mocks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapMock(record);
  },
  async update(id: string, input: MockInput): Promise<Mock> {
    const payload = prepareMockPayload(input);
    const record = await apiRequest<MockRecord>(`/api/mocks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return mapMock(record);
  },
  delete(id: string): Promise<void> {
    return apiRequest<void>(`/api/mocks/${id}`, {
      method: 'DELETE',
    });
  },
};

type ChatListResponse = Paginated<{
  id: string;
  title: string | null;
  message_count: number;
  created_at: number;
  updated_at: number;
}>;

type ChatDetailResponse = {
  chat: {
    id: string;
    title: string | null;
    message_count: number;
    created_at: number;
    updated_at: number;
  };
  messages: Array<{
    id: string;
    chat_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    generated_mock_id: string | null;
    created_at: number;
  }>;
};

type ChatSendResponse = {
  chat: ChatDetailResponse['chat'];
  message: ChatDetailResponse['messages'][number];
  ai: {
    message: ChatDetailResponse['messages'][number];
    suggestion: AiMockSuggestion | null;
    questions: string[];
    rationale?: string;
  };
};

function parseAssistantContent(content: string): {
  suggestion?: AiMockSuggestion;
  rationale?: string;
  questions?: string[];
  raw?: string;
} {
  try {
    const parsed = JSON.parse(content) as {
      suggestion?: AiMockSuggestion;
      rationale?: string;
      questions?: string[];
      raw?: string;
    };
    return parsed;
  } catch {
    return { raw: content };
  }
}

function mapChatMessage(message: ChatDetailResponse['messages'][number]): ChatMessage {
  const base: ChatMessage = {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.created_at,
    generatedMockId: message.generated_mock_id,
  };

  if (message.role === 'assistant') {
    const parsed = parseAssistantContent(message.content);
    return {
      ...base,
      mockSuggestion: parsed.suggestion ?? null,
      rationale: parsed.rationale,
      questions: parsed.questions,
      raw: parsed.raw,
    };
  }

  return base;
}

function mapChatDetail(data: ChatDetailResponse): ChatDetail {
  return {
    id: data.chat.id,
    title: data.chat.title,
    messageCount: data.chat.message_count,
    createdAt: data.chat.created_at,
    updatedAt: data.chat.updated_at,
    messages: data.messages.map(mapChatMessage),
  };
}

export const chatApi = {
  async list(): Promise<ChatSummary[]> {
    const data = await apiRequest<ChatListResponse>('/api/chats');
    return data.items.map((item) => ({
      id: item.id,
      title: item.title,
      messageCount: item.message_count,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      preview: item.title,
    }));
  },
  async get(id: string): Promise<ChatDetail> {
    const data = await apiRequest<ChatDetailResponse>(`/api/chats/${id}`);
    return mapChatDetail(data);
  },
  async send(message: string, chatId?: string): Promise<ChatDetail> {
    const data = await apiRequest<ChatSendResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, chatId }),
    });

    return chatApi.get(data.chat.id);
  },
  apply(chatId: string, payload: { messageId?: string; suggestion?: AiMockSuggestion }) {
    return apiRequest<{ mock: Mock }>(`/api/chats/${chatId}/apply`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  delete(chatId: string, preserveMocks = true) {
    const suffix = preserveMocks ? '?preserveMocks=true' : '';
    return apiRequest<{ deleted: boolean }>(`/api/chats/${chatId}${suffix}`, {
      method: 'DELETE',
    });
  },
};

export const statsApi = {
  get: () => apiRequest<Stats>('/api/stats'),
};

export const healthApi = {
  check: () => apiRequest<{ status: string; timestamp: number }>('/api/health'),
};
