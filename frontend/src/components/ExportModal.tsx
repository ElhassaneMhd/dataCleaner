import { useQuery } from '@tanstack/react-query';
import { getValidationResults, downloadValidEmails, downloadInvalidEmails, downloadAllMXGroups } from '../services/api';

interface ExportModalProps {
  jobId: string;
  onClose: () => void;
}

export default function ExportModal({ jobId, onClose }: ExportModalProps) {
  const { data } = useQuery({
    queryKey: ['results', jobId],
    queryFn: () => getValidationResults(jobId),
    enabled: !!jobId,
  });

  if (!data) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Export Options</h3>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Valid Emails */}
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <h4 className="font-bold text-green-900 mb-3 flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Valid Emails ({data.validCount.toLocaleString()})</span>
            </h4>
            <div className="flex gap-2">
              <button onClick={() => { downloadValidEmails(jobId, 'csv'); onClose(); }} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors">
                CSV
              </button>
              <button onClick={() => { downloadValidEmails(jobId, 'excel'); onClose(); }} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors">
                Excel
              </button>
            </div>
          </div>

          {/* Invalid Emails */}
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <h4 className="font-bold text-red-900 mb-3 flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Invalid Emails ({data.invalidCount.toLocaleString()})</span>
            </h4>
            <div className="flex gap-2">
              <button onClick={() => { downloadInvalidEmails(jobId, 'csv'); onClose(); }} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors">
                CSV
              </button>
              <button onClick={() => { downloadInvalidEmails(jobId, 'excel'); onClose(); }} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors">
                Excel
              </button>
            </div>
          </div>

          {/* All MX Groups */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <h4 className="font-bold text-blue-900 mb-3 flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
              <span>All MX Groups ({data.summary.mxGroupCount} groups)</span>
            </h4>
            <div className="flex gap-2">
              <button onClick={() => { downloadAllMXGroups(jobId, 'csv'); onClose(); }} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors">
                ZIP (CSV)
              </button>
              <button onClick={() => { downloadAllMXGroups(jobId, 'excel'); onClose(); }} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors">
                ZIP (Excel)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
