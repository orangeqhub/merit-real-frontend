import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Eye, RefreshCw, MessageSquare, IndianRupee, UserPlus, ShoppingBag, Ban, CalendarPlus, RefreshCcw, BadgeCheck, FileText, History, Award } from 'lucide-react';
import { expressInterestService } from '../../services/expressInterestService';
import { toast } from '../../store/toastStore';
import { useDomainRealtime, useRealtimeEvent } from '../../hooks/useDomainRealtime';
import { confirmDialog } from '../../store/confirmStore';
import EmptyState from '../../components/common/EmptyState';
import SearchBox from '../../components/common/SearchBox';
import TablePagination from '../../components/common/TablePagination';
import DataTable, { StatusPill, formatTableDate } from '../../components/common/DataTable';
import TableActionsMenu from '../../components/common/TableActionsMenu';
import BookingCountdown from '../../components/bookings/BookingCountdown';
import PurchaseReceiptView from '../../components/purchases/PurchaseReceiptView';
import PaymentReceiptDocument from '../../components/purchases/PaymentReceiptDocument';
import SaleCertificateDocument from '../../components/purchases/SaleCertificateDocument';
import { useTableState } from '../../hooks/useTableState';
import { formatIndianCurrency } from '../../utils/formatIndianNumber';

const PURCHASE_STATUS_LABELS = {
  purchase_requested: 'Purchase Requested',
  under_verification: 'Under Verification',
  approved: 'Approved',
  rejected: 'Rejected',
  completed: 'Completed',
};

const BOOKING_STATUS_LABELS = {
  booking_requested: 'Booking Requested',
  booking_verification: 'Booking Verification',
  booking_approved: 'Booking Approved',
  payment_pending: 'Payment Pending',
  partially_paid: 'Partially Paid',
  fully_paid: 'Fully Paid',
  booking_confirmed: 'Booking Confirmed',
  booking_completed: 'Booking Completed',
  awaiting_admin_decision: 'Period Completed — Awaiting Admin Decision',
  under_review: 'Under Review',
  booking_expired: 'Expired / Released',
  converted_to_purchase: 'Converted to Purchase',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
};

const PAYMENT_STATUS_LABELS = {
  PENDING: 'Pending',
  PARTIAL: 'Partial Payment',
  FULLY_PAID: 'Fully Paid',
};

const FOLLOW_UP_OPTIONS = [
  'PENDING_CUSTOMER_RESPONSE',
  'CUSTOMER_INTERESTED',
  'WAITING_FOR_PAYMENT',
  'PAYMENT_RECEIVED',
  'DOCUMENTATION_PENDING',
  'COMPLETED',
];

const PURCHASE_STATUS_OPTIONS = [
  'PURCHASE_REQUESTED',
  'UNDER_VERIFICATION',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
];

const BOOKING_STATUS_OPTIONS = [
  'BOOKING_REQUESTED',
  'BOOKING_VERIFICATION',
  'BOOKING_APPROVED',
  'PAYMENT_PENDING',
  'PARTIALLY_PAID',
  'FULLY_PAID',
  'BOOKING_CONFIRMED',
  'BOOKING_COMPLETED',
  'AWAITING_ADMIN_DECISION',
  'UNDER_REVIEW',
  'BOOKING_EXPIRED',
  'CONVERTED_TO_PURCHASE',
  'CANCELLED',
  'REJECTED',
];

/**
 * Shared list UI for Purchase / Booking requests.
 * @param {'purchase'|'booking'} type
 * @param {'admin'|'agent'|'customer'} scope
 */
export default function DecisionRequests({ type = 'purchase', scope = 'admin' }) {
  const navigate = useNavigate();
  const isPurchase = type === 'purchase';
  const labels = isPurchase ? PURCHASE_STATUS_LABELS : BOOKING_STATUS_LABELS;
  const statusOptions = isPurchase ? PURCHASE_STATUS_OPTIONS : BOOKING_STATUS_OPTIONS;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [viewing, setViewing] = useState(null);
  const [statusId, setStatusId] = useState(null);
  const [nextStatus, setNextStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [remarkId, setRemarkId] = useState(null);
  const [remarkText, setRemarkText] = useState('');
  const [payId, setPayId] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState('');
  const [payRemarks, setPayRemarks] = useState('');
  const [payMethod, setPayMethod] = useState('');
  const [payProof, setPayProof] = useState(null);
  const [followId, setFollowId] = useState(null);
  const [followStatus, setFollowStatus] = useState('PENDING_CUSTOMER_RESPONSE');
  const [followRemarks, setFollowRemarks] = useState('');
  const [followNext, setFollowNext] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [paymentReceiptDoc, setPaymentReceiptDoc] = useState(null);
  const [saleCertificateDoc, setSaleCertificateDoc] = useState(null);
  const [payReference, setPayReference] = useState('');
  const [decisionBooking, setDecisionBooking] = useState(null);
  const [decisionAction, setDecisionAction] = useState('EXTEND');
  const [extendDays, setExtendDays] = useState('15');
  const [customDays, setCustomDays] = useState('');
  const [decisionReason, setDecisionReason] = useState('');
  const [decisionRemarks, setDecisionRemarks] = useState('');
  const [reviewDate, setReviewDate] = useState('');
  const [decisionSaving, setDecisionSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      let data;
      if (isPurchase) {
        if (scope === 'admin' || scope === 'sales') data = await expressInterestService.getPurchasesAdmin({ pageSize: 100, status: statusFilter || undefined });
        else if (scope === 'agent') data = await expressInterestService.getPurchasesAgent({ pageSize: 100, status: statusFilter || undefined });
        else data = await expressInterestService.getPurchasesMine({ pageSize: 100 });
      } else {
        if (scope === 'admin' || scope === 'sales') data = await expressInterestService.getBookingsAdmin({ pageSize: 100, status: statusFilter || undefined });
        else if (scope === 'agent') data = await expressInterestService.getBookingsAgent({ pageSize: 100, status: statusFilter || undefined });
        else data = await expressInterestService.getBookingsMine({ pageSize: 100 });
      }
      setRows(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load requests');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [statusFilter, type, scope]);

  useDomainRealtime(true);

  const mergeBookingUpdate = useCallback((payload) => {
    if (isPurchase) return;
    const booking = payload?.booking;
    if (!booking?.id) return;
    setRows((prev) => {
      const idx = prev.findIndex((row) => row.id === booking.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...booking };
        return next;
      }
      if (payload.action === 'created') return [booking, ...prev];
      return prev;
    });
    setViewing((prev) => (prev?.id === booking.id ? { ...prev, ...booking } : prev));
  }, [isPurchase]);

  useRealtimeEvent('booking:updated', mergeBookingUpdate, !isPurchase);

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    pageRows,
    search,
    setSearch,
    clearFilters,
  } = useTableState(rows, {
    initialPageSize: 10,
    getSearchText: (row) =>
      [row.id, row.customer?.name, row.customer?.mobile, row.propertyName, row.status, row.assignedAgent?.name]
        .filter(Boolean)
        .join(' '),
  });

  async function openDetail(id) {
    try {
      const detail = isPurchase
        ? await expressInterestService.getPurchaseById(id)
        : await expressInterestService.getBookingById(id);
      setViewing(detail);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleStatusUpdate() {
    if (!nextStatus) {
      toast.error('Select a status');
      return;
    }
    try {
      if (isPurchase && nextStatus === 'COMPLETED') {
        const ok = await confirmDialog({
          title: 'Complete purchase?',
          message: 'This confirms payment as Fully Paid, marks the purchase Completed, sets the property to Sold, locks the record, and generates receipts.',
          confirmLabel: 'Complete Purchase',
          variant: 'success',
        });
        if (!ok) return;
        await expressInterestService.completePurchase(statusId, {
          remarks: statusNote || undefined,
          adminRemarks: statusNote || undefined,
          forceComplete: true,
        });
        toast.success('Purchase completed. Property sold and receipts generated.');
      } else if (isPurchase) {
        await expressInterestService.updatePurchaseStatus(statusId, {
          status: nextStatus,
          adminRemarks: statusNote,
          reason: statusNote,
        });
        toast.success('Status updated');
      } else {
        await expressInterestService.updateBookingStatus(statusId, {
          status: nextStatus,
          adminRemarks: statusNote,
          reason: statusNote,
        });
        toast.success('Status updated');
      }
      setStatusId(null);
      setNextStatus('');
      setStatusNote('');
      setViewing(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleCompletePurchase(id) {
    const ok = await confirmDialog({
      title: 'Complete purchase & mark sold?',
      message: 'Payment will be marked Fully Paid, purchase Completed & locked, property Sold, closed deal created, and receipts generated.',
      confirmLabel: 'Complete Purchase',
      variant: 'success',
    });
    if (!ok) return;
    try {
      await expressInterestService.completePurchase(id, { forceComplete: true });
      toast.success('Purchase completed successfully.');
      setViewing(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to complete purchase.');
    }
  }

  async function openReceipt(id, receiptType = 'SALE') {
    try {
      if (receiptType === 'SALE' || receiptType === 'CERTIFICATE') {
        const data = await expressInterestService.getSaleCertificateByPurchase(id);
        setSaleCertificateDoc(data);
        return;
      }
      const data = await expressInterestService.getPurchaseReceipt(id, receiptType);
      setReceipt(data);
    } catch (err) {
      toast.error(err.message || 'Document not available.');
    }
  }

  async function openLatestPaymentReceipt(row) {
    const latest = row.paymentReceipts?.[0];
    if (!latest?.id) {
      toast.error('No payment receipts yet for this purchase.');
      return;
    }
    try {
      const data = await expressInterestService.getPaymentReceipt(latest.id);
      setPaymentReceiptDoc(data);
    } catch (err) {
      toast.error(err.message || 'Payment receipt not available.');
    }
  }

  async function handleRemark() {
    if (!remarkText.trim()) {
      toast.error('Remarks are required');
      return;
    }
    try {
      if (isPurchase) await expressInterestService.addPurchaseRemarks(remarkId, remarkText);
      else await expressInterestService.addBookingRemarks(remarkId, remarkText);
      toast.success('Remarks saved');
      setRemarkId(null);
      setRemarkText('');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleRecordPayment() {
    if (!payAmount || Number(payAmount) <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }
    try {
      if (isPurchase) {
        await expressInterestService.recordPurchasePayment(
          payId,
          {
            amount: payAmount,
            paymentDate: payDate || undefined,
            remarks: payRemarks,
            paymentMethod: payMethod || undefined,
            paymentReference: payReference || undefined,
          },
          payProof
        );
      } else {
        await expressInterestService.recordBookingPayment(
          payId,
          { amount: payAmount, paymentDate: payDate || undefined, remarks: payRemarks },
          payProof
        );
      }
      toast.success('Payment recorded successfully.');
      setPayId(null);
      setPayAmount('');
      setPayDate('');
      setPayRemarks('');
      setPayMethod('');
      setPayReference('');
      setPayProof(null);
      setViewing(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to record payment.');
    }
  }

  async function handleFollowUp() {
    if (!followRemarks.trim()) {
      toast.error('Follow-up remarks are required');
      return;
    }
    const target = rows.find((r) => Number(r.id) === Number(followId)) || viewing;
    if (target?.paymentStarted) {
      toast.error('Follow-up is disabled because payment has started.');
      setFollowId(null);
      return;
    }
    try {
      await expressInterestService.addBookingFollowUp(followId, {
        status: followStatus,
        remarks: followRemarks,
        nextFollowUpAt: followNext || undefined,
      });
      toast.success('Follow-up saved.');
      setFollowId(null);
      setFollowRemarks('');
      setFollowNext('');
      setViewing(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to save follow-up.');
    }
  }

  async function handleConvert(id) {
    const ok = await confirmDialog({
      title: 'Convert to Purchase?',
      message: 'This converts the booking into a purchase request and keeps the property reserved until the purchase is completed.',
      confirmLabel: 'Convert to Purchase',
      variant: 'success',
    });
    if (!ok) return;
    try {
      await expressInterestService.convertBookingToPurchase(id);
      toast.success('Booking converted to purchase. Complete the purchase to mark the property sold.');
      setViewing(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Conversion failed.');
    }
  }

  async function handleCancel(id) {
    const ok = await confirmDialog({
      title: 'Cancel booking?',
      message: 'The reservation will be released and the property becomes Open (Active) again.',
      confirmLabel: 'Cancel Booking',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await expressInterestService.cancelBooking(id, { reason: 'Cancelled by admin' });
      toast.success('Booking cancelled. Property is open again.');
      setViewing(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Cancel failed.');
    }
  }

  async function handleExtend(id) {
    const row = rows.find((r) => r.id === id) || viewing;
    openDecision(row || { id }, 'EXTEND');
  }

  function openDecision(row, action = 'EXTEND') {
    setDecisionBooking(row);
    setDecisionAction(action);
    setExtendDays('15');
    setCustomDays('');
    setDecisionReason('');
    setDecisionRemarks('');
    setReviewDate('');
  }

  async function submitDecision() {
    if (!decisionBooking?.id) return;
    setDecisionSaving(true);
    try {
      if (decisionAction === 'EXTEND') {
        const days = extendDays === 'CUSTOM' ? Number(customDays) : Number(extendDays);
        if (!(days > 0)) {
          toast.error('Enter a valid extension period');
          return;
        }
        await expressInterestService.extendBooking(decisionBooking.id, {
          days,
          reason: decisionReason || decisionRemarks || undefined,
          remarks: decisionRemarks || undefined,
        });
        toast.success(`Booking extended by ${days} day(s).`);
      } else if (decisionAction === 'RELEASE') {
        if (!decisionReason.trim()) {
          toast.error('Release reason is required');
          return;
        }
        const ok = await confirmDialog({
          title: 'Release Property?',
          message: 'Property will become Open again and the booking will be marked Expired/Released.',
          confirmLabel: 'Release Property',
          variant: 'danger',
        });
        if (!ok) return;
        await expressInterestService.releaseBooking(decisionBooking.id, {
          reason: decisionReason,
          decisionRemarks: decisionRemarks || decisionReason,
        });
        toast.success('Booking released. Property is open again.');
      } else if (decisionAction === 'CONVERT') {
        await expressInterestService.convertBookingToPurchase(decisionBooking.id, {
          remarks: decisionRemarks || undefined,
        });
        toast.success('Booking converted to purchase.');
      } else if (decisionAction === 'REVIEW') {
        if (!decisionRemarks.trim() || !reviewDate) {
          toast.error('Review remarks and next review date are required');
          return;
        }
        await expressInterestService.keepBookingUnderReview(decisionBooking.id, {
          remarks: decisionRemarks,
          reviewDate,
        });
        toast.success('Booking kept under review.');
      }
      setDecisionBooking(null);
      setViewing(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Decision failed');
    } finally {
      setDecisionSaving(false);
    }
  }

  const title = isPurchase ? 'Purchase Management' : 'Booking Management';
  const subtitle =
    scope === 'admin'
      ? (isPurchase
        ? 'Complete purchases, record payments, generate receipts, and track sold properties.'
        : 'Manage reservations, payments, follow-ups, and conversion to purchase.')
      : scope === 'sales'
        ? `Monitor ${isPurchase ? 'purchase' : 'booking'} requests across the sales pipeline.`
        : scope === 'agent'
          ? `Track assigned customer ${isPurchase ? 'purchase' : 'booking'} requests.`
          : `Track your ${isPurchase ? 'purchases, receipts, and sale history' : 'booking request status'}.`;

  if (scope === 'customer') {
    const columns = [
      {
        key: 'id',
        header: isPurchase ? 'Purchase Ref' : 'Booking ID',
        render: (row) => <span className="font-mono text-xs">{isPurchase ? (row.purchaseReference || `PR-${row.id}`) : `#${row.id}`}</span>,
      },
      {
        key: 'propertyName',
        header: 'Property',
        render: (row) => (
          <Link to={`/properties/${row.propertyId}`} className="font-medium text-brand-800 hover:underline">
            {row.propertyName || `Property #${row.propertyId}`}
          </Link>
        ),
      },
      {
        key: 'propertyType',
        header: 'Property Type',
        sortable: false,
        render: (row) => row.propertyType || row.property?.propertyType || '—',
      },
      {
        key: 'postedByName',
        header: 'Posted By',
        sortable: false,
        render: (row) => row.postedByName || row.property?.postedByName || '—',
      },
      {
        key: 'ownerName',
        header: 'Owner Name',
        sortable: false,
        render: (row) => row.ownerName || row.property?.ownerName || '—',
      },
      ...(isPurchase
        ? [
            {
              key: 'saleDate',
              header: 'Purchase Date',
              render: (row) => (row.saleDate ? formatTableDate(row.saleDate) : formatTableDate(row.createdAt)),
            },
            {
              key: 'finalSaleAmount',
              header: 'Sale Amount',
              render: (row) => formatIndianCurrency(row.finalSaleAmount || row.totalAmount),
            },
            {
              key: 'paymentStatus',
              header: 'Payment',
              render: (row) => PAYMENT_STATUS_LABELS[row.paymentStatus] || row.paymentStatus || '—',
            },
            {
              key: 'propertyStatus',
              header: 'Property Status',
              render: (row) => row.propertyStatus || row.property?.status || '—',
            },
            {
              key: 'bookingReference',
              header: 'Booking Ref',
              sortable: false,
              render: (row) => row.bookingReference || '—',
            },
          ]
        : [
            {
              key: 'countdown',
              header: 'Time Remaining',
              sortable: false,
              render: (row) => (
                <BookingCountdown
                  expiryDate={row.expiryDate}
                  compact
                  awaitingDecision={row.statusRaw === 'AWAITING_ADMIN_DECISION' || row.awaitsAdminDecision}
                  underReview={row.statusRaw === 'UNDER_REVIEW'}
                />
              ),
            },
            {
              key: 'paymentStatus',
              header: 'Payment',
              render: (row) => PAYMENT_STATUS_LABELS[row.paymentStatus] || row.paymentStatus || '—',
            },
            {
              key: 'amountPaid',
              header: 'Paid / Balance',
              sortable: false,
              render: (row) => (
                <span className="text-xs">
                  {formatIndianCurrency(row.amountPaid)} / {formatIndianCurrency(row.balanceAmount)}
                </span>
              ),
            },
          ]),
      {
        key: 'assignedAgent',
        header: 'Assigned Agent',
        sortable: false,
        render: (row) => row.assignedAgent?.name || row.referralAgent?.name || '—',
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => <StatusPill status={row.status} labels={labels} />,
      },
      {
        key: 'adminRemarks',
        header: 'Admin Remarks',
        sortable: false,
        render: (row) => row.adminRemarks || '—',
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
                onClick: () => openDetail(row.id),
              },
              {
                key: 'receipt',
                label: 'View sale certificate',
                icon: Award,
                tone: 'brand',
                hidden: !isPurchase || !row.hasSaleCertificate,
                onClick: () => openReceipt(row.id, 'CERTIFICATE'),
              },
              {
                key: 'paymentReceipt',
                label: 'View payment receipt',
                icon: FileText,
                hidden: !isPurchase || !row.hasPaymentReceipts,
                onClick: () => openLatestPaymentReceipt(row),
              },
              {
                key: 'documents',
                label: 'Open documents',
                icon: FileText,
                hidden: !isPurchase,
                onClick: () => navigate(
                  scope === 'admin'
                    ? '/admin/documents'
                    : scope === 'sales'
                      ? '/sales/properties'
                      : scope === 'agent'
                        ? '/mediator/documents'
                        : '/buyer/documents'
                ),
              },
              {
                key: 'timeline',
                label: 'View timeline',
                icon: History,
                hidden: !isPurchase,
                onClick: () => openDetail(row.id),
              },
            ]}
          />
        ),
      },
    ];

    return (
      <>
        <DataTable
          title={isPurchase ? 'My Purchases' : title}
          subtitle={subtitle}
          columns={columns}
          rows={rows}
          loading={loading}
          onRefresh={load}
          getSearchText={(row) => [row.propertyName, row.status, row.assignedAgent?.name, row.id, row.purchaseReference, row.bookingReference].filter(Boolean).join(' ')}
          initialSortKey="createdAt"
        />
        {viewing && (
          <DetailModal
            viewing={viewing}
            labels={labels}
            onClose={() => setViewing(null)}
            isPurchase={isPurchase}
            scope={scope}
            onOpenReceipt={(t) => openReceipt(viewing.id, t)}
            onOpenPaymentReceipt={() => openLatestPaymentReceipt(viewing)}
          />
        )}
        {receipt && <PurchaseReceiptView receipt={receipt} onClose={() => setReceipt(null)} />}
        {paymentReceiptDoc && <PaymentReceiptDocument receipt={paymentReceiptDoc} onClose={() => setPaymentReceiptDoc(null)} />}
        {saleCertificateDoc && <SaleCertificateDocument certificate={saleCertificateDoc} onClose={() => setSaleCertificateDoc(null)} />}
      </>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand-800">{title}</h1>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-52">
            <SearchBox value={search} onChange={setSearch} />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>{labels[s.toLowerCase()] || s}</option>
            ))}
          </select>
          {(search || statusFilter) && (
            <button type="button" onClick={() => { clearFilters(); setStatusFilter(''); }} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              Clear
            </button>
          )}
          <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : rows.length === 0 || total === 0 ? (
        <EmptyState titleKey="empty.noData" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2.5">ID</th>
                  <th className="px-3 py-2.5">Customer</th>
                  <th className="px-3 py-2.5">Mobile</th>
                  <th className="px-3 py-2.5">Property</th>
                  <th className="px-3 py-2.5">Property Type</th>
                  <th className="px-3 py-2.5">Posted By</th>
                  <th className="px-3 py-2.5">Owner Name</th>
                  <th className="px-3 py-2.5">Agent</th>
                  {isPurchase && <th className="px-3 py-2.5">Booking Ref</th>}
                  {isPurchase && <th className="px-3 py-2.5">Sale Amount</th>}
                  {isPurchase && <th className="px-3 py-2.5">Payment</th>}
                  {!isPurchase && <th className="px-3 py-2.5">Time Remaining</th>}
                  {!isPurchase && <th className="px-3 py-2.5">Payment</th>}
                  {!isPurchase && <th className="px-3 py-2.5">Paid / Balance</th>}
                  <th className="px-3 py-2.5">{isPurchase ? 'Deal' : 'Follow-up'}</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">{isPurchase ? 'Purchase Date' : 'Booked'}</th>
                  <th className="px-3 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pageRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/80">
                    <td className="px-3 py-2.5 font-mono text-xs">#{row.id}</td>
                    <td className="px-3 py-2.5 font-medium">{row.customer?.name || '—'}</td>
                    <td className="px-3 py-2.5">{row.customer?.mobile || '—'}</td>
                    <td className="px-3 py-2.5">
                      <div className="max-w-[140px] truncate">{row.propertyName}</div>
                      <div className="text-xs text-gray-400">#{row.propertyId}</div>
                    </td>
                    <td className="px-3 py-2.5 text-xs">{row.propertyType || row.property?.propertyType || '—'}</td>
                    <td className="px-3 py-2.5 text-xs">{row.postedByName || row.property?.postedByName || '—'}</td>
                    <td className="px-3 py-2.5 text-xs">{row.ownerName || row.property?.ownerName || '—'}</td>
                    <td className="px-3 py-2.5">{row.assignedAgent?.name || row.referralAgent?.name || '—'}</td>
                    {isPurchase && (
                      <td className="px-3 py-2.5 font-mono text-xs">{row.bookingReference || '—'}</td>
                    )}
                    {isPurchase && (
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                        {formatIndianCurrency(row.finalSaleAmount || row.totalAmount)}
                      </td>
                    )}
                    {isPurchase && (
                      <td className="px-3 py-2.5 text-xs">
                        {PAYMENT_STATUS_LABELS[row.paymentStatus] || row.paymentStatus || '—'}
                      </td>
                    )}
                    {!isPurchase && (
                      <td className="px-3 py-2.5">
                        <BookingCountdown
                          expiryDate={row.expiryDate}
                          compact
                          awaitingDecision={row.statusRaw === 'AWAITING_ADMIN_DECISION' || row.awaitsAdminDecision}
                          underReview={row.statusRaw === 'UNDER_REVIEW'}
                        />
                      </td>
                    )}
                    {!isPurchase && (
                      <td className="px-3 py-2.5 text-xs">
                        {PAYMENT_STATUS_LABELS[row.paymentStatus] || row.paymentStatus || '—'}
                      </td>
                    )}
                    {!isPurchase && (
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                        {formatIndianCurrency(row.amountPaid)} / {formatIndianCurrency(row.balanceAmount)}
                      </td>
                    )}
                    <td className="px-3 py-2.5">
                      {isPurchase ? (
                        <span className="text-xs font-medium">{row.dealStatus || 'OPEN'}</span>
                      ) : (
                        <span className="text-xs">{(row.followUpStatus || '—').replace(/_/g, ' ')}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold">
                        {labels[row.status] || row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                      {new Date(row.saleDate || row.bookingDate || row.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5">
                      <TableActionsMenu
                        items={[
                          {
                            key: 'view',
                            label: 'View details',
                            icon: Eye,
                            onClick: () => openDetail(row.id),
                          },
                          {
                            key: 'status',
                            label: 'Update status',
                            icon: RefreshCcw,
                            tone: 'brand',
                            hidden: scope !== 'admin' || row.isLocked,
                            onClick: () => { setStatusId(row.id); setNextStatus(row.statusRaw || ''); setStatusNote(''); },
                          },
                          {
                            key: 'payment',
                            label: 'Record payment',
                            icon: IndianRupee,
                            tone: 'success',
                            hidden: scope !== 'admin' || !(isPurchase ? row.canRecordPayment : row.canRecordPayment),
                            onClick: () => { setPayId(row.id); setPayAmount(''); setPayDate(''); setPayRemarks(''); setPayMethod(''); setPayReference(''); setPayProof(null); },
                          },
                          {
                            key: 'complete',
                            label: 'Complete purchase',
                            icon: BadgeCheck,
                            tone: 'success',
                            hidden: !isPurchase || scope !== 'admin' || !row.canComplete,
                            onClick: () => handleCompletePurchase(row.id),
                          },
                          {
                            key: 'receipt',
                            label: 'View sale certificate',
                            icon: Award,
                            tone: 'brand',
                            hidden: !isPurchase || !row.hasSaleCertificate,
                            onClick: () => openReceipt(row.id, 'CERTIFICATE'),
                          },
                          {
                            key: 'paymentReceipt',
                            label: 'View payment receipt',
                            icon: FileText,
                            hidden: !isPurchase || !row.hasPaymentReceipts,
                            onClick: () => openLatestPaymentReceipt(row),
                          },
                          {
                            key: 'followup',
                            label: row.paymentStarted ? 'Follow-up (payment started)' : 'Add follow-up',
                            icon: UserPlus,
                            tone: 'warning',
                            hidden: isPurchase || !(scope === 'admin' || scope === 'agent' || scope === 'sales'),
                            disabled: Boolean(row.paymentStarted),
                            onClick: () => {
                              if (row.paymentStarted) return;
                              setFollowId(row.id);
                              setFollowStatus(row.followUpStatus || 'PENDING_CUSTOMER_RESPONSE');
                              setFollowRemarks('');
                              setFollowNext('');
                            },
                          },
                          {
                            key: 'decision',
                            label: 'Booking Expiry Decision',
                            icon: BadgeCheck,
                            tone: 'warning',
                            hidden: isPurchase || scope !== 'admin' || !row.canDecide,
                            onClick: () => openDecision(row, 'EXTEND'),
                          },
                          {
                            key: 'convert',
                            label: 'Convert to purchase',
                            icon: ShoppingBag,
                            tone: 'brand',
                            hidden: isPurchase || scope !== 'admin' || !row.canConvert,
                            onClick: () => handleConvert(row.id),
                          },
                          {
                            key: 'extend',
                            label: 'Extend booking',
                            icon: CalendarPlus,
                            hidden: isPurchase || scope !== 'admin' || !row.canExtend || row.paymentStarted,
                            onClick: () => openDecision(row, 'EXTEND'),
                          },
                          {
                            key: 'release',
                            label: 'Release property',
                            icon: Ban,
                            tone: 'danger',
                            hidden: isPurchase || scope !== 'admin' || !row.canRelease || row.paymentStarted,
                            onClick: () => openDecision(row, 'RELEASE'),
                          },
                          {
                            key: 'cancel',
                            label: 'Cancel booking',
                            icon: Ban,
                            tone: 'danger',
                            hidden: isPurchase || scope !== 'admin' || !row.canCancel || row.canDecide || row.paymentStarted,
                            onClick: () => handleCancel(row.id),
                          },
                          {
                            key: 'remarks',
                            label: scope === 'admin' ? 'Internal remarks' : 'Remarks',
                            icon: MessageSquare,
                            hidden: row.isLocked,
                            onClick: () => { setRemarkId(row.id); setRemarkText(''); },
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}

      {viewing && (
        <DetailModal
          viewing={viewing}
          labels={labels}
          onClose={() => setViewing(null)}
          isPurchase={isPurchase}
          scope={scope}
          onPay={() => { setPayId(viewing.id); setPayAmount(''); setPayDate(''); setPayRemarks(''); setPayMethod(''); setPayReference(''); setPayProof(null); }}
          onFollow={() => {
            if (viewing.paymentStarted) {
              toast.error('Follow-up is disabled because payment has started.');
              return;
            }
            setFollowId(viewing.id);
            setFollowStatus(viewing.followUpStatus || 'PENDING_CUSTOMER_RESPONSE');
            setFollowRemarks('');
            setFollowNext('');
          }}
          onConvert={() => handleConvert(viewing.id)}
          onCancel={() => handleCancel(viewing.id)}
          onExtend={() => handleExtend(viewing.id)}
          onDecision={() => openDecision(viewing, 'EXTEND')}
          onComplete={() => handleCompletePurchase(viewing.id)}
          onOpenReceipt={(t) => openReceipt(viewing.id, t)}
          onOpenPaymentReceipt={() => openLatestPaymentReceipt(viewing)}
        />
      )}

      {receipt && <PurchaseReceiptView receipt={receipt} onClose={() => setReceipt(null)} />}
      {paymentReceiptDoc && <PaymentReceiptDocument receipt={paymentReceiptDoc} onClose={() => setPaymentReceiptDoc(null)} />}
      {saleCertificateDoc && <SaleCertificateDocument certificate={saleCertificateDoc} onClose={() => setSaleCertificateDoc(null)} />}

      {decisionBooking && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="font-semibold text-brand-800">Booking Expiry Decision</h3>
            <p className="mt-1 text-xs text-gray-500">
              Booking #{decisionBooking.id} · {decisionBooking.propertyName || 'Property'}
              {decisionBooking.daysOverdue > 0 ? ` · ${decisionBooking.daysOverdue} day(s) overdue` : ''}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                ['EXTEND', 'Extend Booking'],
                ['RELEASE', 'Release Property'],
                ['CONVERT', 'Convert to Purchase'],
                ['REVIEW', 'Keep Under Review'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDecisionAction(key)}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold ${
                    decisionAction === key ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-gray-200 text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {decisionAction === 'EXTEND' && (
              <>
                <label className="mt-3 block text-xs font-medium text-gray-600">Extension period</label>
                <select value={extendDays} onChange={(e) => setExtendDays(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                  <option value="7">7 days</option>
                  <option value="15">15 days</option>
                  <option value="30">30 days</option>
                  <option value="CUSTOM">Custom</option>
                </select>
                {extendDays === 'CUSTOM' && (
                  <input type="number" min="1" max="90" value={customDays} onChange={(e) => setCustomDays(e.target.value)} placeholder="Days" className="mt-2 w-full rounded-lg border px-3 py-2 text-sm" />
                )}
                <label className="mt-3 block text-xs font-medium text-gray-600">Reason</label>
                <input value={decisionReason} onChange={(e) => setDecisionReason(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </>
            )}

            {decisionAction === 'RELEASE' && (
              <>
                <label className="mt-3 block text-xs font-medium text-gray-600">Release reason *</label>
                <input value={decisionReason} onChange={(e) => setDecisionReason(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </>
            )}

            {decisionAction === 'REVIEW' && (
              <>
                <label className="mt-3 block text-xs font-medium text-gray-600">Next review date *</label>
                <input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </>
            )}

            <label className="mt-3 block text-xs font-medium text-gray-600">Admin remarks</label>
            <textarea value={decisionRemarks} onChange={(e) => setDecisionRemarks(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setDecisionBooking(null)} className="rounded-lg border px-3 py-2 text-sm">Cancel</button>
              <button type="button" disabled={decisionSaving} onClick={submitDecision} className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {decisionSaving ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {statusId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="font-semibold text-brand-800">Update Status</h3>
            <select
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value)}
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select status</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>{labels[s.toLowerCase()] || s}</option>
              ))}
            </select>
            <textarea
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              rows={3}
              placeholder="Remarks / reason"
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setStatusId(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">Cancel</button>
              <button type="button" onClick={handleStatusUpdate} className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white">Save</button>
            </div>
          </div>
        </div>
      )}

      {remarkId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="font-semibold text-brand-800">{scope === 'admin' ? 'Internal Remarks' : 'Follow-up Remarks'}</h3>
            <textarea
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
              rows={3}
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setRemarkId(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">Cancel</button>
              <button type="button" onClick={handleRemark} className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white">Save</button>
            </div>
          </div>
        </div>
      )}

      {payId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="font-semibold text-brand-800">Record Payment</h3>
            <label className="mt-3 block text-xs font-medium text-gray-600">Amount (₹)</label>
            <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <label className="mt-3 block text-xs font-medium text-gray-600">Payment date</label>
            <input type="datetime-local" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            {isPurchase && (
              <>
                <label className="mt-3 block text-xs font-medium text-gray-600">Payment method</label>
                <input value={payMethod} onChange={(e) => setPayMethod(e.target.value)} placeholder="UPI / Bank Transfer / Cash" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                <label className="mt-3 block text-xs font-medium text-gray-600">Payment reference</label>
                <input value={payReference} onChange={(e) => setPayReference(e.target.value)} placeholder="Txn / UTR / Cheque no." className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </>
            )}
            <label className="mt-3 block text-xs font-medium text-gray-600">Remarks</label>
            <textarea value={payRemarks} onChange={(e) => setPayRemarks(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <label className="mt-3 block text-xs font-medium text-gray-600">Proof (optional)</label>
            <input type="file" accept="image/*" onChange={(e) => setPayProof(e.target.files?.[0] || null)} className="mt-1 w-full text-sm" />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setPayId(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">Cancel</button>
              <button type="button" onClick={handleRecordPayment} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Save payment</button>
            </div>
          </div>
        </div>
      )}

      {followId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="font-semibold text-brand-800">Add Follow-up</h3>
            <select value={followStatus} onChange={(e) => setFollowStatus(e.target.value)} className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {FOLLOW_UP_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <textarea value={followRemarks} onChange={(e) => setFollowRemarks(e.target.value)} rows={3} placeholder="Conversation / remarks" className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <label className="mt-3 block text-xs font-medium text-gray-600">Next follow-up</label>
            <input type="datetime-local" value={followNext} onChange={(e) => setFollowNext(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setFollowId(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">Cancel</button>
              <button type="button" onClick={handleFollowUp} className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailModal({
  viewing,
  labels,
  onClose,
  isPurchase,
  scope = 'customer',
  onPay,
  onFollow,
  onConvert,
  onCancel,
  onExtend,
  onDecision,
  onComplete,
  onOpenReceipt,
  onOpenPaymentReceipt,
}) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-brand-800">
          {isPurchase ? 'Purchase' : 'Booking'} #{viewing.id}
        </h2>
        {!isPurchase && viewing.expiryDate && (
          <div className="mt-3">
            <BookingCountdown
              expiryDate={viewing.expiryDate}
              awaitingDecision={viewing.statusRaw === 'AWAITING_ADMIN_DECISION' || viewing.awaitsAdminDecision}
              underReview={viewing.statusRaw === 'UNDER_REVIEW'}
            />
          </div>
        )}
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-gray-500">Customer</dt><dd>{viewing.customer?.name} ({viewing.customer?.memberId || viewing.customerId})</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-gray-500">Mobile</dt><dd>{viewing.customer?.mobile || '—'}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-gray-500">Property</dt><dd>{viewing.propertyName} #{viewing.propertyId}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-gray-500">Property Type</dt><dd>{viewing.propertyType || viewing.property?.propertyType || '—'}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-gray-500">Posted By</dt><dd>{viewing.postedByName || viewing.property?.postedByName || '—'}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-gray-500">Owner Name</dt><dd>{viewing.ownerName || viewing.property?.ownerName || '—'}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-gray-500">Assigned Agent</dt><dd>{viewing.assignedAgent?.name || viewing.referralAgent?.name || '—'}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-gray-500">Status</dt><dd>{labels[viewing.status] || viewing.status}</dd></div>
          {isPurchase && (
            <>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Purchase ref</dt><dd className="font-mono text-xs">{viewing.purchaseReference || `PR-${viewing.id}`}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Booking ref</dt><dd className="font-mono text-xs">{viewing.bookingReference || '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Source</dt><dd>{viewing.source || 'DIRECT'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Sale amount</dt><dd>{formatIndianCurrency(viewing.finalSaleAmount || viewing.totalAmount)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Amount paid</dt><dd>{formatIndianCurrency(viewing.amountPaid)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Balance</dt><dd>{formatIndianCurrency(viewing.balanceAmount)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Payment status</dt><dd>{PAYMENT_STATUS_LABELS[viewing.paymentStatus] || viewing.paymentStatus}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Property status</dt><dd>{viewing.propertyStatus || viewing.property?.status || '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Deal status</dt><dd>{viewing.dealStatus || 'OPEN'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Sale date</dt><dd>{viewing.saleDate ? new Date(viewing.saleDate).toLocaleString() : '—'}</dd></div>
            </>
          )}
          {!isPurchase && (
            <>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Booking date</dt><dd>{viewing.bookingDate ? new Date(viewing.bookingDate).toLocaleString() : '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Expiry date</dt><dd>{viewing.expiryDate ? new Date(viewing.expiryDate).toLocaleString() : '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Original expiry</dt><dd>{viewing.originalExpiryDate ? new Date(viewing.originalExpiryDate).toLocaleString() : '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Extensions</dt><dd>{viewing.extensionCount || 0}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Admin decision</dt><dd>{viewing.adminDecision || '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Decision date</dt><dd>{viewing.decisionDate ? new Date(viewing.decisionDate).toLocaleString() : '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Review date</dt><dd>{viewing.reviewDate ? new Date(viewing.reviewDate).toLocaleDateString() : '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Days overdue</dt><dd>{viewing.daysOverdue || 0}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Total amount</dt><dd>{formatIndianCurrency(viewing.totalAmount)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Amount paid</dt><dd>{formatIndianCurrency(viewing.amountPaid)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Balance</dt><dd>{formatIndianCurrency(viewing.balanceAmount)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Payment status</dt><dd>{PAYMENT_STATUS_LABELS[viewing.paymentStatus] || viewing.paymentStatus}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Follow-up</dt><dd>{(viewing.followUpStatus || '—').replace(/_/g, ' ')}</dd></div>
              {viewing.decisionRemarks && (
                <div><dt className="text-gray-500">Decision remarks</dt><dd className="mt-1 rounded-lg bg-amber-50 p-2 text-amber-900">{viewing.decisionRemarks}</dd></div>
              )}
            </>
          )}
          <div><dt className="text-gray-500">Admin remarks</dt><dd className="mt-1 rounded-lg bg-gray-50 p-2">{viewing.adminRemarks || viewing.rejectionReason || '—'}</dd></div>
        </dl>

        {viewing.payments?.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700">Payment history</h3>
            <ul className="mt-2 space-y-2 text-xs text-gray-600">
              {viewing.payments.map((p) => (
                <li key={p.id} className="rounded border border-gray-100 px-2 py-1.5">
                  {formatIndianCurrency(p.amount)} · {new Date(p.paymentDate).toLocaleString()}
                  {p.paymentMethod ? ` · ${p.paymentMethod}` : ''}
                  {p.remarks ? ` — ${p.remarks}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!isPurchase && viewing.followUps?.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700">Follow-up history</h3>
            <ul className="mt-2 space-y-2 text-xs text-gray-600">
              {viewing.followUps.map((f) => (
                <li key={f.id} className="rounded border border-gray-100 px-2 py-1.5">
                  {(f.status || '').replace(/_/g, ' ')}{f.remarks ? ` — ${f.remarks}` : ''}
                  <div className="text-gray-400">{f.actorName || '—'} · {new Date(f.createdAt).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {isPurchase && viewing.timeline?.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700">Purchase timeline</h3>
            <ul className="mt-2 space-y-2 text-xs text-gray-600">
              {viewing.timeline.map((h) => (
                <li key={h.id} className="rounded border border-gray-100 px-2 py-1.5">
                  {h.eventType}{h.note ? ` — ${h.note}` : ''}
                  <div className="text-gray-400">{new Date(h.createdAt).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {viewing.history?.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700">Status timeline</h3>
            <ul className="mt-2 space-y-2 text-xs text-gray-600">
              {viewing.history.map((h) => (
                <li key={h.id} className="rounded border border-gray-100 px-2 py-1.5">
                  {h.toStatus}{h.note ? ` — ${h.note}` : ''}
                  <div className="text-gray-400">{new Date(h.createdAt).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {isPurchase && scope === 'admin' && (
          <div className="mt-4 flex flex-wrap gap-2">
            {viewing.canRecordPayment && (
              <button type="button" onClick={onPay} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Record payment</button>
            )}
            {viewing.canComplete && (
              <button type="button" onClick={onComplete} className="rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white">Complete purchase</button>
            )}
            {viewing.hasSaleCertificate && (
              <button type="button" onClick={() => onOpenReceipt?.('CERTIFICATE')} className="rounded-lg border border-brand-300 px-3 py-2 text-xs font-semibold text-brand-800">Sale certificate</button>
            )}
            {viewing.hasPaymentReceipts && (
              <button type="button" onClick={() => onOpenPaymentReceipt?.()} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold">Payment receipt</button>
            )}
          </div>
        )}

        {isPurchase && (viewing.hasSaleCertificate || viewing.hasPaymentReceipts) && (scope === 'customer' || scope === 'agent') && (
          <div className="mt-4 flex flex-wrap gap-2">
            {viewing.hasSaleCertificate && (
              <button type="button" onClick={() => onOpenReceipt?.('CERTIFICATE')} className="rounded-lg border border-brand-300 px-3 py-2 text-xs font-semibold text-brand-800">Sale certificate</button>
            )}
            {viewing.hasPaymentReceipts && (
              <button type="button" onClick={() => onOpenPaymentReceipt?.()} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold">Payment receipt</button>
            )}
          </div>
        )}

        {!isPurchase && scope === 'admin' && (
          <div className="mt-4 flex flex-wrap gap-2">
            {viewing.canDecide && (
              <button type="button" onClick={onDecision} className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white">Expiry Decision</button>
            )}
            {viewing.canRecordPayment && (
              <button type="button" onClick={onPay} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Record payment</button>
            )}
            <button
              type="button"
              onClick={onFollow}
              disabled={Boolean(viewing.paymentStarted)}
              title={viewing.paymentStarted ? 'Follow-up disabled because payment has started' : undefined}
              className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {viewing.paymentStarted ? 'Follow-up disabled' : 'Add follow-up'}
            </button>
            {viewing.canConvert && (
              <button type="button" onClick={onConvert} className="rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white">Convert to purchase</button>
            )}
            {viewing.canExtend && !viewing.paymentStarted && (
              <button type="button" onClick={onExtend} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold">Extend</button>
            )}
            {viewing.canCancel && !viewing.canDecide && !viewing.paymentStarted && (
              <button type="button" onClick={onCancel} className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700">Cancel</button>
            )}
          </div>
        )}
        {!isPurchase && (scope === 'agent' || scope === 'sales') && (
          <div className="mt-4">
            <button
              type="button"
              onClick={onFollow}
              disabled={Boolean(viewing.paymentStarted)}
              title={viewing.paymentStarted ? 'Follow-up disabled because payment has started' : undefined}
              className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {viewing.paymentStarted ? 'Follow-up disabled' : 'Add follow-up'}
            </button>
          </div>
        )}

        <button type="button" onClick={onClose} className="mt-4 rounded-lg border border-gray-300 px-3 py-2 text-sm">Close</button>
      </div>
    </div>
  );
}

export function BookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    expressInterestService
      .getBookingById(id)
      .then(setBooking)
      .catch((err) => {
        toast.error(err.message);
        navigate('/buyer/bookings');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading || !booking) {
    return <p className="text-sm text-gray-500">Loading booking details…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/buyer/bookings" className="text-sm text-brand-700 hover:underline">← Back to bookings</Link>
      <h1 className="mt-2 text-xl font-bold text-brand-800">Booking #{booking.id}</h1>
      <p className="mt-1 text-sm text-gray-500">15-day reservation for this property.</p>

      {booking.expiryDate && (
        <div className="mt-4">
          <BookingCountdown
            expiryDate={booking.expiryDate}
            awaitingDecision={booking.statusRaw === 'AWAITING_ADMIN_DECISION' || booking.awaitsAdminDecision}
            underReview={booking.statusRaw === 'UNDER_REVIEW'}
          />
        </div>
      )}

      <div className="mt-6 space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm text-sm">
        <div className="flex justify-between"><span className="text-gray-500">Property</span><Link to={`/properties/${booking.propertyId}`} className="font-medium text-brand-800 hover:underline">{booking.propertyName}</Link></div>
        <div className="flex justify-between"><span className="text-gray-500">Property Type</span><span>{booking.propertyType || booking.property?.propertyType || '—'}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Posted By</span><span>{booking.postedByName || booking.property?.postedByName || '—'}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Owner Name</span><span>{booking.ownerName || booking.property?.ownerName || '—'}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Status</span><StatusPill status={booking.status} labels={BOOKING_STATUS_LABELS} /></div>
        <div className="flex justify-between"><span className="text-gray-500">Booking date</span><span>{booking.bookingDate ? new Date(booking.bookingDate).toLocaleString() : '—'}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Expiry date</span><span>{booking.expiryDate ? new Date(booking.expiryDate).toLocaleString() : '—'}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Extensions</span><span>{booking.extensionCount || 0}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Admin decision</span><span>{booking.adminDecision || '—'}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Payment status</span><span>{PAYMENT_STATUS_LABELS[booking.paymentStatus] || booking.paymentStatus}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Total amount</span><span>{formatIndianCurrency(booking.totalAmount)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Amount paid</span><span>{formatIndianCurrency(booking.amountPaid)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Balance</span><span className="font-semibold">{formatIndianCurrency(booking.balanceAmount)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Assigned Agent</span><span>{booking.assignedAgent?.name || '—'}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Follow-up</span><span>{(booking.followUpStatus || '—').replace(/_/g, ' ')}</span></div>
        <div><span className="text-gray-500">Admin remarks</span><p className="mt-1 rounded bg-gray-50 p-2">{booking.decisionRemarks || booking.adminRemarks || '—'}</p></div>

        {booking.payments?.length > 0 && (
          <div>
            <p className="font-semibold text-gray-700">Payment history</p>
            <ul className="mt-2 space-y-2 text-xs">
              {booking.payments.map((p) => (
                <li key={p.id} className="rounded border border-gray-100 px-2 py-1.5">
                  {formatIndianCurrency(p.amount)} · {new Date(p.paymentDate).toLocaleString()}
                  {p.remarks ? ` — ${p.remarks}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {booking.followUps?.length > 0 && (
          <div>
            <p className="font-semibold text-gray-700">Follow-up timeline</p>
            <ul className="mt-2 space-y-2 text-xs">
              {booking.followUps.map((f) => (
                <li key={f.id} className="rounded border border-gray-100 px-2 py-1.5">
                  {(f.status || '').replace(/_/g, ' ')}{f.remarks ? ` — ${f.remarks}` : ''}
                  <div className="text-gray-400">{formatTableDate(f.createdAt)}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {booking.history?.length > 0 && (
          <div>
            <p className="font-semibold text-gray-700">Status timeline</p>
            <ul className="mt-2 space-y-2 text-xs">
              {booking.history.map((h) => (
                <li key={h.id} className="rounded border border-gray-100 px-2 py-1.5">
                  {h.toStatus}{h.note ? ` — ${h.note}` : ''}
                  <div className="text-gray-400">{formatTableDate(h.createdAt)}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
