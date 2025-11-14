import { useState, useEffect } from 'react';
import { Save, X, Plus, Trash2, Info } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { mockApi } from '../utils/api';
import { MatchConditions } from '../types';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

export function MockDesigner() {
  const { theme, editingMockId, setEditingMockId, setCurrentView } = useApp();
  const [name, setName] = useState('');
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/api/');
  const [responseStatus, setResponseStatus] = useState(200);
  const [responseBody, setResponseBody] = useState('{\n  "message": "Success"\n}');
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>([]);
  const [delay, setDelay] = useState(0);
  const [bodyContains, setBodyContains] = useState('');
  const [pathPattern, setPathPattern] = useState('');
  const [queryParams, setQueryParams] = useState<Array<{ key: string; value: string }>>([]);
  const [requiredHeaders, setRequiredHeaders] = useState<Array<{ key: string; value: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTokenHelper, setShowTokenHelper] = useState(false);

  useEffect(() => {
    if (editingMockId) {
      loadMock(editingMockId);
    } else {
      resetForm();
    }
  }, [editingMockId]);

  const loadMock = async (id: string) => {
    try {
      setLoading(true);
      const mock = await mockApi.get(id);
      setName(mock.name);
      setMethod(mock.method);
      setPath(mock.path);
      setResponseStatus(mock.responseStatus);
      setResponseBody(
        typeof mock.responseBody === 'string'
          ? (() => {
              try {
                return JSON.stringify(JSON.parse(mock.responseBody), null, 2);
              } catch {
                return mock.responseBody;
              }
            })()
          : JSON.stringify(mock.responseBody, null, 2)
      );
      setHeaders(
        Object.entries(mock.responseHeaders || {}).map(([key, value]) => ({
          key,
          value,
        }))
      );
      setDelay(mock.delay || 0);
      setBodyContains(
        mock.matchConditions?.bodyContains
          ? JSON.stringify(mock.matchConditions.bodyContains, null, 2)
          : ''
      );
      setPathPattern(mock.matchConditions?.pathPattern || '');
      setQueryParams(
        Object.entries(mock.matchConditions?.queryContains || {}).map(([key, value]) => ({
          key,
          value,
        }))
      );
      setRequiredHeaders(
        Object.entries(mock.matchConditions?.headersContain || {}).map(([key, value]) => ({
          key,
          value,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mock');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setMethod('GET');
    setPath('/api/');
    setResponseStatus(200);
    setResponseBody('{\n  "message": "Success"\n}');
    setHeaders([]);
    setDelay(0);
    setBodyContains('');
    setPathPattern('');
    setQueryParams([]);
    setRequiredHeaders([]);
    setError('');
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');

      let parsedBody;
      try {
        parsedBody = JSON.parse(responseBody);
      } catch {
        setError('Invalid JSON in response body');
        return;
      }

      let parsedBodyContains: MatchConditions['bodyContains'] | undefined;
      if (bodyContains.trim()) {
        try {
          const parsed = JSON.parse(bodyContains);
          if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            setError('Body Contains must be a JSON object (e.g., {"email": "user@example.com"})');
            return;
          }
          parsedBodyContains = parsed as Record<string, unknown>;
        } catch {
          setError('Body Contains must be valid JSON');
          return;
        }
      }

      const matchConditions: MatchConditions = {};
      if (parsedBodyContains) matchConditions.bodyContains = parsedBodyContains;
      if (pathPattern.trim()) matchConditions.pathPattern = pathPattern.trim();
      if (queryParams.length > 0) {
        const query = queryParams.reduce<Record<string, string>>((acc, q) => {
          if (q.key) acc[q.key] = q.value;
          return acc;
        }, {});
        if (Object.keys(query).length) matchConditions.queryContains = query;
      }
      if (requiredHeaders.length > 0) {
        const headerMap = requiredHeaders.reduce<Record<string, string>>((acc, h) => {
          if (h.key) acc[h.key] = h.value;
          return acc;
        }, {});
        if (Object.keys(headerMap).length) matchConditions.headersContain = headerMap;
      }

      const normalizedMatchConditions =
        Object.keys(matchConditions).length > 0 ? matchConditions : undefined;

      const headersMap = headers.reduce<Record<string, string>>((acc, h) => {
        if (h.key) acc[h.key] = h.value;
        return acc;
      }, {});

      const responseHeadersPayload =
        Object.keys(headersMap).length > 0
          ? headersMap
          : editingMockId
            ? null
            : undefined;

      const matchConditionsPayload =
        normalizedMatchConditions ?? (editingMockId ? null : undefined);

      const mockData: Parameters<typeof mockApi.create>[0] = {
        name,
        method,
        path,
        responseStatus,
        responseBody: parsedBody,
        responseHeaders: responseHeadersPayload,
        delay,
        matchConditions: matchConditionsPayload,
      };

      if (editingMockId) {
        await mockApi.update(editingMockId, mockData);
      } else {
        await mockApi.create(mockData);
      }

      setCurrentView('mocks');
      setEditingMockId(null);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save mock');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingMockId(null);
    setCurrentView('mocks');
    resetForm();
  };

  const insertToken = (token: string) => {
    const textarea = document.getElementById('responseBody') as HTMLTextAreaElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = responseBody.substring(0, start) + token + responseBody.substring(end);
    setResponseBody(newValue);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  };

  const isDark = theme === 'dark';

  return (
    <div className={`${isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-lg p-6`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">
          {editingMockId ? 'Edit Mock' : 'Create New Mock'}
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={handleCancel}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
              isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : 'Save Mock'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Mock Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Get User Profile"
            className={`w-full px-4 py-2 rounded-lg border ${
              isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
            }`}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">HTTP Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
            >
              {HTTP_METHODS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Status Code</label>
            <input
              type="number"
              value={responseStatus}
              onChange={(e) => setResponseStatus(parseInt(e.target.value || '0', 10))}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Path</label>
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/api/users/:id"
            className={`w-full px-4 py-2 rounded-lg border ${
              isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
            }`}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium">Response Body</label>
            <button
              onClick={() => setShowTokenHelper(!showTokenHelper)}
              className={`text-xs px-2 py-1 rounded ${
                isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <Info className="w-3 h-3 inline mr-1" />
              Tokens
            </button>
          </div>
          {showTokenHelper && (
            <div className={`mb-2 p-3 rounded-lg text-sm ${isDark ? 'bg-gray-700' : 'bg-blue-50'}`}>
              <p className="font-medium mb-2">Available Dynamic Tokens:</p>
              <div className="space-y-1">
                {[
                  '{{timestamp}}',
                  '{{uuid}}',
                  '{{randomInt(1,100)}}',
                ].map(token => (
                  <button
                    key={token}
                    onClick={() => insertToken(token)}
                    className={`block w-full text-left px-2 py-1 rounded ${
                      isDark ? 'hover:bg-gray-600' : 'hover:bg-blue-100'
                    }`}
                  >
                    <code>{token}</code>
                  </button>
                ))}
              </div>
            </div>
          )}
          <textarea
            id="responseBody"
            value={responseBody}
            onChange={(e) => setResponseBody(e.target.value)}
            rows={10}
            className={`w-full px-4 py-2 rounded-lg border font-mono text-sm ${
              isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
            }`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Response Headers</label>
          {headers.map((header, idx) => (
            <div key={idx} className="flex space-x-2 mb-2">
              <input
                type="text"
                value={header.key}
                onChange={(e) => {
                  const newHeaders = [...headers];
                  newHeaders[idx].key = e.target.value;
                  setHeaders(newHeaders);
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
                  const newHeaders = [...headers];
                  newHeaders[idx].value = e.target.value;
                  setHeaders(newHeaders);
                }}
                placeholder="Header value"
                className={`flex-1 px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
              />
              <button
                onClick={() => setHeaders(headers.filter((_, i) => i !== idx))}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => setHeaders([...headers, { key: '', value: '' }])}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
              isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Add Header</span>
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Response Delay (ms): {delay}</label>
          <input
            type="range"
            min="0"
            max="5000"
            step="100"
            value={delay}
            onChange={(e) => setDelay(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <h3 className="font-medium mb-4">Match Conditions (Optional)</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Body Contains</label>
              <input
                type="text"
                value={bodyContains}
                onChange={(e) => setBodyContains(e.target.value)}
                placeholder="Text that must be in request body"
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-300'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Path Pattern</label>
              <input
                type="text"
                value={pathPattern}
                onChange={(e) => setPathPattern(e.target.value)}
                placeholder="e.g., /api/users/*"
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-300'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Required Query Parameters</label>
              {queryParams.map((param, idx) => (
                <div key={idx} className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={param.key}
                    onChange={(e) => {
                      const newParams = [...queryParams];
                      newParams[idx].key = e.target.value;
                      setQueryParams(newParams);
                    }}
                    placeholder="Parameter name"
                    className={`flex-1 px-4 py-2 rounded-lg border ${
                      isDark ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-300'
                    }`}
                  />
                  <input
                    type="text"
                    value={param.value}
                    onChange={(e) => {
                      const newParams = [...queryParams];
                      newParams[idx].value = e.target.value;
                      setQueryParams(newParams);
                    }}
                    placeholder="Parameter value"
                    className={`flex-1 px-4 py-2 rounded-lg border ${
                      isDark ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-300'
                    }`}
                  />
                  <button
                    onClick={() => setQueryParams(queryParams.filter((_, i) => i !== idx))}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setQueryParams([...queryParams, { key: '', value: '' }])}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 text-sm ${
                  isDark ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Add Query Param</span>
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Required Headers</label>
              {requiredHeaders.map((header, idx) => (
                <div key={idx} className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={header.key}
                    onChange={(e) => {
                      const newHeaders = [...requiredHeaders];
                      newHeaders[idx].key = e.target.value;
                      setRequiredHeaders(newHeaders);
                    }}
                    placeholder="Header name"
                    className={`flex-1 px-4 py-2 rounded-lg border ${
                      isDark ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-300'
                    }`}
                  />
                  <input
                    type="text"
                    value={header.value}
                    onChange={(e) => {
                      const newHeaders = [...requiredHeaders];
                      newHeaders[idx].value = e.target.value;
                      setRequiredHeaders(newHeaders);
                    }}
                    placeholder="Header value"
                    className={`flex-1 px-4 py-2 rounded-lg border ${
                      isDark ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-300'
                    }`}
                  />
                  <button
                    onClick={() => setRequiredHeaders(requiredHeaders.filter((_, i) => i !== idx))}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setRequiredHeaders([...requiredHeaders, { key: '', value: '' }])}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 text-sm ${
                  isDark ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Add Required Header</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
