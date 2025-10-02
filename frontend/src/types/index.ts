export interface JobStatus {
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  totalRecords: number;
  processedRecords: number;
  validEmails: number;
  invalidEmails: number;
  progress: number;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface ValidationResult {
  email: string;
  isValid: boolean;
  syntaxValid: boolean;
  dnsValid: boolean;
  smtpValid: boolean;
  mxRecord: string;
  errorReason?: string;
}

export interface MXGroup {
  mxRecord: string;
  emails: string[]; // Empty in summary, full list only in exports
  count: number;
  sendingSMTPTest?: boolean;
}

export interface ValidationResults {
  validCount: number;
  invalidCount: number;
  summary: {
    totalProcessed: number;
    validEmails: number;
    invalidEmails: number;
    mxGroupCount: number;
  };
}

export interface MXGroupsListResponse {
  mxGroups: MXGroup[];
  page: number;
  pageSize: number;
  totalGroups: number;
  totalPages: number;
}

export interface UploadResponse {
  jobId: string;
  totalRecords: number;
  status: string;
}
