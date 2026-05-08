export interface ScheduleItem {
  id?: string;
  date: string; // YYYY-MM-DD
  task: string;
  description: string;
  isCompleted?: boolean;
}

export type SelectionStatus = '準備中' | '書類選考中' | '面接選考中' | '内定' | '終了';

export interface AnalysisResult {
  id?: string;
  createdAt?: number;
  companyName: string;
  finalDeadline: string;
  targetDate: string;
  schedule: ScheduleItem[];
  notes?: string;
  status?: SelectionStatus | string;
  myPageUrl?: string;
  loginId?: string;
  password?: string;
  impressionInfoSession?: string;
  impressionES?: string;
  impressionWebTest?: string;
}

export interface ProfileData {
  selfPr: string;
  gakuchika: string;
  motivation: string;
  strengths: string;
  weaknesses: string;
}


