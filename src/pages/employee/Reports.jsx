import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { employeeTaskService } from '../../services/employeeTaskService';

export default function Reports() {
  const { t } = useTranslation('dashboard');
  const { user } = useAuthStore();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (user) employeeTaskService.getDashboardSummary(user).then(setSummary);
  }, [user]);

  if (!summary) return null;

  return (
    <div>
      <h1 className="mb-4 font-semibold text-brand-800">{t('reports.title')}</h1>
      <div className="rounded-xl border border-gray-200 p-4">
        <p className="text-sm text-gray-600">{t('reports.completionRate', { rate: summary.workCompletion.rate })}</p>
        <p className="mt-1 text-sm text-gray-600">
          {t('reports.completedOfTotal', { completed: summary.workCompletion.completed, total: summary.workCompletion.total })}
        </p>
      </div>
    </div>
  );
}
