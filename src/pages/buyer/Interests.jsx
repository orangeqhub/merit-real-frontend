import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, ArrowRight, ShoppingBag, CalendarCheck, CalendarPlus } from 'lucide-react';
import { expressInterestService } from '../../services/expressInterestService';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { useDomainRealtime, useRealtimeEvent } from '../../hooks/useDomainRealtime';
import { useOpenRecordFromUrl } from '../../hooks/useOpenRecordFromUrl';
import DataTable, { StatusPill, formatTableDate } from '../../components/common/DataTable';
import TableActionsMenu from '../../components/common/TableActionsMenu';

const STATUS_LABELS = {
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  assigned: 'Assigned',
  purchase_requested: 'Purchase Requested',
  booking_requested: 'Booking Requested',
  closed: 'Closed',
};

export default function Interests() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [proceedId, setProceedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    expressInterestService
      .getMine({ pageSize: 100 })
      .then(setInterests)
      .catch((err) => {
        setInterests([]);
        setError(err.message || 'Failed to load interests');
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [user]);

  useDomainRealtime(Boolean(user));

  const mergeInterestUpdate = useCallback((payload) => {
    const interest = payload?.interest;
    if (!interest?.id) return;
    setInterests((prev) => {
      const idx = prev.findIndex((row) => row.id === interest.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...interest };
        return next;
      }
      if (payload.action === 'created') return [interest, ...prev];
      return prev;
    });
    setSelected((prev) => (prev?.id === interest.id ? { ...prev, ...interest } : prev));
  }, []);

  useRealtimeEvent('express-interest:updated', mergeInterestUpdate, Boolean(user));
  useRealtimeEvent('express-interest:approved', mergeInterestUpdate, Boolean(user));

  useOpenRecordFromUrl({
    records: interests,
    fetchById: (id) => expressInterestService.getById(id),
    onOpen: setSelected,
    stateKey: 'openInterestId',
  });

  async function handleBooking() {
    if (!proceedId) return;
    setSubmitting(true);
    try {
      const booking = await expressInterestService.submitBooking(proceedId);
      toast.success('Booking request submitted.');
      setProceedId(null);
      setSelected(null);
      load();
      navigate(`/buyer/bookings/${booking.id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function scheduleVisit(row) {
    if (!row?.propertyId) {
      toast.error('A site visit cannot be scheduled for this interest.');
      return;
    }
    setSelected(null);
    navigate(`/schedule-visit/${row.propertyId}?interestId=${encodeURIComponent(row.id)}`);
  }

  const columns = [
    {
      key: 'id',
      header: 'Interest ID',
      render: (row) => <span className="font-mono text-xs">#{row.id}</span>,
    },
    {
      key: 'propertyName',
      header: 'Property',
      render: (row) => (
        <div>
          {row.mapPlotNo ? (
            <>
              <Link to="/map-layout" className="font-medium text-brand-800 hover:underline">
                {row.propertyName || `Plot ${row.mapPlotNo}`}
              </Link>
              <div className="text-xs text-gray-400">
                Plot {row.mapPlotNo}
                {row.mapPhase ? ` · Phase ${row.mapPhase}` : ''}
              </div>
            </>
          ) : (
            <>
              <Link to={`/properties/${row.propertyId}`} className="font-medium text-brand-800 hover:underline">
                {row.propertyName || `Property #${row.propertyId}`}
              </Link>
              <div className="text-xs text-gray-400">#{row.propertyId}</div>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created Date',
      render: (row) => formatTableDate(row.createdAt),
    },
    {
      key: 'assignedAgent',
      header: 'Assigned Agent',
      sortable: false,
      render: (row) => row.assignedAgent?.name || row.referralAgentName || '—',
    },
    {
      key: 'adminRemarks',
      header: 'Admin Remarks',
      sortable: false,
      className: 'max-w-[160px] truncate',
      render: (row) => row.adminRemarks || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusPill status={row.status} labels={STATUS_LABELS} />,
    },
    {
      key: 'decision',
      header: 'Decision',
      sortable: false,
      render: (row) => {
        if (row.purchaseStatus) return <span className="text-xs text-blue-700">Purchase</span>;
        if (row.bookingStatus) return <span className="text-xs text-brand-700">Booking</span>;
        return '—';
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (row) => (
        <TableActionsMenu
          items={[
            {
              key: 'view',
              label: 'View details',
              icon: Eye,
              onClick: () => setSelected(row),
            },
            {
              key: 'schedule-visit',
              label: 'Schedule Site Visit',
              icon: CalendarPlus,
              tone: 'brand',
              hidden: !['approved', 'assigned'].includes(String(row.status).toLowerCase()) || Boolean(row.siteVisitId),
              onClick: () => scheduleVisit(row),
            },
            {
              key: 'proceed',
              label: 'Proceed',
              icon: ArrowRight,
              tone: 'brand',
              hidden: !row.canProceed,
              onClick: () => setProceedId(row.id),
            },
            {
              key: 'purchase',
              label: 'View purchase',
              icon: ShoppingBag,
              tone: 'brand',
              hidden: !row.purchaseRequestId,
              onClick: () => navigate('/buyer/purchases'),
            },
            {
              key: 'booking',
              label: 'View booking',
              icon: CalendarCheck,
              tone: 'brand',
              hidden: !row.bookingRequestId,
              onClick: () => navigate(`/buyer/bookings/${row.bookingRequestId}`),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <DataTable
        title="My Express Interests"
        subtitle="Track interests and schedule a site visit or proceed to booking after approval."
        columns={columns}
        rows={interests}
        loading={loading}
        error={error}
        onRefresh={load}
        getSearchText={(row) =>
          [row.propertyName, row.status, row.adminRemarks, row.assignedAgent?.name, row.referralAgentName, row.id]
            .filter(Boolean)
            .join(' ')
        }
        initialSortKey="createdAt"
      />

      {selected && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <h2 className="font-semibold text-brand-800">{selected.propertyName}</h2>
            <p className="mt-1 text-sm text-gray-500">Status: {STATUS_LABELS[selected.status] || selected.status}</p>
            <p className="mt-2 text-sm">Assigned agent: {selected.assignedAgent?.name || selected.referralAgentName || '—'}</p>
            <p className="mt-1 text-sm">Admin remarks: {selected.adminRemarks || '—'}</p>
            <p className="mt-1 text-sm">Decision: {selected.customerDecision || '—'}</p>
            {selected.purchaseStatus && <p className="mt-1 text-sm">Purchase status: {selected.purchaseStatus}</p>}
            {selected.bookingStatus && <p className="mt-1 text-sm">Booking status: {selected.bookingStatus}</p>}
            {(selected.canProceed || (['approved', 'assigned'].includes(String(selected.status).toLowerCase()) && !selected.siteVisitId)) && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {['approved', 'assigned'].includes(String(selected.status).toLowerCase()) && !selected.siteVisitId && (
                  <button
                    type="button"
                    onClick={() => scheduleVisit(selected)}
                    className="rounded-lg border border-brand-600 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                  >
                    Schedule Site Visit
                  </button>
                )}
                {selected.canProceed && (
                  <button
                    type="button"
                    onClick={() => { setProceedId(selected.id); }}
                    className="rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    Proceed to Booking
                  </button>
                )}
              </div>
            )}
            {selected.history?.length > 0 && (
              <ul className="mt-4 space-y-2 text-xs text-gray-600">
                {selected.history.map((h) => (
                  <li key={h.id} className="rounded border border-gray-100 px-2 py-1.5">
                    {h.toStatus}{h.note ? ` — ${h.note}` : ''}
                    <div className="text-gray-400">{formatTableDate(h.createdAt)}</div>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" onClick={() => setSelected(null)} className="mt-4 rounded-lg border border-gray-300 px-3 py-2 text-sm">
              Close
            </button>
          </div>
        </div>
      )}

      {proceedId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-brand-800">Proceed to Booking</h3>
            <p className="mt-2 text-sm text-gray-600">Purchase (Buy) is disabled. Continue with Booking to reserve this property.</p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={handleBooking}
                className="rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                Continue with Booking
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setProceedId(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
