import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ClipboardList, Clock, Loader2, CheckCircle2, AlertTriangle, Inbox, PhoneCall, CalendarCheck } from 'lucide-react';
import { employeeTaskService } from '../../services/employeeTaskService';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';
import { getLocalizedField } from '../../utils/localize';
import StatCard from '../../components/dashboard/StatCard';
import DashboardGreeting from '../../components/dashboard/DashboardGreeting';

export default function EmployeeDashboard() {
  const { t } = useTranslation(['dashboard', 'common']);
  const { user } = useAuthStore();
  const language = useLanguageStore((s) => s.language);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    employeeTaskService.getDashboardSummary(user).then((data) => {
      if (!cancelled) setSummary(data);
    }).catch(() => {
      if (!cancelled) {
        setSummary({
          counts: {},
          sections: {},
          workCompletion: { completed: 0, total: 0, rate: 0 },
        });
      }
    });
    return () => { cancelled = true; };
  }, [user]);

  if (!summary) {
    return (
      <div>
        <DashboardGreeting name={user?.name} photo={user?.profilePhoto} />
        <p className="mt-6 text-sm text-gray-500">Loading dashboard…</p>
      </div>
    );
  }

  const counts = summary.counts || {};
  const sections = summary.sections || {};
  const workCompletion = summary.workCompletion || { completed: 0, total: 0, rate: 0 };
  const completionRate = workCompletion.rate ?? workCompletion.percent ?? 0;

  const todaysTasks = sections.todaysTasks || [];
  const overdueTasks = sections.overdueTasks || [];
  const recentAssignments = sections.recentAssignments || [];
  const upcomingFollowUps = sections.upcomingFollowUps || [];
  const upcomingVisits = sections.upcomingVisits || [];
  const recentNotifications = sections.recentNotifications || [];

  return (
    <div>
      <DashboardGreeting
        name={user?.name}
        photo={user?.profilePhoto}
        subtitle={user?.memberId ? `ID: ${user.memberId}` : undefined}
      />

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link to="/employee/verifications"><StatCard icon={ClipboardList} label={t('employeeDashboard.totalAssigned')} value={counts.totalAssigned ?? 0} /></Link>
        <Link to="/employee/verifications?status=pending_review"><StatCard icon={Clock} label={t('employeeDashboard.pending')} value={counts.pending ?? 0} accent="amber" /></Link>
        <Link to="/employee/verifications?status=in_review"><StatCard icon={Loader2} label={t('employeeDashboard.inProgress')} value={counts.inProgress ?? 0} accent="blue" /></Link>
        <Link to="/employee/verifications?status=completed"><StatCard icon={CheckCircle2} label={t('employeeDashboard.completed')} value={counts.completed ?? 0} /></Link>
        <Link to="/employee/follow-ups?tab=overdue"><StatCard icon={AlertTriangle} label={t('employeeDashboard.overdue')} value={counts.overdue ?? 0} accent="red" /></Link>
        <Link to="/employee/enquiries"><StatCard icon={Inbox} label={t('employeeDashboard.assignedEnquiries')} value={counts.assignedEnquiries ?? 0} accent="blue" /></Link>
        <Link to="/employee/follow-ups?tab=today"><StatCard icon={PhoneCall} label={t('employeeDashboard.todaysFollowUps')} value={counts.todaysFollowUps ?? 0} accent="amber" /></Link>
        <Link to="/employee/visits"><StatCard icon={CalendarCheck} label={t('employeeDashboard.upcomingVisits')} value={counts.upcomingVisits ?? 0} /></Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 p-4">
          <h2 className="mb-3 text-sm font-semibold text-brand-800">{t('employeeDashboard.todaysTasks')}</h2>
          {todaysTasks.length === 0 ? (
            <p className="text-xs text-gray-400">{t('empty.noData', { ns: 'common' })}</p>
          ) : (
            <ul className="space-y-2">
              {todaysTasks.map((f) => (
                <li key={f.id} className="rounded-lg bg-gray-50 p-2.5 text-sm">
                  <p className="text-gray-700">{f.reason}</p>
                  <p className="text-xs text-gray-400">{(f.dueDate || '').slice(0, 10)} {f.dueTime}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-red-100 bg-red-50/40 p-4">
          <h2 className="mb-3 text-sm font-semibold text-red-700">{t('employeeDashboard.overdueTasks')}</h2>
          {overdueTasks.length === 0 ? (
            <p className="text-xs text-gray-400">{t('empty.noData', { ns: 'common' })}</p>
          ) : (
            <ul className="space-y-2">
              {overdueTasks.map((item) => (
                <li key={item.id} className="rounded-lg bg-warm-white p-2.5 text-sm">
                  <p className="text-gray-700">{item.name || item.titleEn || item.reason}</p>
                  <p className="text-xs text-red-500">{(item.dueDate || '').slice(0, 10)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 p-4">
          <h2 className="mb-3 text-sm font-semibold text-brand-800">{t('employeeDashboard.recentAssignments')}</h2>
          {recentAssignments.length === 0 ? (
            <p className="text-xs text-gray-400">{t('empty.noData', { ns: 'common' })}</p>
          ) : (
            <ul className="space-y-2">
              {recentAssignments.map((item) => (
                <li key={item.id} className="rounded-lg bg-gray-50 p-2.5 text-sm">
                  <p className="text-gray-700">{item.name || getLocalizedField(item, 'title', language) || item.buyerName}</p>
                  <p className="text-xs text-gray-400">{item.assignedAt ? new Date(item.assignedAt).toLocaleDateString() : '—'}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 p-4">
          <h2 className="mb-3 text-sm font-semibold text-brand-800">{t('employeeDashboard.upcomingFollowUps')}</h2>
          {upcomingFollowUps.length === 0 ? (
            <p className="text-xs text-gray-400">{t('empty.noData', { ns: 'common' })}</p>
          ) : (
            <ul className="space-y-2">
              {upcomingFollowUps.map((f) => (
                <li key={f.id} className="rounded-lg bg-gray-50 p-2.5 text-sm">
                  <p className="text-gray-700">{f.reason}</p>
                  <p className="text-xs text-gray-400">{(f.dueDate || '').slice(0, 10)} {f.dueTime}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 p-4">
          <h2 className="mb-3 text-sm font-semibold text-brand-800">{t('employeeDashboard.upcomingVisitsSection')}</h2>
          {upcomingVisits.length === 0 ? (
            <p className="text-xs text-gray-400">{t('empty.noData', { ns: 'common' })}</p>
          ) : (
            <ul className="space-y-2">
              {upcomingVisits.map((v) => (
                <li key={v.id} className="rounded-lg bg-gray-50 p-2.5 text-sm">
                  <p className="text-gray-700">{v.buyerName}</p>
                  <p className="text-xs text-gray-400">{v.scheduledFor ? new Date(v.scheduledFor).toLocaleString() : '—'}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 p-4">
          <h2 className="mb-3 text-sm font-semibold text-brand-800">{t('employeeDashboard.recentNotifications')}</h2>
          {recentNotifications.length === 0 ? (
            <p className="text-xs text-gray-400">{t('empty.noNotifications', { ns: 'common' })}</p>
          ) : (
            <ul className="space-y-2">
              {recentNotifications.map((n) => (
                <li key={n.id} className="rounded-lg bg-gray-50 p-2.5 text-sm">
                  <p className="text-gray-700">{getLocalizedField(n, 'title', language)}</p>
                  <p className="text-xs text-gray-400">{n.createdAt ? new Date(n.createdAt).toLocaleDateString() : '—'}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-gray-200 p-4">
        <h2 className="mb-2 text-sm font-semibold text-brand-800">{t('employeeDashboard.workCompletionSummary')}</h2>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${completionRate}%` }} />
        </div>
        <p className="mt-2 text-sm text-gray-600">
          {t('reports.completedOfTotal', {
            completed: workCompletion.completed ?? 0,
            total: workCompletion.total ?? 0,
          })}
        </p>
      </section>
    </div>
  );
}
