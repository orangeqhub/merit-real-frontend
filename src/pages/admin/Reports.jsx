import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, Building2, Users, TrendingUp, Star, ShoppingBag, IndianRupee, Handshake, FileText } from 'lucide-react';
import { propertyService } from '../../services/propertyService';
import { userService } from '../../services/userService';
import { expressInterestService } from '../../services/expressInterestService';
import { CATEGORIES } from '../../config/categories';
import { exportToXlsx } from '../../utils/xlsxExport';
import { toast } from '../../store/toastStore';
import StatCard from '../../components/dashboard/StatCard';
import { formatInr } from '../../utils/formatIndianNumber';

const COLORS = ['#556936', '#90a955', '#748a42', '#3f5b25', '#b3c885'];
const ROLES = ['buyer', 'seller', 'mediator', 'employee'];

export default function Reports() {
  const { t } = useTranslation('dashboard');
  const [categoryData, setCategoryData] = useState([]);
  const [roleData, setRoleData] = useState([]);
  const [properties, setProperties] = useState([]);
  const [widgets, setWidgets] = useState({ totalProperties: 0, activeProperties: 0, featuredProperties: 0, totalUsers: 0 });
  const [sales, setSales] = useState(null);

  useEffect(() => {
    propertyService.getProperties({ includeAllStatuses: true, admin: true, pageSize: 100 }).then((r) => {
      setProperties(r.items);
      const tally = {};
      for (const p of r.items) tally[p.categorySlug] = (tally[p.categorySlug] || 0) + 1;
      setCategoryData(CATEGORIES.map((c) => ({ name: c.nameEn, value: tally[c.slug] || 0 })));
      setWidgets((w) => ({
        ...w,
        totalProperties: r.total,
        activeProperties: r.items.filter((p) => p.status === 'active').length,
        featuredProperties: r.items.filter((p) => p.featured).length,
      }));
    });
    Promise.all(ROLES.map((role) => userService.getUsers({ role }))).then((results) => {
      setRoleData(ROLES.map((role, i) => ({ name: role, value: results[i].length })));
      setWidgets((w) => ({ ...w, totalUsers: results.reduce((sum, list) => sum + list.length, 0) }));
    });
    expressInterestService.getSalesReports().then(setSales).catch(() => setSales(null));
  }, []);

  function handleExport() {
    if (properties.length === 0 && !sales?.completedPurchases?.length) {
      toast.info(t('toast.exportEmpty'));
      return;
    }
    const sheets = [];
    if (properties.length) {
      sheets.push({
        sheetName: 'Properties',
        rows: properties.map((p) => ({
          'Property Code': p.propertyCode,
          Title: p.titleEn,
          Category: p.categorySlug,
          Status: p.status,
          Price: p.price,
          Views: p.views,
          City: p.city,
        })),
      });
    }
    if (sales?.completedPurchases?.length) {
      sheets.push({
        sheetName: 'Completed Purchases',
        rows: sales.completedPurchases.map((p) => ({
          'Purchase ID': p.purchaseId,
          Property: p.property,
          Customer: p.customer,
          Agent: p.agent,
          'Sale Amount': p.saleAmount,
          'Sale Date': p.saleDate,
          'Payment Status': p.paymentStatus,
          'Deal Status': p.dealStatus,
        })),
      });
    }
    if (sales?.agentReports?.length) {
      sheets.push({
        sheetName: 'Agent Performance',
        rows: sales.agentReports.map((a) => ({
          Agent: a.agentName,
          'Closed Deals': a.closedDeals,
          'Active Deals': a.activeDeals,
          'Sales Value': a.salesValue,
          Customers: a.customerCount,
          'Conversion %': a.conversionRate,
        })),
      });
    }
    exportToXlsx('merit-sales-reports.xlsx', sheets);
    toast.success(t('toast.exportSuccess'));
  }

  function exportCsv(filename, rows) {
    if (!rows?.length) {
      toast.info(t('toast.exportEmpty'));
      return;
    }
    const headers = Object.keys(rows[0]);
    const lines = [
      headers.join(','),
      ...rows.map((row) => headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('toast.exportSuccess'));
  }

  function handlePrintPdf() {
    window.print();
  }

  const purchase = sales?.purchaseReports;
  const admin = sales?.adminReports;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap justify-end gap-2 print:hidden">
        <button type="button" onClick={handlePrintPdf} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50">
          Export PDF
        </button>
        <button
          type="button"
          onClick={() => exportCsv('completed-purchases.csv', (sales?.completedPurchases || []).map((p) => ({
            purchaseId: p.purchaseId,
            property: p.property,
            customer: p.customer,
            agent: p.agent,
            saleAmount: p.saleAmount,
            saleDate: p.saleDate,
          })))}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
        >
          Export CSV
        </button>
        <button type="button" onClick={handleExport} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-warm-white hover:bg-brand-700">
          <Download size={16} /> Export Excel
        </button>
      </div>

      {sales && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard icon={ShoppingBag} label="Total Purchases" value={purchase?.totalPurchases || 0} accent="green" />
          <StatCard icon={IndianRupee} label="Total Revenue" value={formatInr(purchase?.totalRevenue)} accent="indigo" />
          <StatCard icon={Building2} label="Properties Sold" value={purchase?.propertiesSold || 0} />
          <StatCard icon={TrendingUp} label="Open Inventory" value={admin?.openInventory || 0} accent="cyan" />
          <StatCard icon={FileText} label="Payment Receipts" value={sales.documentReports?.totalPaymentReceipts || admin?.totalPaymentReceipts || 0} accent="orange" />
          <StatCard icon={Handshake} label="Sale Certificates" value={sales.documentReports?.totalSaleCertificates || admin?.totalSaleCertificates || 0} accent="amber" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Building2} label={t('admin.totalProperties')} value={widgets.totalProperties} accent="green" />
        <StatCard icon={TrendingUp} label={t('status.active', { ns: 'common' })} value={widgets.activeProperties} accent="cyan" />
        <StatCard icon={Star} label={t('card.featured', { ns: 'properties' })} value={widgets.featuredProperties} accent="orange" />
        <StatCard icon={Users} label={t('admin.totalUsers')} value={widgets.totalUsers} accent="indigo" />
      </div>

      {purchase?.monthlySales?.length > 0 && (
        <div className="rounded-xl border border-gray-200/70 bg-warm-white/80 p-4 shadow-sm backdrop-blur">
          <h2 className="mb-4 font-semibold text-brand-800">Monthly Sales</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={purchase.monthlySales} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip formatter={(v) => formatInr(v)} />
                <Bar dataKey="value" fill="#556936" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {purchase?.salesByPropertyType?.length > 0 && (
        <div className="rounded-xl border border-gray-200/70 bg-warm-white/80 p-4 shadow-sm backdrop-blur">
          <h2 className="mb-4 font-semibold text-brand-800">Sales by Property Type</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={purchase.salesByPropertyType} dataKey="value" nameKey="name" outerRadius={100} label>
                  {purchase.salesByPropertyType.map((entry, i) => (
                    <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatInr(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {sales?.agentReports?.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-warm-white/80 shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3 font-semibold text-brand-800">Agent Performance</div>
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Agent</th>
                <th className="px-4 py-2">Closed</th>
                <th className="px-4 py-2">Active</th>
                <th className="px-4 py-2">Sales Value</th>
                <th className="px-4 py-2">Customers</th>
                <th className="px-4 py-2">Conversion %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sales.agentReports.map((a) => (
                <tr key={a.agentId || a.agentName}>
                  <td className="px-4 py-2 font-medium">{a.agentName}</td>
                  <td className="px-4 py-2">{a.closedDeals}</td>
                  <td className="px-4 py-2">{a.activeDeals ?? '—'}</td>
                  <td className="px-4 py-2">{formatInr(a.salesValue)}</td>
                  <td className="px-4 py-2">{a.customerCount}</td>
                  <td className="px-4 py-2">{a.conversionRate ?? '—'}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-xl border border-gray-200/70 bg-warm-white/80 p-4 shadow-sm backdrop-blur">
        <h2 className="mb-4 font-semibold text-brand-800">{t('admin.propertiesByCategory')}</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData} margin={{ left: -20 }}>
              <defs>
                <linearGradient id="reportsBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#90a955" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#556936" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={70} />
              <YAxis allowDecimals={false} />
              <Tooltip cursor={{ fill: 'rgba(144,169,85,0.08)' }} />
              <Bar dataKey="value" fill="url(#reportsBarGradient)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200/70 bg-warm-white/80 p-4 shadow-sm backdrop-blur">
        <h2 className="mb-4 font-semibold text-brand-800">{t('admin.usersByRole')}</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={roleData} dataKey="value" nameKey="name" outerRadius={100} label>
                {roleData.map((entry, i) => (
                  <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
