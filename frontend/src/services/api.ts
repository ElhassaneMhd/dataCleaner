import axios from 'axios';
import type { JobStatus, ValidationResults, UploadResponse, MXGroupsListResponse } from '../types';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const uploadFile = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<UploadResponse>('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const getJobStatus = async (jobId: string): Promise<JobStatus> => {
  const response = await api.get<JobStatus>(`/jobs/${jobId}/status`);
  return response.data;
};

export const getValidationResults = async (jobId: string): Promise<ValidationResults> => {
  const response = await api.get<ValidationResults>(`/jobs/${jobId}/results`);
  return response.data;
};

export const downloadValidEmails = (jobId: string, format: 'csv' | 'excel') => {
  window.open(`${API_BASE_URL}/jobs/${jobId}/export/valid?format=${format}`, '_blank');
};

export const downloadInvalidEmails = (jobId: string, format: 'csv' | 'excel') => {
  window.open(`${API_BASE_URL}/jobs/${jobId}/export/invalid?format=${format}`, '_blank');
};

export const downloadAllMXGroups = (jobId: string, format: 'csv' | 'excel') => {
  window.open(`${API_BASE_URL}/jobs/${jobId}/export/mx-all?format=${format}`, '_blank');
};

export const downloadSelectedMXGroups = async (jobId: string, mxRecords: string[], format: 'csv' | 'excel') => {
  const response = await api.post(`/jobs/${jobId}/export/mx-selected?format=${format}`, {
    mxRecords
  }, {
    responseType: 'blob'
  });

  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', mxRecords.length === 1 ? `${mxRecords[0]}.${format === 'excel' ? 'xlsx' : 'csv'}` : `selected_mx_groups.zip`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export interface MXGroupPaginatedResponse {
  mxRecord: string;
  emails: string[];
  page: number;
  pageSize: number;
  totalEmails: number;
  totalPages: number;
}

export const getMXGroupsList = async (
  jobId: string,
  page: number = 1,
  pageSize: number = 10
): Promise<MXGroupsListResponse> => {
  const response = await api.get<MXGroupsListResponse>(
    `/jobs/${jobId}/mx-groups?page=${page}&pageSize=${pageSize}`
  );
  return response.data;
};

export const getMXGroupPaginated = async (
  jobId: string,
  mxRecord: string,
  page: number = 1,
  pageSize: number = 10
): Promise<MXGroupPaginatedResponse> => {
  const response = await api.get<MXGroupPaginatedResponse>(
    `/jobs/${jobId}/mx-group?mx=${encodeURIComponent(mxRecord)}&page=${page}&pageSize=${pageSize}`
  );
  return response.data;
};

// SMTP Configuration
export interface SMTPConfig {
  verifyVPSHost: string;
  verifyVPSPort: number;
  verifyFromEmail: string;
  verifyHeloHostname: string;
  verifyEnabled: boolean;
  bypassBlacklist: boolean;
  sendingHost: string;
  sendingPort: number;
  sendingUsername: string;
  sendingPassword: string;
  sendingFromEmail: string;
  sendingTestEnabled: boolean;
}

export const getSMTPConfig = async (): Promise<SMTPConfig> => {
  const response = await api.get<SMTPConfig>('/config/smtp');
  return response.data;
};

export const updateSMTPConfig = async (config: SMTPConfig): Promise<void> => {
  await api.post('/config/smtp', config);
};
