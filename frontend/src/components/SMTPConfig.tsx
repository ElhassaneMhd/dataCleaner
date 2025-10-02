import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getSMTPConfig, updateSMTPConfig } from '../services/api';

interface SMTPConfigProps {
  onClose: () => void;
}

interface SMTPSettings {
  fromEmail: string;
  heloHostname: string;
  smtpEnabled: boolean;
  bypassBlacklist: boolean;
}

export default function SMTPConfig({ onClose }: SMTPConfigProps) {
  const [config, setConfig] = useState<SMTPSettings>({
    fromEmail: 'verify@datacleaner.local',
    heloHostname: 'datacleaner.local',
    smtpEnabled: true,
    bypassBlacklist: true,
  });

  const { data: currentConfig, isLoading } = useQuery({
    queryKey: ['smtpConfig'],
    queryFn: getSMTPConfig,
    onSuccess: (data: SMTPSettings) => {
      setConfig(data);
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateSMTPConfig,
    onSuccess: () => {
      setTimeout(() => onClose(), 1500);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(config);
  };

  const handlePreset = (preset: 'disabled' | 'bypass' | 'strict') => {
    switch (preset) {
      case 'disabled':
        setConfig({ ...config, smtpEnabled: false });
        break;
      case 'bypass':
        setConfig({ ...config, smtpEnabled: true, bypassBlacklist: true });
        break;
      case 'strict':
        setConfig({ ...config, smtpEnabled: true, bypassBlacklist: false });
        break;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">SMTP Configuration</h2>
              <p className="text-indigo-100 text-sm">Configure email validation settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading configuration...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Quick Presets */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Quick Presets</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => handlePreset('disabled')}
                    className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                  >
                    <div className="font-semibold text-gray-900 mb-1">Syntax + DNS</div>
                    <div className="text-xs text-gray-600">SMTP Disabled</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreset('bypass')}
                    className="p-4 border-2 border-green-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all text-left"
                  >
                    <div className="font-semibold text-gray-900 mb-1">Bypass Mode</div>
                    <div className="text-xs text-gray-600">Recommended</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreset('strict')}
                    className="p-4 border-2 border-red-200 rounded-xl hover:border-red-400 hover:bg-red-50 transition-all text-left"
                  >
                    <div className="font-semibold text-gray-900 mb-1">Strict Mode</div>
                    <div className="text-xs text-gray-600">Full SMTP</div>
                  </button>
                </div>
              </div>

              {/* From Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  From Email Address
                </label>
                <input
                  type="email"
                  value={config.fromEmail}
                  onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="verify@datacleaner.local"
                />
                <p className="text-xs text-gray-500 mt-1">Email address used in SMTP MAIL FROM command</p>
              </div>

              {/* HELO Hostname */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  HELO Hostname
                </label>
                <input
                  type="text"
                  value={config.heloHostname}
                  onChange={(e) => setConfig({ ...config, heloHostname: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="datacleaner.local"
                />
                <p className="text-xs text-gray-500 mt-1">Hostname used in SMTP HELO command</p>
              </div>

              {/* SMTP Enabled Toggle */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="font-semibold text-gray-900">Enable SMTP Validation</div>
                    <div className="text-sm text-gray-600">Perform actual SMTP connection tests</div>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={config.smtpEnabled}
                      onChange={(e) => setConfig({ ...config, smtpEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-8 bg-gray-300 peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                  </div>
                </label>
              </div>

              {/* Bypass Blacklist Toggle */}
              {config.smtpEnabled && (
                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="font-semibold text-gray-900">Bypass Blacklist Errors</div>
                      <div className="text-sm text-gray-600">Mark emails as valid if blacklisted by Spamhaus</div>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={config.bypassBlacklist}
                        onChange={(e) => setConfig({ ...config, bypassBlacklist: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-8 bg-gray-300 peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-yellow-500"></div>
                    </div>
                  </label>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-700">
                    <p className="font-semibold mb-1">Current IP: 41.140.212.218</p>
                    <p>If blacklisted, enable "Bypass Blacklist Errors" or disable SMTP validation entirely.</p>
                  </div>
                </div>
              </div>

              {/* Success/Error Messages */}
              {updateMutation.isSuccess && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded animate-fadeIn">
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-green-700 font-medium">Configuration updated successfully!</p>
                  </div>
                </div>
              )}

              {updateMutation.isError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded animate-shake">
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <p className="text-red-700 font-medium">Failed to update configuration</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2"
                >
                  {updateMutation.isPending ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Save Configuration</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
