import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getSMTPConfig, updateSMTPConfig, type SMTPConfig as SMTPConfigType } from '../services/api';

interface SMTPConfigProps {
  onClose: () => void;
}

export default function SMTPConfig({ onClose }: SMTPConfigProps) {
  const [config, setConfig] = useState<SMTPConfigType>({
    verifyVPSHost: '',
    verifyVPSPort: 25,
    verifyFromEmail: 'verify@datacleaner.local',
    verifyHeloHostname: 'datacleaner.local',
    verifyEnabled: false,
    bypassBlacklist: true,
    sendingHost: '',
    sendingPort: 587,
    sendingUsername: '',
    sendingPassword: '',
    sendingFromEmail: '',
    sendingTestEnabled: false,
  });

  const { data: currentConfig, isLoading } = useQuery({
    queryKey: ['smtpConfig'],
    queryFn: getSMTPConfig,
  });

  useEffect(() => {
    if (currentConfig) {
      setConfig(currentConfig);
    }
  }, [currentConfig]);

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

  const handleVerifyPreset = (preset: 'disabled' | 'bypass' | 'strict') => {
    switch (preset) {
      case 'disabled':
        setConfig({ ...config, verifyEnabled: false });
        break;
      case 'bypass':
        setConfig({ ...config, verifyEnabled: true, bypassBlacklist: true });
        break;
      case 'strict':
        setConfig({ ...config, verifyEnabled: true, bypassBlacklist: false });
        break;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">SMTP Configuration</h2>
              <p className="text-indigo-100 text-sm">Configure verification and sending SMTP servers</p>
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

        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Section 1: Verification SMTP */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Verification SMTP</h3>
                  <p className="text-sm text-gray-600">Used to check if emails exist (validation phase)</p>
                </div>
              </div>

              {/* IP Protection Warning */}
              <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                <div className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="text-sm text-red-900">
                    <p className="font-bold">⚠️ NEVER USE YOUR MAIN SERVER IP FOR VERIFICATION!</p>
                    <p className="mt-1">SMTP verification connects to thousands of mail servers. This WILL blacklist your IP on Spamhaus, Barracuda, etc.</p>
                    <p className="mt-1 font-semibold">✅ SOLUTION: Use a separate VPS ($5/month) OR use Syntax+DNS only (90-95% accurate, ZERO risk)</p>
                  </div>
                </div>
              </div>

              {/* Verification Presets */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleVerifyPreset('disabled')}
                  className="p-4 border-2 border-green-300 bg-green-50 rounded-xl hover:border-green-500 transition-all text-left"
                >
                  <div className="font-semibold text-green-900">✅ Syntax + DNS</div>
                  <div className="text-xs text-green-700">SAFE - No blacklist risk</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleVerifyPreset('bypass')}
                  className="p-4 border-2 border-green-200 bg-green-50 rounded-xl hover:border-green-500 transition-all text-left"
                >
                  <div className="font-semibold text-green-900">Bypass Mode</div>
                  <div className="text-xs text-green-700">Skip blacklist errors</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleVerifyPreset('strict')}
                  className="p-4 border-2 border-gray-200 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all text-left"
                >
                  <div className="font-semibold text-gray-900">Strict Mode</div>
                  <div className="text-xs text-gray-600">All validations required</div>
                </button>
              </div>

              {/* VPS Configuration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    🔒 Verification VPS Host/IP
                  </label>
                  <input
                    type="text"
                    value={config.verifyVPSHost}
                    onChange={(e) => setConfig({ ...config, verifyVPSHost: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="123.45.67.89 or vps.example.com"
                  />
                  <p className="text-xs text-gray-600 mt-1">Required for SMTP verification. Leave empty for Syntax+DNS only.</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    VPS Port
                  </label>
                  <input
                    type="number"
                    value={config.verifyVPSPort}
                    onChange={(e) => setConfig({ ...config, verifyVPSPort: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="25"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    From Email
                  </label>
                  <input
                    type="email"
                    value={config.verifyFromEmail}
                    onChange={(e) => setConfig({ ...config, verifyFromEmail: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="verify@yourdomain.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    HELO Hostname
                  </label>
                  <input
                    type="text"
                    value={config.verifyHeloHostname}
                    onChange={(e) => setConfig({ ...config, verifyHeloHostname: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="yourdomain.com"
                  />
                </div>
              </div>

              <div className={`flex items-center justify-between p-4 rounded-lg border-2 ${!config.verifyVPSHost ? 'bg-gray-100 border-gray-300' : 'bg-gray-50 border-gray-200'}`}>
                <div>
                  <div className="font-semibold text-gray-900">Enable SMTP Verification</div>
                  <div className="text-sm text-gray-600">
                    {!config.verifyVPSHost ? '⚠️ Requires VPS configuration' : 'Connect via VPS to verify emails'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, verifyEnabled: !config.verifyEnabled })}
                  disabled={!config.verifyVPSHost}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.verifyEnabled && config.verifyVPSHost ? 'bg-indigo-600' : 'bg-gray-300'
                  } ${!config.verifyVPSHost ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.verifyEnabled && config.verifyVPSHost ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-semibold text-gray-900">Bypass on Blacklist</div>
                  <div className="text-sm text-gray-600">Accept emails when IP is blacklisted</div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, bypassBlacklist: !config.bypassBlacklist })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.bypassBlacklist ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.bypassBlacklist ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200"></div>

            {/* Section 2: Sending SMTP */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 font-bold">2</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Sending SMTP Server</h3>
                  <p className="text-sm text-gray-600">Your actual email server for sending campaigns</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    value={config.sendingHost}
                    onChange={(e) => setConfig({ ...config, sendingHost: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="smtp.yourmailserver.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    SMTP Port
                  </label>
                  <input
                    type="number"
                    value={config.sendingPort}
                    onChange={(e) => setConfig({ ...config, sendingPort: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="587"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={config.sendingUsername}
                    onChange={(e) => setConfig({ ...config, sendingUsername: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={config.sendingPassword}
                    onChange={(e) => setConfig({ ...config, sendingPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  From Email
                </label>
                <input
                  type="email"
                  value={config.sendingFromEmail}
                  onChange={(e) => setConfig({ ...config, sendingFromEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="sender@yourdomain.com"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                <div>
                  <div className="font-semibold text-gray-900">Test MX Reachability</div>
                  <div className="text-sm text-gray-600">Test if your sending SMTP can reach each MX server</div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, sendingTestEnabled: !config.sendingTestEnabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.sendingTestEnabled ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.sendingTestEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {config.sendingTestEnabled && (
                <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-yellow-800">
                      <p className="font-semibold">MX Reachability Testing Enabled</p>
                      <p className="mt-1">After validation, the system will test if your sending SMTP server can successfully connect to each MX server found. Results will be grouped by reachability.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>

            {/* Success/Error Messages */}
            {updateMutation.isSuccess && (
              <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded animate-slideIn">
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-green-800 font-medium">Configuration saved successfully!</p>
                </div>
              </div>
            )}

            {updateMutation.isError && (
              <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded animate-shake">
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <p className="text-red-800 font-medium">Failed to save configuration. Please try again.</p>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
