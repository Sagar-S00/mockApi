import { useState, useEffect } from 'react';
import { Search, Edit, Trash2, Copy, Play, Plus, Download, Upload, Filter } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { mockApi } from '../utils/api';
import { Mock } from '../types';

export function MockLibrary() {
  const { theme, setCurrentView, setEditingMockId, setTesterPreset, showToast } = useApp();
  const [mocks, setMocks] = useState<Mock[]>([]);
  const [filteredMocks, setFilteredMocks] = useState<Mock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [selectedMocks, setSelectedMocks] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [pendingDeleteMock, setPendingDeleteMock] = useState<Mock | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);

  useEffect(() => {
    loadMocks();
  }, []);

  useEffect(() => {
    filterMocks();
  }, [searchQuery, methodFilter, mocks]);

  const loadMocks = async () => {
    try {
      setLoading(true);
      const response = await mockApi.list();
      setMocks(response.items);
    } catch (err) {
      console.error('Failed to load mocks:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterMocks = () => {
    let filtered = [...mocks];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        m => m.name.toLowerCase().includes(query) || m.path.toLowerCase().includes(query)
      );
    }

    if (methodFilter !== 'ALL') {
      filtered = filtered.filter(m => m.method === methodFilter);
    }

    setFilteredMocks(filtered);
  };

  const handleDelete = (mock: Mock) => {
    setPendingDeleteMock(mock);
  };

  const confirmDeleteMock = async () => {
    if (!pendingDeleteMock) return;
    try {
      await mockApi.delete(pendingDeleteMock.id);
      showToast('Mock deleted', 'success');
      setPendingDeleteMock(null);
      await loadMocks();
    } catch (err) {
      console.error('Failed to delete mock:', err);
      showToast('Failed to delete mock', 'error');
    }
  };

  const handleEdit = (id: string) => {
    setEditingMockId(id);
    setCurrentView('designer');
  };

  const handleClone = async (mock: Mock) => {
    try {
      const clonedMock = {
        name: `${mock.name} (Copy)`,
        method: mock.method,
        path: mock.path,
        responseStatus: mock.responseStatus,
        responseBody: mock.responseBody,
        responseHeaders: mock.responseHeaders,
        delay: mock.delay,
        matchConditions: mock.matchConditions,
        createdByChatId: mock.createdByChatId ?? undefined,
      };
      await mockApi.create(clonedMock);
      await loadMocks();
    } catch (err) {
      console.error('Failed to clone mock:', err);
    }
  };

  const handleTest = (mock: Mock) => {
    const ensureLeadingSlash = (value: string) =>
      value.startsWith('/') ? value : `/${value}`;

    const sampleValue = (param: string) => {
      const lower = param.toLowerCase();
      if (lower.includes('id')) return '1';
      if (lower.includes('email')) return 'user@example.com';
      if (lower.includes('date')) return '2025-01-01';
      return 'sample';
    };

    let path = `/mock${ensureLeadingSlash(mock.path)}`;
    path = path.replace(/:([A-Za-z0-9_]+)/g, (_match, param: string) => sampleValue(param));

    const headers: Array<{ key: string; value: string }> = [];
    const matchConditions = mock.matchConditions;

    if (matchConditions?.headersContain) {
      for (const [key, value] of Object.entries(matchConditions.headersContain)) {
        headers.push({ key, value: String(value) });
      }
    }

    if (matchConditions?.queryContains) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(matchConditions.queryContains)) {
        params.set(key, String(value));
      }
      const query = params.toString();
      if (query) {
        path += path.includes('?') ? `&${query}` : `?${query}`;
      }
    }

    let body: string | undefined;
    if (matchConditions?.bodyContains && Object.keys(matchConditions.bodyContains).length > 0) {
      body = JSON.stringify(matchConditions.bodyContains, null, 2);
    }

    const hasContentType = headers.some(
      (header) => header.key.toLowerCase() === 'content-type'
    );
    if (!hasContentType && (body || ['POST', 'PUT', 'PATCH'].includes(mock.method))) {
      headers.push({ key: 'Content-Type', value: 'application/json' });
    }

    setTesterPreset({
      method: mock.method,
      path,
      headers: headers.length ? headers : undefined,
      body,
    });
    setCurrentView('tester');
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(mocks, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `mocks-${new Date().toISOString()}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const importedMocks = JSON.parse(e.target?.result as string);
          for (const mock of importedMocks) {
            await mockApi.create({ ...mock, id: undefined });
          }
          await loadMocks();
        } catch (err) {
          console.error('Failed to import mocks:', err);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const toggleSelectMock = (id: string) => {
    const newSelected = new Set(selectedMocks);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedMocks(newSelected);
  };

  const handleBulkDelete = () => {
    if (!selectedMocks.size) return;
    setPendingBulkDelete(true);
  };

  const confirmBulkDelete = async () => {
    try {
      for (const id of selectedMocks) {
        await mockApi.delete(id);
      }
      showToast('Selected mocks deleted', 'success');
      setSelectedMocks(new Set());
      setPendingBulkDelete(false);
      await loadMocks();
    } catch (err) {
      console.error('Failed to delete mocks:', err);
      showToast('Failed to delete selected mocks', 'error');
    }
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-green-100 text-green-800',
      POST: 'bg-blue-100 text-blue-800',
      PUT: 'bg-yellow-100 text-yellow-800',
      PATCH: 'bg-orange-100 text-orange-800',
      DELETE: 'bg-red-100 text-red-800',
      OPTIONS: 'bg-gray-100 text-gray-800',
    };
    return colors[method] || 'bg-gray-100 text-gray-800';
  };

  const isDark = theme === 'dark';

  return (
    <>
    <div className={`${isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-lg p-6`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Mock Library</h2>
        <div className="flex space-x-2">
          <button
            onClick={handleImport}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
              isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Import</span>
          </button>
          <button
            onClick={handleExport}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
              isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button
            onClick={() => {
              setEditingMockId(null);
              setCurrentView('designer');
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Mock</span>
          </button>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex space-x-4">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search mocks by name or path..."
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
              isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>

        {showFilters && (
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <label className="block text-sm font-medium mb-2">HTTP Method</label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className={`px-4 py-2 rounded-lg border ${
                isDark ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-300'
              }`}
            >
              <option value="ALL">All Methods</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
              <option value="OPTIONS">OPTIONS</option>
            </select>
          </div>
        )}
      </div>

      {selectedMocks.size > 0 && (
        <div className={`mb-4 p-4 rounded-lg flex justify-between items-center ${
          isDark ? 'bg-blue-900' : 'bg-blue-50'
        }`}>
          <span>{selectedMocks.size} mock(s) selected</span>
          <button
            onClick={handleBulkDelete}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center space-x-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Selected</span>
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4">Loading mocks...</p>
        </div>
      ) : filteredMocks.length === 0 ? (
        <div className="text-center py-12">
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            {searchQuery || methodFilter !== 'ALL'
              ? 'No mocks match your filters'
              : 'No mocks created yet. Create your first mock to get started!'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedMocks.size === filteredMocks.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMocks(new Set(filteredMocks.map(m => m.id)));
                      } else {
                        setSelectedMocks(new Set());
                      }
                    }}
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Method</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Path</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Hit Count</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Last Accessed</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Source</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className={`${isDark ? 'divide-gray-700' : 'divide-gray-200'} divide-y`}>
              {filteredMocks.map((mock) => (
                <tr key={mock.id} className={isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedMocks.has(mock.id)}
                      onChange={() => toggleSelectMock(mock.id)}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{mock.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getMethodColor(mock.method)}`}>
                      {mock.method}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">{mock.path}</td>
                  <td className="px-4 py-3">{mock.hitCount || 0}</td>
                  <td className="px-4 py-3 text-sm">
                    {mock.lastAccessed ? new Date(mock.lastAccessed).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      mock.source === 'ai'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {mock.source === 'ai' ? 'AI' : 'Manual'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleTest(mock)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Test"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(mock.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleClone(mock)}
                        className="p-2 text-yellow-600 hover:bg-yellow-50 rounded"
                        title="Clone"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    <button
                      onClick={() => handleDelete(mock)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>

    {pendingDeleteMock && (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
        <div
          className={`w-full max-w-md rounded-2xl shadow-2xl border ${
            isDark ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200'
          }`}
        >
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Delete mock?</h3>
            <p className="text-sm leading-relaxed">
              This will permanently delete <span className="font-medium">{pendingDeleteMock.name}</span>.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setPendingDeleteMock(null)}
                className={`px-4 py-2 rounded-lg ${
                  isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteMock}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {pendingBulkDelete && (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
        <div
          className={`w-full max-w-md rounded-2xl shadow-2xl border ${
            isDark ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200'
          }`}
        >
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Delete selected mocks?</h3>
            <p className="text-sm leading-relaxed">
              This will permanently remove {selectedMocks.size} mock{selectedMocks.size === 1 ? '' : 's'}. This action
              cannot be undone.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setPendingBulkDelete(false)}
                className={`px-4 py-2 rounded-lg ${
                  isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkDelete}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
