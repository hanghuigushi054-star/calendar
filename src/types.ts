export interface ScheduleItem {
  id?: string;
  date: string; // YYYY-MM-DD
  task: string;
  description: string;
  isCompleted?: boolean;
}

export interface AnalysisResult {
  id?: string;
  createdAt?: number;
  companyName: string;
  finalDeadline: string;
  targetDate: string;
  schedule: ScheduleItem[];
  notes?: string;
}

export interface ProfileData {
  selfPr: string;
  gakuchika: string;
  motivation: string;
  strengths: string;
  weaknesses: string;
}


