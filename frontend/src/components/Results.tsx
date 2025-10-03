import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getValidationResults, getMXGroupsList, getMXGroupPaginated } from '../services/api';
import type { ValidationResults, MXGroup } from '../types';

interface ResultsProps {
  jobId: string;
  onOpenExport: () => void;
  onOpenMXActions: () => void;
  selectedMXGroups: Set<string>;
  setSelectedMXGroups: (groups: Set<string>) => void;
}

export default function Results({ jobId, onOpenExport, onOpenMXActions, selectedMXGroups, setSelectedMXGroups }: ResultsProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'mx'>('summary');
  const [selectedMX, setSelectedMX] = useState<string | null>(null);
  const [mxGroupsPage, setMxGroupsPage] = useState(1);
  const [emailsPage, setEmailsPage] = useState(1);

  const { data, isLoading, error } = useQuery<ValidationResults>({
    queryKey: ['results', jobId],
    queryFn: () => getValidationResults(jobId),
    enabled: !!jobId,
    retry: 3,
    retryDelay: 1000,
  });

  // Paginated MX groups list
  const { data: mxGroupsList, isLoading: mxGroupsLoading } = useQuery({
    queryKey: ['mx-groups', jobId, mxGroupsPage],
    queryFn: () => getMXGroupsList(jobId, mxGroupsPage, 10),
    enabled: !!jobId && activeTab === 'mx' && !selectedMX,
  });

  // Paginated emails for selected MX group
  const { data: mxGroupData } = useQuery({
    queryKey: ['mx-group', jobId, selectedMX, emailsPage],
    queryFn: () => getMXGroupPaginated(jobId, selectedMX!, emailsPage, 10),
    enabled: !!selectedMX,
  });

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12">
          <div className="flex flex-col justify-center items-center">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 font-medium text-lg">Loading results...</p>
            <p className="text-gray-500 text-sm mt-2">This may take a few moments</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8">
          <div className="flex items-center space-x-3">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-red-800 font-bold text-lg">Failed to load results</p>
              <p className="text-red-600 text-sm">Please try refreshing the page</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Validation Complete ✓</h2>
              <p className="text-emerald-100 text-sm">Results ready for export</p>
            </div>
            <button
              onClick={onOpenExport}
              className="px-6 py-3 bg-white text-emerald-600 rounded-lg font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export Data</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'summary'
                  ? 'border-emerald-500 text-emerald-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Summary</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('mx')}
              className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'mx'
                  ? 'border-blue-500 text-blue-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
                <span>MX Groups ({data.summary.mxGroupCount})</span>
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-200">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-blue-700 mb-1">Total Processed</p>
                  <p className="text-3xl font-bold text-blue-900">{data.summary.totalProcessed.toLocaleString()}</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-5 rounded-xl border border-green-200">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-green-700 mb-1">Valid Emails</p>
                  <p className="text-3xl font-bold text-green-900">{data.validCount.toLocaleString()}</p>
                  <p className="text-xs text-green-600 mt-1">
                    {((data.validCount / data.summary.totalProcessed) * 100).toFixed(1)}% success rate
                  </p>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-rose-100 p-5 rounded-xl border border-red-200">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-red-700 mb-1">Invalid Emails</p>
                  <p className="text-3xl font-bold text-red-900">{data.invalidCount.toLocaleString()}</p>
                  <p className="text-xs text-red-600 mt-1">
                    {((data.invalidCount / data.summary.totalProcessed) * 100).toFixed(1)}% failed
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-indigo-100 p-5 rounded-xl border border-purple-200">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-purple-700 mb-1">MX Groups</p>
                  <p className="text-3xl font-bold text-purple-900">{data.summary.mxGroupCount}</p>
                  <p className="text-xs text-purple-600 mt-1">Unique mail servers</p>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">Export your data</p>
                    <p>Use the export buttons above to download valid emails in CSV or Excel format. MX Groups exports all emails organized by mail server (as separate files in a ZIP).</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mx' && (
            <div className="space-y-4">
              {!selectedMX ? (
                // MX Groups List (sorted by count - largest first)
                <>
                  {/* MX Actions Button */}
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-600">
                      {selectedMXGroups.size > 0 ? `${selectedMXGroups.size} groups selected` : 'Select groups using checkboxes'}
                    </p>
                    <button
                      onClick={onOpenMXActions}
                      className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                      <span>MX Actions</span>
                    </button>
                  </div>

                  {mxGroupsLoading ? (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading MX groups...</p>
                    </div>
                  ) : mxGroupsList?.mxGroups.map((group: MXGroup, idx: number) => (
                    <div key={idx} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 overflow-hidden hover:shadow-md transition-all duration-200">
                      <div className="px-5 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedMXGroups.has(group.mxRecord)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedMXGroups);
                                if (e.target.checked) {
                                  newSelected.add(group.mxRecord);
                                } else {
                                  newSelected.delete(group.mxRecord);
                                }
                                setSelectedMXGroups(newSelected);
                              }}
                              className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{group.mxRecord}</p>
                              <p className="text-xs text-gray-600">{group.count.toLocaleString()} emails</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            {group.sendingSMTPTest !== undefined && (
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                group.sendingSMTPTest
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {group.sendingSMTPTest ? '✓ Reachable' : '✗ Not Reachable'}
                              </span>
                            )}
                            <span className="text-sm font-bold text-blue-600">
                              {((group.count / data.validCount) * 100).toFixed(1)}%
                            </span>
                            <button
                              onClick={() => {
                                setSelectedMX(group.mxRecord);
                                setEmailsPage(1);
                              }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
                            >
                              View Emails
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* MX Groups Pagination */}
                  {mxGroupsList && mxGroupsList.totalPages > 1 && (
                    <div className="flex items-center justify-center space-x-3 mt-6">
                      <button
                        onClick={() => setMxGroupsPage(p => Math.max(1, p - 1))}
                        disabled={mxGroupsPage === 1}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-700 font-medium bg-gray-100 px-4 py-2 rounded-lg">
                        Page {mxGroupsPage} of {mxGroupsList.totalPages}
                      </span>
                      <button
                        onClick={() => setMxGroupsPage(p => Math.min(mxGroupsList.totalPages, p + 1))}
                        disabled={mxGroupsPage === mxGroupsList.totalPages}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  )}

                  {mxGroupsList?.mxGroups.length === 0 && (
                    <div className="text-center py-12">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-gray-500 font-medium mt-3">No MX groups found</p>
                    </div>
                  )}
                </>
              ) : (
                // Paginated Email List for Selected MX
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => {
                        setSelectedMX(null);
                        setEmailsPage(1);
                      }}
                      className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      <span>Back to MX Groups</span>
                    </button>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h3 className="font-bold text-lg text-blue-900 mb-1">{selectedMX}</h3>
                    {mxGroupData && (
                      <p className="text-sm text-blue-700">
                        Total: {mxGroupData.totalEmails.toLocaleString()} emails •
                        Page {mxGroupData.page} of {mxGroupData.totalPages}
                      </p>
                    )}
                  </div>

                  {mxGroupData && (
                    <>
                      {/* Debug Info */}
                      <div className="bg-gray-100 p-3 rounded text-xs font-mono mb-2">
                        Debug: Showing {mxGroupData.emails.length} emails on page {mxGroupData.page} of {mxGroupData.totalPages} (Total: {mxGroupData.totalEmails})
                      </div>

                      {/* Email List */}
                      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        {mxGroupData.emails.length > 0 ? (
                          mxGroupData.emails.map((email: string, idx: number) => (
                            <div key={idx} className={`px-4 py-3 ${idx !== mxGroupData.emails.length - 1 ? 'border-b border-gray-100' : ''}`}>
                              <p className="text-sm text-gray-800 font-mono">{email}</p>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-8 text-center text-gray-500">
                            No emails on this page
                          </div>
                        )}
                      </div>

                      {/* Pagination Controls */}
                      {mxGroupData.totalPages > 1 && (
                        <div className="flex items-center justify-center space-x-3 mt-4">
                          <button
                            onClick={() => setEmailsPage(p => Math.max(1, p - 1))}
                            disabled={emailsPage === 1}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                          >
                            Previous
                          </button>
                          <span className="text-sm text-gray-700 font-medium bg-gray-100 px-4 py-2 rounded-lg">
                            Page {emailsPage} of {mxGroupData.totalPages}
                          </span>
                          <button
                            onClick={() => setEmailsPage(p => Math.min(mxGroupData.totalPages, p + 1))}
                            disabled={emailsPage === mxGroupData.totalPages}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
