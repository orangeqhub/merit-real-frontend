import { useRef, useState } from 'react';
import { Printer, Download, X } from 'lucide-react';
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
 * Printable purchase / payment receipt.
 * Print = slip-only dialog; Download PDF = real .pdf file save.
 */
export default function PurchaseReceiptView({ receipt, onClose }) {
  const slipRef = useRef(null);
  const [busy, setBusy] = useState(false);
  if (!receipt) return null;

  const company = receipt.company || {};
  const customer = receipt.customer || {};
  const property = receipt.property || {};
  const agent = receipt.agent || null;
  const pay = receipt.paymentSummary || {};
  const status = receipt.status || {};
  const docTitle = receipt.title || `Receipt ${receipt.receiptNumber || ''}`.trim();

  function handlePrint() {
    printElement(slipRef.current, { title: docTitle, pageSize: 'A4' });
  }

  async function handleDownload() {
    if (busy) return;
    setBusy(true);
    try {
      await downloadElementAsPdf(slipRef.current, {
        title: docTitle,
        fileName: `Receipt-${receipt.receiptNumber || 'slip'}`,
      });
    } catch (err) {
      window.alert(err?.message || 'Could not download PDF. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/50 px-3 py-6">
      <div className="relative w-full max-w-3xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 print:hidden">
          <h2 className="font-semibold text-brand-800">{receipt.title || 'Receipt'}</h2>
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

        <div id="purchase-receipt-print" ref={slipRef} className="space-y-5 bg-white px-6 py-6 text-sm text-gray-800">
          <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-4">
            <div>
              <p className="text-lg font-bold text-brand-800">{company.name || 'Merit Real Solutions'}</p>
              <p className="text-xs text-gray-500">{company.address}</p>
              <p className="text-xs text-gray-500">{company.email} · {company.phone}</p>
            </div>
            <div className="text-right">
              <p className="text-base font-semibold">{receipt.title || 'Sale Receipt'}</p>
              <p className="font-mono text-xs">#{receipt.receiptNumber}</p>
              <p className="text-xs text-gray-500">{fmtDate(receipt.receiptDate)}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Customer</h3>
              <p className="font-medium">{customer.name || '—'}</p>
              <p className="text-xs text-gray-600">{customer.memberId || `ID ${customer.id || '—'}`}</p>
              <p className="text-xs text-gray-600">{customer.mobile}</p>
              <p className="text-xs text-gray-600">{customer.email}</p>
              {customer.address && <p className="text-xs text-gray-600">{customer.address}</p>}
            </section>
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Property</h3>
              <p className="font-medium">{property.name || '—'}</p>
              <p className="text-xs text-gray-600">Property ID: {property.id || '—'}</p>
              <p className="text-xs text-gray-600">Project: {property.project || '—'}</p>
              <p className="text-xs text-gray-600">Type: {property.type || '—'}</p>
              <p className="text-xs text-gray-600">Location: {property.location || '—'}</p>
            </section>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">References</h3>
              <p className="text-xs">Purchase: <span className="font-mono font-medium">{receipt.purchaseReference || '—'}</span></p>
              <p className="text-xs">Booking: <span className="font-mono font-medium">{receipt.bookingReference || '—'}</span></p>
            </section>
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Agent</h3>
              {agent ? (
                <>
                  <p className="font-medium">{agent.name}</p>
                  <p className="text-xs text-gray-600">{agent.mobile} · {agent.email}</p>
                </>
              ) : (
                <p className="text-xs text-gray-500">—</p>
              )}
            </section>
          </div>

          <section className="rounded-lg border border-gray-200 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Payment Summary</h3>
            <dl className="space-y-1.5">
              <div className="flex justify-between"><dt>Property Amount</dt><dd className="font-medium">{formatInr(pay.propertyAmount)}</dd></div>
              <div className="flex justify-between"><dt>Taxes</dt><dd>{formatInr(pay.taxes)}</dd></div>
              <div className="flex justify-between"><dt>Discount</dt><dd>{formatInr(pay.discount)}</dd></div>
              <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-semibold">
                <dt>Total Amount Paid</dt>
                <dd>{formatInr(pay.totalAmountPaid)}</dd>
              </div>
              <div className="flex justify-between"><dt>Payment Method</dt><dd>{pay.paymentMethod || '—'}</dd></div>
              <div className="flex justify-between"><dt>Payment Date</dt><dd>{fmtDate(pay.paymentDate)}</dd></div>
              <div className="flex justify-between"><dt>Balance Amount</dt><dd className="font-medium text-emerald-700">{formatInr(pay.balanceAmount ?? 0)}</dd></div>
            </dl>
          </section>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              {status.payment || 'Payment Completed'}
            </span>
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800">
              {status.property || 'Property Sold'}
            </span>
          </div>

          <div className="grid gap-8 pt-8 sm:grid-cols-2">
            <div className="border-t border-dashed border-gray-300 pt-2 text-center text-xs text-gray-500">
              Authorized Signature
            </div>
            <div className="border-t border-dashed border-gray-300 pt-2 text-center text-xs text-gray-500">
              Company Seal
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
