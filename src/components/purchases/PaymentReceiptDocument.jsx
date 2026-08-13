import { useRef, useState } from 'react';
import { Download, Printer, X } from 'lucide-react';
import { downloadElementAsPdf, printElement } from '../../utils/printDocument';
import { formatInr } from '../../utils/formatIndianNumber';

function fmtDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

/**
 * Print-ready Payment Receipt (A4).
 * Print opens slip-only dialog; Download PDF saves a .pdf file.
 */
export default function PaymentReceiptDocument({ receipt, onClose, onAction }) {
  const slipRef = useRef(null);
  const [busy, setBusy] = useState(false);
  if (!receipt) return null;

  const company = receipt.company || {};
  const customer = receipt.customer || {};
  const property = receipt.property || {};
  const agent = receipt.agent || null;
  const payment = receipt.payment || {};
  const isFull = receipt.statusCode === 'FULL' || receipt.status === 'FULL';
  const docTitle = `Payment Receipt ${receipt.receiptNumber || ''}`.trim();

  function handlePrint() {
    onAction?.('PRINT');
    printElement(slipRef.current, { title: docTitle, pageSize: 'A4' });
  }

  async function handleDownload() {
    if (busy) return;
    onAction?.('DOWNLOAD');
    setBusy(true);
    try {
      await downloadElementAsPdf(slipRef.current, {
        title: docTitle,
        fileName: `Payment-Receipt-${receipt.receiptNumber || 'slip'}`,
      });
    } catch (err) {
      window.alert(err?.message || 'Could not download PDF. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/50 px-3 py-6">
      <div className="relative w-full max-w-[210mm] rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 print:hidden">
          <h2 className="font-semibold text-brand-800">Payment Receipt</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 disabled:opacity-60"
            >
              <Download size={14} /> {busy ? 'Preparing…' : 'Download PDF'}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
            >
              <Printer size={14} /> Print
            </button>
            {onClose && (
              <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100" aria-label="Close">
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div ref={slipRef} className="space-y-5 bg-white px-8 py-8 text-sm text-gray-800">
          <div className="flex items-start justify-between gap-4 border-b-2 border-brand-700 pb-4">
            <div>
              <p className="text-xl font-bold text-brand-800">{company.name || 'Merit Real Solutions'}</p>
              <p className="text-xs text-gray-500">{company.address}</p>
              <p className="text-xs text-gray-500">{company.email} · {company.phone}</p>
            </div>
            <div className="text-right">
              <p className="text-base font-semibold uppercase tracking-wide">Payment Receipt</p>
              <p className="font-mono text-sm font-semibold">#{receipt.receiptNumber}</p>
              <p className="text-xs text-gray-500">{fmtDate(receipt.receiptDate)}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Customer</h3>
              <p className="font-medium">{customer.name}</p>
              <p className="text-xs text-gray-600">ID: {customer.memberId || customer.id}</p>
              <p className="text-xs text-gray-600">{customer.mobile}</p>
              <p className="text-xs text-gray-600">{customer.email}</p>
            </section>
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Property</h3>
              <p className="font-medium">{property.name}</p>
              <p className="text-xs text-gray-600">Property ID: {property.id}</p>
              <p className="text-xs text-gray-600">Project: {property.project || '—'}</p>
              <p className="text-xs text-gray-600">Type: {property.type || '—'}</p>
              <p className="text-xs text-gray-600">Location: {property.location || '—'}</p>
            </section>
          </div>

          <section className="rounded-lg border border-gray-200 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Payment Information</h3>
            <dl className="space-y-1.5">
              <div className="flex justify-between text-base font-semibold"><dt>Payment Amount</dt><dd>{formatInr(payment.amount)}</dd></div>
              <div className="flex justify-between"><dt>Total Property Amount</dt><dd>{formatInr(payment.totalPropertyAmount)}</dd></div>
              <div className="flex justify-between"><dt>Total Amount Paid</dt><dd>{formatInr(payment.totalAmountPaid)}</dd></div>
              <div className="flex justify-between"><dt>Remaining Balance</dt><dd>{formatInr(payment.remainingBalance)}</dd></div>
              <div className="flex justify-between"><dt>Payment Method</dt><dd>{payment.paymentMethod || '—'}</dd></div>
              <div className="flex justify-between"><dt>Payment Reference</dt><dd className="font-mono text-xs">{payment.paymentReference || '—'}</dd></div>
              <div className="flex justify-between"><dt>Payment Date</dt><dd>{fmtDate(payment.paymentDate)}</dd></div>
            </dl>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              {agent && (
                <p className="text-xs text-gray-600">
                  Agent: <span className="font-medium text-gray-800">{agent.name}</span> ({agent.memberId || agent.id})
                </p>
              )}
              {(receipt.purchaseReference || receipt.bookingReference) && (
                <p className="text-xs text-gray-600">
                  {receipt.purchaseReference && <>Purchase: {receipt.purchaseReference} </>}
                  {receipt.bookingReference && <>· Booking: {receipt.bookingReference}</>}
                </p>
              )}
              {receipt.remarks && <p className="mt-1 text-xs text-gray-500">Remarks: {receipt.remarks}</p>}
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isFull ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
              {receipt.status || (isFull ? 'Full Payment' : 'Partial Payment')}
            </span>
          </div>

          <div className="grid gap-10 pt-10 sm:grid-cols-2">
            <div className="border-t border-dashed border-gray-300 pt-2 text-center text-xs text-gray-500">Authorized Signature</div>
            <div className="border-t border-dashed border-gray-300 pt-2 text-center text-xs text-gray-500">Company Seal</div>
          </div>
          {receipt.verificationCode && (
            <p className="pt-2 text-center font-mono text-[10px] text-gray-400">Verification: {receipt.verificationCode}</p>
          )}
        </div>
      </div>
    </div>
  );
}
