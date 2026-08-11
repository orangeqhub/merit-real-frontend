const EMPTY_SUMMARY = {
  counts: {
    totalAssigned: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    assignedEnquiries: 0,
    todaysFollowUps: 0,
    upcomingVisits: 0,
  },
  sections: {
    todaysTasks: [],
    overdueTasks: [],
    pendingVerifications: [],
    pendingProperties: [],
    recentAssignments: [],
    upcomingFollowUps: [],
    upcomingVisits: [],
    recentNotifications: [],
  },
  workCompletion: {
    completed: 0,
    total: 0,
    percent: 0,
    rate: 0,
  },
};

export const employeeTaskService = {
  async getDashboardSummary() {
    return structuredClone(EMPTY_SUMMARY);
  },
};
