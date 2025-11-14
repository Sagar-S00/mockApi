import { useEffect, useState } from 'react';
import { Play, Copy, Clock, FileText, Link, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { RequestLog } from '../types';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

export function APITester() {
  const { theme, testerPreset, setTesterPreset } = useApp();
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/mock/');
  const [requestHeaders, setRequestHeaders] = useState<Array<{ key: string; value: string }>>([
    { key: 'Content-Type', value: 'application/json' }
  ]);
  const [requestBody, setRequestBody] = useState('');
  const [response, setResponse] = useState<RequestLog['response'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<RequestLog[]>([]);
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';

  useEffect(() => {
    if (!testerPreset) return;

    const presetMethod = testerPreset.method || 'GET';
    setMethod(presetMethod);
    setPath(testerPreset.path || '/mock/');

    const presetHeaders =
      testerPreset.headers && testerPreset.headers.length > 0
        ? testerPreset.headers
        : undefined;

    if (presetHeaders) {
      setRequestHeaders(presetHeaders);
    } else if (['POST', 'PUT', 'PATCH'].includes(presetMethod)) {
      setRequestHeaders([{ key: 'Content-Type', value: 'application/json' }]);
    } else {
      setRequestHeaders([]);
    }

    setRequestBody(testerPreset.body ?? '');
    setResponse(null);
    setTesterPreset(null);
  }, [testerPreset, setTesterPreset]);

  const handleSendRequest = async () => {
    setLoading(true);
    const startTime = Date.now();

    try {
      const headers: Record<string, string> = {};
      requestHeaders.forEach(h => {
        if (h.key) headers[h.key] = h.value;
      });

      const options: RequestInit = {
        method,
        headers,
      };

      if (['POST', 'PUT', 'PATCH'].includes(method) && requestBody) {
        options.body = requestBody;
      }

      const res = await fetch(`${apiBase}${path}`, options);
      const executionTime = Date.now() - startTime;

      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const responseBody = await res.text();

      const responseData = {
        statusCode: res.status,
        headers: responseHeaders,
        body: responseBody,
        executionTime,
      };

      setResponse(responseData);

      const logEntry: RequestLog = {
        method,
        path,
        headers,
        body: requestBody || undefined,
        response: responseData,
        timestamp: new Date().toISOString(),
      };

      setHistory([logEntry, ...history.slice(0, 19)]);
    } catch (err) {
      setResponse({
        statusCode: 0,
        headers: {},
        body: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        executionTime: Date.now() - startTime,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAsCurl = () => {
    const targetUrl = `${apiBase}${path}`;
    let curl = `curl -X ${method} '${targetUrl}'`;
    requestHeaders.forEach(h => {
      if (h.key) curl += ` \\\n  -H '${h.key}: ${h.value}'`;
    });
    if (requestBody) {
      curl += ` \\\n  -d '${requestBody}'`;
    }
    navigator.clipboard.writeText(curl);
    alert('Copied to clipboard!');
  };

  const handleCopyFullUrl = () => {
    const targetUrl = `${apiBase}${path}`;
    navigator.clipboard.writeText(targetUrl);
    alert('Full URL copied to clipboard!');
  };

  const loadFromHistory = (log: RequestLog) => {
    setMethod(log.method);
    setPath(log.path);
    setRequestHeaders(Object.entries(log.headers).map(([key, value]) => ({ key, value })));
    if (log.body) setRequestBody(log.body);
    setResponse(log.response || null);
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 300 && status < 400) return 'text-blue-600';
    if (status >= 400 && status < 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  const isDark = theme === 'dark';

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className={`col-span-8 ${isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-lg p-6`}>
        <h2 className="text-2xl font-bold mb-6">API Tester</h2>

        <div className="space-y-4">
          <div className="flex space-x-2">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className={`px-4 py-2 rounded-lg border ${
                isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
            >
              {HTTP_METHODS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/mock/your-endpoint"
              className={`flex-1 px-4 py-2 rounded-lg border ${
                isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
            />
            <button
              onClick={handleSendRequest}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              <span>{loading ? 'Sending...' : 'Send'}</span>
            </button>
          </div>

          <div>
              <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Request Headers</label>
              <div className="flex space-x-2">
                <button
                  onClick={handleCopyFullUrl}
                  className={`text-xs px-2 py-1 rounded flex items-center space-x-1 ${
                    isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <Link className="w-3 h-3" />
                  <span>Copy URL</span>
                </button>
                <button
                  onClick={handleCopyAsCurl}
                  className={`text-xs px-2 py-1 rounded flex items-center space-x-1 ${
                    isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy as cURL</span>
                </button>
              </div>
            </div>
            {requestHeaders.map((header, idx) => (
              <div key={idx} className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={header.key}
                  onChange={(e) => {
                    const newHeaders = [...requestHeaders];
                    newHeaders[idx].key = e.target.value;
                    setRequestHeaders(newHeaders);
                  }}
                  placeholder="Header name"
                  className={`flex-1 px-4 py-2 rounded-lg border ${
                    isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                />
                <input
                  type="text"
                  value={header.value}
                  onChange={(e) => {
                    const newHeaders = [...requestHeaders];
                    newHeaders[idx].value = e.target.value;
                    setRequestHeaders(newHeaders);
                  }}
                  placeholder="Header value"
                  className={`flex-1 px-4 py-2 rounded-lg border ${
                    isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                />
                <button
                  onClick={() => setRequestHeaders(requestHeaders.filter((_, i) => i !== idx))}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setRequestHeaders([...requestHeaders, { key: '', value: '' }])}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 text-sm ${
                isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Add Header</span>
            </button>
          </div>

          {['POST', 'PUT', 'PATCH'].includes(method) && (
            <div>
              <label className="block text-sm font-medium mb-2">Request Body</label>
              <textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                rows={8}
                placeholder='{"key": "value"}'
                className={`w-full px-4 py-2 rounded-lg border font-mono text-sm ${
                  isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
              />
            </div>
          )}

          {response && (
            <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Response</h3>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">{response.executionTime}ms</span>
                  </div>
                  <span className={`text-lg font-bold ${getStatusColor(response.statusCode)}`}>
                    {response.statusCode}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Headers</h4>
                <div className={`p-3 rounded text-xs font-mono ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                  {Object.entries(response.headers).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-blue-600">{key}</span>: {value}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Body</h4>
                <pre className={`p-3 rounded text-xs font-mono overflow-x-auto ${
                  isDark ? 'bg-gray-800' : 'bg-white'
                }`}>
                  {response.body}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`col-span-4 ${isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-lg p-6`}>
        <h3 className="font-bold mb-4">Request History</h3>
        <div className="space-y-2">
          {history.length === 0 ? (
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              No requests sent yet
            </p>
          ) : (
            history.map((log, idx) => (
              <button
                key={idx}
                onClick={() => loadFromHistory(log)}
                className={`w-full text-left p-3 rounded-lg ${
                  isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    log.method === 'GET' ? 'bg-green-100 text-green-800' :
                    log.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                    log.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                    log.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {log.method}
                  </span>
                  {log.response && (
                    <span className={`text-xs font-bold ${getStatusColor(log.response.statusCode)}`}>
                      {log.response.statusCode}
                    </span>
                  )}
                </div>
                <p className="text-sm font-mono truncate">{log.path}</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                  {log.response && ` • ${log.response.executionTime}ms`}
                </p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
