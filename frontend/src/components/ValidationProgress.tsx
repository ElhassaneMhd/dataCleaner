import { useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import type { JobStatus } from '../types';

interface ValidationProgressProps {
  jobId: string;
  onComplete: () => void;
}

export default function ValidationProgress({ jobId, onComplete }: ValidationProgressProps) {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);

  const wsUrl = jobId ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:8080/ws/${jobId}` : null;

  const { isConnected } = useWebSocket<JobStatus>(wsUrl, {
    onMessage: (data) => {
      setJobStatus(data);
      if (data.status === 'completed') {
        onComplete();
      }
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    },
    reconnectAttempts: 5,
    reconnectInterval: 2000,
  });

  if (!jobStatus) return null;

  const progressPercentage = Math.round(jobStatus.progress);

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Email Validation in Progress</h2>
              <p className="text-indigo-100">Processing your data with advanced verification</p>
            </div>
            <div className="flex items-center space-x-3">
              {jobStatus.status === 'processing' && (
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <svg className="animate-spin h-7 w-7 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                </div>
              )}
              {isConnected && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-white/80">Live</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="p-8">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Overall Progress</span>
              <span className="text-2xl font-bold text-indigo-600">{progressPercentage}%</span>
            </div>
            <div className="relative w-full h-6 bg-gray-200 rounded-full overflow-hidden shadow-inner">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out rounded-full shadow-lg"
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
              </div>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Total Records */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 transform transition-all hover:scale-105">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <p className="text-sm font-medium text-blue-600 uppercase tracking-wide mb-1">Total Records</p>
              <p className="text-3xl font-bold text-blue-900">{jobStatus.totalRecords.toLocaleString()}</p>
            </div>

            {/* Processed */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 transform transition-all hover:scale-105">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <p className="text-sm font-medium text-purple-600 uppercase tracking-wide mb-1">Processed</p>
              <p className="text-3xl font-bold text-purple-900">{jobStatus.processedRecords.toLocaleString()}</p>
            </div>

            {/* Valid */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-6 rounded-xl border border-green-200 transform transition-all hover:scale-105">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-sm font-medium text-green-600 uppercase tracking-wide mb-1">Valid Emails</p>
              <p className="text-3xl font-bold text-green-900">{jobStatus.validEmails.toLocaleString()}</p>
            </div>

            {/* Invalid */}
            <div className="bg-gradient-to-br from-red-50 to-rose-100 p-6 rounded-xl border border-red-200 transform transition-all hover:scale-105">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 rounded-lg bg-red-500 flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-sm font-medium text-red-600 uppercase tracking-wide mb-1">Invalid Emails</p>
              <p className="text-3xl font-bold text-red-900">{jobStatus.invalidEmails.toLocaleString()}</p>
            </div>
          </div>

          {/* Validation Steps */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Syntax Check</p>
                <p className="text-xs text-gray-600">Validating email format</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-purple-600 font-bold">2</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">DNS/MX Lookup</p>
                <p className="text-xs text-gray-600">Verifying mail servers</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 font-bold">3</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">SMTP Verification</p>
                <p className="text-xs text-gray-600">Testing deliverability</p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {jobStatus.errorMessage && (
            <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg animate-shake">
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 font-medium">{jobStatus.errorMessage}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
