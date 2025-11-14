import { useEffect, useState } from 'react';
import { Activity, Clock, Database, MessageSquare, TrendingUp, Zap } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { statsApi } from '../utils/api';
import { Stats } from '../types';

export function Dashboard() {
  const { theme, setCurrentView } = useApp();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await statsApi.get();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme === 'dark';

  const formatTimestamp = (value: number | null | undefined) => {
    if (!value) return 'Never';
    return new Date(value).toLocaleString();
  };

  const getStatusColor = (status: number | null | undefined) => {
    if (status == null) return 'bg-gray-100 text-gray-800';
    if (status >= 200 && status < 300) return 'bg-green-100 text-green-800';
    if (status >= 300 && status < 400) return 'bg-blue-100 text-blue-800';
    if (status >= 400 && status < 500) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <div
        className={`${
          isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
        } rounded-lg shadow-lg p-6`}
      >
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const cardClass = isDark
    ? 'bg-gray-800 border border-gray-700 shadow-lg'
    : 'bg-white border border-gray-200 shadow-xl';
  const panelClass = isDark
    ? 'bg-gray-800 border border-gray-700 shadow-lg'
    : 'bg-white border border-gray-200 shadow-xl';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`${cardClass} rounded-lg p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Total Mocks
              </p>
              <p className="text-3xl font-bold mt-2">{stats?.totalMocks ?? 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Database className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Active mock endpoints</span>
          </div>
        </div>

        <div className={`${cardClass} rounded-lg p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                AI Conversations
              </p>
              <p className="text-3xl font-bold mt-2">{stats?.totalChats ?? 0}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <MessageSquare className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <Zap className="w-4 h-4 text-purple-600 mr-1" />
            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
              AI-assisted mock generations
            </span>
          </div>
        </div>

        <div className={`${cardClass} rounded-lg p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Total Requests
              </p>
              <p className="text-3xl font-bold mt-2">{stats?.totalRequests ?? 0}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Activity className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <Activity className="w-4 h-4 text-green-600 mr-1" />
            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
              Mock executions served
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`${panelClass} rounded-lg p-6`}>
          <h3 className="text-xl font-bold mb-4">Top Performing Mocks</h3>
          {stats?.topMocks?.length ? (
            <div className="space-y-3">
              {stats.topMocks.slice(0, 5).map((mock, idx) => (
                <div
                  key={mock.mockId}
                  className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded ${
                            isDark ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <p className="font-medium truncate">{mock.name || 'Untitled Mock'}</p>
                      </div>
                      <p className="text-xs font-mono mt-1 truncate">
                        ID: <span className="text-blue-500">{mock.mockId}</span>
                      </p>
                      <div className="flex items-center space-x-3 mt-2 text-xs">
                        <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                          <Activity className="w-3 h-3 inline mr-1" />
                          {mock.hitCount} hits
                        </span>
                        <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                          <Clock className="w-3 h-3 inline mr-1" />
                          {formatTimestamp(mock.lastAccessed)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              No mock activity yet
            </p>
          )}
        </div>

        <div className={`${panelClass} rounded-lg p-6`}>
          <h3 className="text-xl font-bold mb-4">Recent API Requests</h3>
          {stats?.recentRequests?.length ? (
            <div className="space-y-2">
              {stats.recentRequests.slice(0, 10).map((req, idx) => (
                <div
                  key={`${req.mockId}-${req.timestamp}-${idx}`}
                  className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${
                          req.requestMethod === 'GET'
                            ? 'bg-green-100 text-green-800'
                            : req.requestMethod === 'POST'
                              ? 'bg-blue-100 text-blue-800'
                              : req.requestMethod === 'PUT'
                                ? 'bg-yellow-100 text-yellow-800'
                                : req.requestMethod === 'DELETE'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {req.requestMethod ?? 'ANY'}
                      </span>
                      <span className="text-sm font-mono truncate">
                        {req.requestPath ?? '(dynamic matcher)'}
                      </span>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ml-2 ${getStatusColor(req.responseStatus)}`}>
                      {req.responseStatus ?? '—'}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {formatTimestamp(req.timestamp)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              No recent requests
            </p>
          )}
        </div>
      </div>

      <div className={`${panelClass} rounded-lg p-6`}>
        <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setCurrentView('designer')}
            className={`p-4 rounded-lg text-left ${
              isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Database className="w-8 h-8 text-blue-600 mb-2" />
            <h4 className="font-medium mb-1">Create New Mock</h4>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Manually design a new API mock endpoint.
            </p>
          </button>

          <button
            onClick={() => setCurrentView('chat')}
            className={`p-4 rounded-lg text-left ${
              isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <MessageSquare className="w-8 h-8 text-purple-600 mb-2" />
            <h4 className="font-medium mb-1">Ask AI Assistant</h4>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Describe your API needs in natural language.
            </p>
          </button>

          <button
            onClick={() => setCurrentView('tester')}
            className={`p-4 rounded-lg text-left ${
              isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Activity className="w-8 h-8 text-green-600 mb-2" />
            <h4 className="font-medium mb-1">Test API Endpoint</h4>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Send requests and validate mock responses.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
