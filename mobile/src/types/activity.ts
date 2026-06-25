import { Task } from './index';

export interface ActivitySummary {
  posted: {
    total: number;
    open: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
  participating: {
    total: number;
    pending: number;
    accepted: number;
    inProgress: number;
    completed: number;
    ended: number;
  };
}

export interface ActivityItem {
  id: string;
  activityType: 'POSTED' | 'PARTICIPATING';
  post: Task;
  participation?: {
    id: string;
    type: 'JOB_APPLICATION';
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  stats: {
    applicantCount: number;
    hireRequestCount: number;
  };
}
