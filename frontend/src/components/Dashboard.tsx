import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import FileUpload from './FileUpload';
import ValidationProgress from './ValidationProgress';
import Results from './Results';
import SMTPConfig from './SMTPConfig';
import ExportModal from './ExportModal';
import MXGroupsActionModal from './MXGroupsActionModal';
import JobHistory from './JobHistory';
import ProfileModal from './ProfileModal';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [jobId, setJobId] = useState<string>('');
  const [showResults, setShowResults] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showMXActionsModal, setShowMXActionsModal] = useState(false);
  const [selectedMXGroups, setSelectedMXGroups] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'validate' | 'history'>('validate');

  const handleUploadSuccess = (newJobId: string) => {
    setJobId(newJobId);
    setShowResults(false);
  };

  const handleValidationComplete = () => {
    setShowResults(true);
  };

  const handleReset = () => {
    setJobId('');
    setShowResults(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                EmailValidator Pro
              </span>
            </div>

            {/* Navigation Tabs */}
            <div className="hidden md:flex space-x-1">
              <button
                onClick={() => setActiveTab('validate')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'validate'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Validate
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'history'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                History
              </button>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowConfig(true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              <div className="flex items-center space-x-3 pl-3 border-l border-gray-200">
                <div className="hidden sm:block text-right">
                  <div className="text-sm font-medium text-gray-900">{user?.name}</div>
                  <div className="text-xs text-gray-500">{user?.email}</div>
                </div>
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  title="Logout"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'validate' ? (
          <>
            {/* Welcome Header (only show when no job) */}
            {!jobId && (
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome back, {user?.name?.split(' ')[0]}! 👋
                </h1>
                <p className="text-lg text-gray-600">
                  Upload a file to start validating email addresses
                </p>
              </div>
            )}

            {/* Stats Cards (only show when no job) */}
            {!jobId && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Validated</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">1,234,567</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Success Rate</p>
                      <p className="text-2xl font-bold text-green-600 mt-1">98.5%</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Processing Speed</p>
                      <p className="text-2xl font-bold text-purple-600 mt-1">10x Faster</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Content Area */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {!jobId && <FileUpload onUploadSuccess={handleUploadSuccess} />}

              {jobId && !showResults && (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Validation Progress</h2>
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition text-sm font-medium"
                    >
                      ← Back
                    </button>
                  </div>
                  <ValidationProgress jobId={jobId} onComplete={handleValidationComplete} />
                </>
              )}

              {showResults && jobId && (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Validation Results</h2>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleReset}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                      >
                        New Validation
                      </button>
                      <button
                        onClick={() => setShowExportModal(true)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition text-sm font-medium"
                      >
                        Export Results
                      </button>
                    </div>
                  </div>
                  <Results
                    jobId={jobId}
                    onOpenExport={() => setShowExportModal(true)}
                    onOpenMXActions={() => setShowMXActionsModal(true)}
                    selectedMXGroups={selectedMXGroups}
                    setSelectedMXGroups={setSelectedMXGroups}
                  />
                </>
              )}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Validation History</h2>
            <JobHistory
              onSelectJob={(id) => {
                setJobId(id);
                setShowResults(true);
                setActiveTab('validate');
              }}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      {showConfig && <SMTPConfig onClose={() => setShowConfig(false)} />}

      {showExportModal && showResults && jobId && (
        <ExportModal jobId={jobId} onClose={() => setShowExportModal(false)} />
      )}

      {showMXActionsModal && showResults && jobId && (
        <MXGroupsActionModal
          jobId={jobId}
          selectedMXGroups={selectedMXGroups}
          onClose={() => setShowMXActionsModal(false)}
        />
      )}
    </div>
  );
}
