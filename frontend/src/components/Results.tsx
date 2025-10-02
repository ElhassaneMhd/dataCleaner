import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getValidationResults, downloadValidEmails, downloadMXGrouped } from '../services/api';
import type { ValidationResults, MXGroup } from '../types';

interface ResultsProps {
  jobId: string;
}

export default function Results({ jobId }: ResultsProps) {
  const [activeTab, setActiveTab] = useState<'valid' | 'invalid' | 'mx'>('valid');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading } = useQuery<ValidationResults>({
    queryKey: ['results', jobId],
    queryFn: () => getValidationResults(jobId),
    enabled: !!jobId,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center p-16">
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 font-medium">Loading results...</p>
      </div>
    );
  }

  if (!data) return null;

  const filteredValidEmails = data.validEmails.filter(email =>
    email.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInvalidEmails = data.invalidEmails.filter(email =>
    email.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Validation Complete</h2>
              <p className="text-emerald-100">Review and export your validated email data</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => downloadValidEmails(jobId, 'csv')}
                className="px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>CSV</span>
              </button>
              <button
                onClick={() => downloadValidEmails(jobId, 'excel')}
                className="px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Excel</span>
              </button>
              <button
                onClick={() => downloadMXGrouped(jobId, 'csv')}
                className="px-5 py-2.5 bg-white text-emerald-600 rounded-lg font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>MX Groups (ZIP)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('valid')}
              className={`px-8 py-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'valid'
                  ? 'border-emerald-500 text-emerald-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Valid Emails ({data.validEmails.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('invalid')}
              className={`px-8 py-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'invalid'
                  ? 'border-red-500 text-red-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Invalid Emails ({data.invalidEmails.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('mx')}
              className={`px-8 py-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'mx'
                  ? 'border-blue-500 text-blue-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>MX Groups ({data.mxGroups.length})</span>
              </div>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {(activeTab === 'valid' || activeTab === 'invalid') && (
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <div className="max-w-md">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Search emails..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-8">
          {activeTab === 'valid' && (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {filteredValidEmails.map((result, idx) => (
                <div key={idx} className="group bg-gradient-to-r from-green-50 to-emerald-50 p-5 rounded-xl border border-green-200 hover:shadow-lg transition-all duration-200 hover:scale-[1.01]">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 flex items-center space-x-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shadow-md">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-bold text-gray-900 break-all">{result.email}</p>
                        <p className="text-sm text-gray-600 mt-1 flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                          </svg>
                          <span className="font-medium">MX: {result.mxRecord}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-700 shadow-sm">
                        ✓ Verified
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {filteredValidEmails.length === 0 && (
                <div className="text-center py-16">
                  <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="mt-4 text-gray-500 font-medium">No valid emails found</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'invalid' && (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {filteredInvalidEmails.map((result, idx) => (
                <div key={idx} className="bg-gradient-to-r from-red-50 to-rose-50 p-6 rounded-xl border border-red-200 hover:shadow-lg transition-all duration-200">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500 flex items-center justify-center shadow-md">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-bold text-gray-900 break-all mb-3">{result.email}</p>
                      <div className="bg-white/60 backdrop-blur-sm p-4 rounded-lg border border-red-200 mb-4">
                        <p className="text-sm font-semibold text-red-700 mb-1 flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span>Validation Error:</span>
                        </p>
                        <p className="text-sm text-red-600">{result.errorReason || 'Email validation failed'}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <div className="flex items-center space-x-2 px-3 py-2 bg-white rounded-lg border border-gray-200">
                          <span className="text-xs font-semibold text-gray-600">Syntax:</span>
                          <span className={`px-2 py-1 text-xs font-bold rounded ${result.syntaxValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {result.syntaxValid ? '✓ Pass' : '✗ Fail'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 px-3 py-2 bg-white rounded-lg border border-gray-200">
                          <span className="text-xs font-semibold text-gray-600">DNS:</span>
                          <span className={`px-2 py-1 text-xs font-bold rounded ${result.dnsValid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {result.dnsValid ? '✓ Pass' : '✗ Fail'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 px-3 py-2 bg-white rounded-lg border border-gray-200">
                          <span className="text-xs font-semibold text-gray-600">SMTP:</span>
                          <span className={`px-2 py-1 text-xs font-bold rounded ${result.smtpValid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {result.smtpValid ? '✓ Pass' : '✗ Fail'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredInvalidEmails.length === 0 && (
                <div className="text-center py-16">
                  <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="mt-4 text-gray-500 font-medium">No invalid emails found</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'mx' && (
            <div className="space-y-5 max-h-[600px] overflow-y-auto pr-2">
              {data.mxGroups.map((group: MXGroup, idx: number) => (
                <div key={idx} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 overflow-hidden hover:shadow-xl transition-all duration-200">
                  <div className="bg-white/80 backdrop-blur-sm px-6 py-4 border-b border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center shadow-md">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">{group.mxRecord}</h3>
                          <p className="text-sm text-gray-600">Mail Server</p>
                        </div>
                      </div>
                      <span className="px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-full shadow-md">
                        {group.count} emails
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex flex-wrap gap-2">
                      {group.emails.slice(0, 15).map((email, emailIdx) => (
                        <span
                          key={emailIdx}
                          className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                        >
                          {email}
                        </span>
                      ))}
                      {group.emails.length > 15 && (
                        <span className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-bold rounded-lg shadow-md">
                          +{group.emails.length - 15} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {data.mxGroups.length === 0 && (
                <div className="text-center py-16">
                  <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <p className="mt-4 text-gray-500 font-medium">No MX groups found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
