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
  emails: string[];
  count: number;
}

export interface ValidationResults {
  validEmails: ValidationResult[];
  invalidEmails: ValidationResult[];
  mxGroups: MXGroup[];
}

export interface UploadResponse {
  jobId: string;
  totalRecords: number;
  status: string;
}
