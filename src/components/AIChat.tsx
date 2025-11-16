import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, CheckCircle, MessageSquare, Trash2, Loader2, Info } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { chatApi } from '../utils/api';
import { ChatDetail, ChatMessage, ChatSummary } from '../types';

export function AIChat() {
  const { theme, showToast } = useApp();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [currentChat, setCurrentChat] = useState<ChatDetail | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages]);

  const loadChats = async () => {
    try {
      const list = await chatApi.list();
      setChats(list);
    } catch (err) {
      console.error('Failed to load chats:', err);
    }
  };

  const loadChatDetail = async (chatId: string) => {
    try {
      setHistoryLoading(true);
      const detail = await chatApi.get(chatId);
      setCurrentChat(detail);
    } catch (err) {
      console.error('Failed to load chat detail:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!message.trim() || loading) return;

    const userMessage = message.trim();
    setMessage('');
    setLoading(true);

    try {
      const detail = await chatApi.send(userMessage, currentChat?.id);
      setCurrentChat(detail);
      await loadChats();
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyMock = async (msg: ChatMessage) => {
    if (!currentChat || !msg.mockSuggestion) return;

    try {
      setLoading(true);
      await chatApi.apply(currentChat.id, { messageId: msg.id });
      showToast('Mock created successfully!', 'success');
    } catch (err) {
      console.error('Failed to apply mock suggestion:', err);
      showToast('Failed to create mock', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setCurrentChat(null);
    setMessage('');
  };

  const [chatPendingDelete, setChatPendingDelete] = useState<ChatSummary | null>(null);

  const handleDeleteChat = (chat: ChatSummary) => {
    setChatPendingDelete(chat);
  };

  const confirmDeleteChat = async () => {
    if (!chatPendingDelete) return;
    try {
      setLoading(true);
      await chatApi.delete(chatPendingDelete.id, true);
      if (currentChat?.id === chatPendingDelete.id) {
        setCurrentChat(null);
      }
      await loadChats();
      showToast('Chat deleted', 'success');
      setChatPendingDelete(null);
    } catch (err) {
      console.error('Failed to delete chat:', err);
      showToast('Failed to delete chat', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChat = (chat: ChatSummary) => {
    if (currentChat?.id === chat.id) return;
    loadChatDetail(chat.id);
  };

  const renderMessageText = (msg: ChatMessage) => {
    if (msg.role === 'assistant') {
      if (msg.rationale) return msg.rationale;
      if (msg.questions && msg.questions.length) {
        return msg.questions.join('\n');
      }
      if (msg.mockSuggestion) return 'AI assistant generated the mock configuration below.';
      if (msg.raw) return msg.raw;
      return 'AI assistant response';
    }
    return msg.content;
  };

  const isDark = theme === 'dark';

  const panelClass = isDark
    ? 'bg-gray-800 border border-gray-700 shadow-[0_0_40px_rgba(0,0,0,0.8)]'
    : 'bg-white border border-gray-200 shadow-[0_0_40px_rgba(0,0,0,0.2)]';

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-12rem)]">
      {showHistory && (
        <div
          className={`col-span-3 rounded-lg p-4 overflow-y-auto ${panelClass}`}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold">Chat History</h3>
            <button
              onClick={handleNewChat}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
            >
              New Chat
            </button>
          </div>
          <div className="space-y-2">
            {chats.length === 0 ? (
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                No chats yet. Start a new conversation!
              </p>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`p-3 rounded-lg cursor-pointer flex justify-between items-start border ${
                    currentChat?.id === chat.id
                      ? isDark
                        ? 'border-blue-700 bg-blue-900/20'
                        : 'border-blue-300 bg-blue-50/50'
                      : isDark
                        ? 'border-gray-700 hover:border-gray-600'
                        : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleSelectChat(chat)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="w-4 h-4 flex-shrink-0" />
                      <p className="text-sm truncate">
                        {chat.title || `Chat (${chat.messageCount} message${chat.messageCount === 1 ? '' : 's'})`}
                      </p>
                    </div>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {new Date(chat.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChat(chat);
                    }}
                    className="p-1 text-red-600 hover:bg-red-50 rounded ml-2"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div
        className={`${showHistory ? 'col-span-9' : 'col-span-12'} rounded-lg flex flex-col ${panelClass}`}
      >
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold">AI Assistant</h2>
          </div>
          <div className="flex items-center space-x-2">
            {historyLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`px-3 py-1 rounded text-sm ${
                isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {showHistory ? 'Hide' : 'Show'} History
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {historyLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
              <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Loading chat...</p>
            </div>
          ) : !currentChat || currentChat.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              {loading ? (
                <>
                  <div className="flex items-center space-x-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                      Assistant is drafting a mock for you...
                    </span>
                  </div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    This may take a few seconds.
                  </p>
                </>
              ) : (
                <>
                  <Sparkles className={`w-16 h-16 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                  <h3 className="text-xl font-bold">Welcome to AI Assistant</h3>
                  <p className={`max-w-md ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Describe the API behavior you want to mock, and the assistant will draft a complete
                    endpoint configuration for you.
                  </p>
                  <div className={`mt-6 space-y-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    <p className="font-medium flex items-center justify-center space-x-1">
                      <Info className="w-4 h-4" />
                      <span>Try asking:</span>
                    </p>
                    <ul className="space-y-1">
                      <li>"Create a user registration endpoint that returns a JWT token"</li>
                      <li>"I need a failed payment response with error codes"</li>
                      <li>"Mock a paginated product list with metadata"</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              {currentChat.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl rounded-lg p-4 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : isDark
                          ? 'border border-gray-600 text-gray-100'
                          : 'border border-gray-300 text-gray-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{renderMessageText(msg)}</p>

                    {msg.questions && msg.questions.length > 0 && (
                      <div className={`mt-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <p className="font-medium mb-1">Questions:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          {msg.questions.map((question, idx) => (
                            <li key={idx}>{question}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {msg.mockSuggestion && (
                      <div
                        className={`mt-4 p-4 rounded border ${
                          isDark ? 'border-gray-700 text-gray-100' : 'border-gray-400 text-gray-900'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-sm">Suggested Mock</h4>
                          <button
                            onClick={() => handleApplyMock(msg)}
                            disabled={loading}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm flex items-center space-x-1 disabled:opacity-50"
                          >
                            <CheckCircle className="w-3 h-3" />
                            <span>Apply as Mock</span>
                          </button>
                        </div>
                        <pre
                          className={`text-xs p-3 rounded overflow-x-auto border ${
                            isDark ? 'border-gray-700 text-gray-100' : 'border-gray-300 text-gray-900'
                          }`}
                        >
                          {JSON.stringify(msg.mockSuggestion, null, 2)}
                        </pre>
                      </div>
                    )}

                    <p
                      className={`text-xs mt-2 ${
                        msg.role === 'user'
                          ? 'text-blue-200'
                          : isDark
                            ? 'text-gray-400'
                            : 'text-gray-600'
                      }`}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className={`rounded-lg p-4 border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                        style={{ animationDelay: '0.1s' }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className={`p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Describe the API mock you want to create..."
              disabled={loading}
              className={`flex-1 px-4 py-3 rounded-lg border ${
                isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              } disabled:opacity-50`}
            />
            <button
              onClick={handleSend}
              disabled={loading || !message.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Working...' : 'Send'}</span>
            </button>
          </div>
          <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Press Enter to send • Shift+Enter for a new line
          </p>
        </div>
      </div>
      {chatPendingDelete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
        <div
          className={`w-full max-w-md rounded-2xl border ${
            isDark ? 'bg-gray-800 text-white border-gray-700 shadow-[0_0_50px_rgba(0,0,0,0.9)]' : 'bg-white text-gray-900 border-gray-200 shadow-[0_0_50px_rgba(0,0,0,0.3)]'
          }`}
        >
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">Delete chat?</h3>
              <p className="text-sm leading-relaxed">
                This will remove{' '}
                <span className="font-medium">
                  {chatPendingDelete.title || 'this conversation'}
                </span>{' '}
                and all of its messages permanently.
              </p>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => setChatPendingDelete(null)}
                  className={`px-4 py-2 rounded-lg ${
                    isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteChat}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
