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
 * Print-ready Property Sale Certificate (A4).
 */
export default function SaleCertificateDocument({ certificate, onClose, onAction }) {
  const slipRef = useRef(null);
  const [busy, setBusy] = useState(false);
  if (!certificate) return null;
  const company = certificate.company || {};
  const customer = certificate.customer || {};
  const property = certificate.property || {};
  const agent = certificate.agent || null;
  const purchase = certificate.purchase || {};
  const pay = certificate.paymentSummary || {};
  const status = certificate.status || {};
  const docTitle = `Sale Certificate ${certificate.certificateNumber || certificate.saleConfirmationNumber || ''}`.trim();

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
        fileName: `Sale-Certificate-${certificate.saleConfirmationNumber || certificate.certificateNumber || 'doc'}`,
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
          <h2 className="font-semibold text-brand-800">Property Sale Certificate</h2>
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
          <div className="border-b-2 border-brand-700 pb-4 text-center">
            <p className="text-xl font-bold text-brand-800">{company.name || 'Merit Real Solutions'}</p>
            <p className="text-xs text-gray-500">{company.address} · {company.email} · {company.phone}</p>
            <p className="mt-3 text-lg font-semibold uppercase tracking-wide text-brand-900">Property Sale Certificate</p>
            <p className="font-mono text-sm">No. {certificate.saleConfirmationNumber}</p>
            <p className="text-xs text-gray-500">Certificate Date: {fmtDate(certificate.certificateDate || certificate.generatedDate)}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Customer</h3>
              <p className="font-medium">{customer.name}</p>
              <p className="text-xs text-gray-600">ID: {customer.memberId || customer.id}</p>
              <p className="text-xs text-gray-600">{customer.address || '—'}</p>
              <p className="text-xs text-gray-600">{customer.mobile} · {customer.email}</p>
            </section>
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Property</h3>
              <p className="font-medium">{property.name}</p>
              <p className="text-xs text-gray-600">Property ID: {property.id}</p>
              <p className="text-xs text-gray-600">Project: {property.project || '—'}</p>
              <p className="text-xs text-gray-600">Type: {property.type || '—'}</p>
              <p className="text-xs text-gray-600">Survey No.: {property.surveyNumber || '—'}</p>
              <p className="text-xs text-gray-600">Unit / Plot: {property.unitNumber || '—'}</p>
              <p className="text-xs text-gray-600">Area: {property.area || '—'}</p>
              <p className="text-xs text-gray-600">Location: {property.location || '—'}</p>
            </section>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Purchase Information</h3>
              <p className="text-xs">Booking Ref: <span className="font-mono">{purchase.bookingReference || '—'}</span></p>
              <p className="text-xs">Purchase Ref: <span className="font-mono">{purchase.purchaseReference || '—'}</span></p>
              <p className="text-xs">Purchase Date: {fmtDate(purchase.purchaseDate)}</p>
              <p className="text-xs">Sale Date: {fmtDate(purchase.saleDate || certificate.saleDate)}</p>
            </section>
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Agent</h3>
              {agent ? (
                <>
                  <p className="font-medium">{agent.name}</p>
                  <p className="text-xs text-gray-600">ID: {agent.memberId || agent.id}</p>
                  <p className="text-xs text-gray-600">Grade: {agent.grade || '—'}</p>
                </>
              ) : (
                <p className="text-xs text-gray-500">—</p>
              )}
            </section>
          </div>

          <section className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-emerald-800">Payment Summary</h3>
            <dl className="space-y-1.5">
              <div className="flex justify-between"><dt>Total Property Amount</dt><dd>{formatInr(pay.totalPropertyAmount)}</dd></div>
              <div className="flex justify-between"><dt>Total Amount Paid</dt><dd className="font-semibold">{formatInr(pay.totalAmountPaid)}</dd></div>
              <div className="flex justify-between"><dt>Payment Completion Date</dt><dd>{fmtDate(pay.paymentCompletionDate)}</dd></div>
              <div className="flex justify-between"><dt>Outstanding Balance</dt><dd className="font-semibold text-emerald-700">{formatInr(pay.outstandingBalance ?? 0)}</dd></div>
            </dl>
          </section>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
              Property Status: {status.propertyStatus || 'SOLD'}
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              Purchase Status: {status.purchaseStatus || 'COMPLETED'}
            </span>
          </div>

          <section className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-700">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Declaration</h3>
            <p>
              {certificate.declaration
                || 'This is to certify that the above-mentioned property has been successfully sold to the customer named herein after completion of all required payments and verification of purchase documentation by Merit Real Solutions.'}
            </p>
          </section>

          <div className="grid gap-10 pt-10 sm:grid-cols-2">
            <div className="border-t border-dashed border-gray-300 pt-2 text-center text-xs text-gray-500">Company Authorized Signature</div>
            <div className="border-t border-dashed border-gray-300 pt-2 text-center text-xs text-gray-500">Company Seal</div>
          </div>
          {(certificate.digitalVerificationNumber || certificate.verificationCode) && (
            <p className="pt-2 text-center font-mono text-[10px] text-gray-400">
              Digital Verification: {certificate.digitalVerificationNumber || certificate.verificationCode}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
