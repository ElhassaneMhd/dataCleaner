import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMXGroupsList, downloadSelectedMXGroups } from '../services/api';

interface MXGroupsActionModalProps {
  jobId: string;
  selectedMXGroups: Set<string>;
  onClose: () => void;
}

export default function MXGroupsActionModal({ jobId, selectedMXGroups, onClose }: MXGroupsActionModalProps) {
  const [activeAction, setActiveAction] = useState<'selected' | 'range'>('selected');
  const [selectedRange, setSelectedRange] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  // Fetch all MX groups to filter by range
  const { data: mxGroupsData } = useQuery({
    queryKey: ['mx-groups-all', jobId],
    queryFn: () => getMXGroupsList(jobId, 1, 1000), // Get all groups
    enabled: !!jobId && activeAction === 'range',
  });

  const handleExportByRange = async (format: 'csv' | 'excel') => {
    if (!mxGroupsData || !selectedRange) return;

    setIsExporting(true);
    try {
      let filteredGroups: string[] = [];

      switch (selectedRange) {
        case '1-2':
          filteredGroups = mxGroupsData.mxGroups
            .filter(g => g.count >= 1 && g.count <= 2)
            .map(g => g.mxRecord);
          break;
        case '3-10':
          filteredGroups = mxGroupsData.mxGroups
            .filter(g => g.count >= 3 && g.count <= 10)
            .map(g => g.mxRecord);
          break;
        case '11-50':
          filteredGroups = mxGroupsData.mxGroups
            .filter(g => g.count >= 11 && g.count <= 50)
            .map(g => g.mxRecord);
          break;
        case '51-100':
          filteredGroups = mxGroupsData.mxGroups
            .filter(g => g.count >= 51 && g.count <= 100)
            .map(g => g.mxRecord);
          break;
        case '101-500':
          filteredGroups = mxGroupsData.mxGroups
            .filter(g => g.count >= 101 && g.count <= 500)
            .map(g => g.mxRecord);
          break;
        case '500+':
          filteredGroups = mxGroupsData.mxGroups
            .filter(g => g.count > 500)
            .map(g => g.mxRecord);
          break;
      }

      if (filteredGroups.length > 0) {
        await downloadSelectedMXGroups(jobId, filteredGroups, format);
        onClose();
      }
    } finally {
      setIsExporting(false);
    }
  };

  const getRangeCount = (range: string): number => {
    if (!mxGroupsData) return 0;

    switch (range) {
      case '1-2':
        return mxGroupsData.mxGroups.filter(g => g.count >= 1 && g.count <= 2).length;
      case '3-10':
        return mxGroupsData.mxGroups.filter(g => g.count >= 3 && g.count <= 10).length;
      case '11-50':
        return mxGroupsData.mxGroups.filter(g => g.count >= 11 && g.count <= 50).length;
      case '51-100':
        return mxGroupsData.mxGroups.filter(g => g.count >= 51 && g.count <= 100).length;
      case '101-500':
        return mxGroupsData.mxGroups.filter(g => g.count >= 101 && g.count <= 500).length;
      case '500+':
        return mxGroupsData.mxGroups.filter(g => g.count > 500).length;
      default:
        return 0;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">MX Groups Actions</h3>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Action Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveAction('selected')}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                activeAction === 'selected'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Selected Groups ({selectedMXGroups.size})
            </button>
            <button
              onClick={() => setActiveAction('range')}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                activeAction === 'range'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Filter by Count Range
            </button>
          </div>

          {/* Selected Groups Export */}
          {activeAction === 'selected' && (
            <div className="space-y-4">
              {selectedMXGroups.size > 0 ? (
                <>
                  <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                    <h4 className="font-bold text-purple-900 mb-2 flex items-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      <span>Export {selectedMXGroups.size} Selected MX Groups</span>
                    </h4>
                    <p className="text-sm text-purple-700 mb-4">
                      {selectedMXGroups.size === 1 ? 'Single file will be downloaded' : 'ZIP file with multiple files will be downloaded'}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          setIsExporting(true);
                          try {
                            await downloadSelectedMXGroups(jobId, Array.from(selectedMXGroups), 'csv');
                            onClose();
                          } finally {
                            setIsExporting(false);
                          }
                        }}
                        disabled={isExporting}
                        className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                      >
                        {isExporting ? 'Exporting...' : selectedMXGroups.size === 1 ? 'Download CSV' : 'Download ZIP (CSV)'}
                      </button>
                      <button
                        onClick={async () => {
                          setIsExporting(true);
                          try {
                            await downloadSelectedMXGroups(jobId, Array.from(selectedMXGroups), 'excel');
                            onClose();
                          } finally {
                            setIsExporting(false);
                          }
                        }}
                        disabled={isExporting}
                        className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                      >
                        {isExporting ? 'Exporting...' : selectedMXGroups.size === 1 ? 'Download Excel' : 'Download ZIP (Excel)'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-gray-600 font-medium">No MX groups selected</p>
                  <p className="text-gray-500 text-sm mt-1">Select MX groups using checkboxes in the list</p>
                </div>
              )}
            </div>
          )}

          {/* Range Filter Export */}
          {activeAction === 'range' && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4 mb-4">
                <h4 className="font-bold text-indigo-900 mb-2">Filter MX Groups by Email Count</h4>
                <p className="text-sm text-indigo-700">
                  Download MX groups that fall within specific email count ranges
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { value: '1-2', label: '1-2 emails', description: 'Very small groups' },
                  { value: '3-10', label: '3-10 emails', description: 'Small groups' },
                  { value: '11-50', label: '11-50 emails', description: 'Medium groups' },
                  { value: '51-100', label: '51-100 emails', description: 'Large groups' },
                  { value: '101-500', label: '101-500 emails', description: 'Very large groups' },
                  { value: '500+', label: '500+ emails', description: 'Extra large groups' },
                ].map((range) => {
                  const count = getRangeCount(range.value);
                  return (
                    <div
                      key={range.value}
                      onClick={() => setSelectedRange(range.value)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedRange === range.value
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            checked={selectedRange === range.value}
                            onChange={() => setSelectedRange(range.value)}
                            className="w-5 h-5 text-indigo-600"
                          />
                          <div>
                            <p className="font-semibold text-gray-900">{range.label}</p>
                            <p className="text-xs text-gray-600">{range.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-indigo-600">{count}</p>
                          <p className="text-xs text-gray-600">groups</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedRange && getRangeCount(selectedRange) > 0 && (
                <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-indigo-900 font-semibold mb-3">
                    Export {getRangeCount(selectedRange)} MX groups in this range
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExportByRange('csv')}
                      disabled={isExporting}
                      className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                    >
                      {isExporting ? 'Exporting...' : 'Download ZIP (CSV)'}
                    </button>
                    <button
                      onClick={() => handleExportByRange('excel')}
                      disabled={isExporting}
                      className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                    >
                      {isExporting ? 'Exporting...' : 'Download ZIP (Excel)'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
