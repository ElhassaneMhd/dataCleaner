import axios from 'axios';
import type { JobStatus, ValidationResults, UploadResponse } from '../types';

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

export const downloadMXGrouped = (jobId: string, format: 'csv' | 'excel') => {
  window.open(`${API_BASE_URL}/jobs/${jobId}/export/mx?format=${format}`, '_blank');
};

// SMTP Configuration
export interface SMTPConfig {
  fromEmail: string;
  heloHostname: string;
  smtpEnabled: boolean;
  bypassBlacklist: boolean;
}

export const getSMTPConfig = async (): Promise<SMTPConfig> => {
  const response = await api.get<SMTPConfig>('/config/smtp');
  return response.data;
};

export const updateSMTPConfig = async (config: SMTPConfig): Promise<void> => {
  await api.post('/config/smtp', config);
};
