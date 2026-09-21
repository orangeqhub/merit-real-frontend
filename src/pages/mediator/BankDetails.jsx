import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { walletService } from '../../services/walletService';
import { toast } from '../../store/toastStore';
import { resolveAssetUrl } from '../../api/client';

const EMPTY = {
  accountHolderName: '',
  bankName: '',
  branchName: '',
  accountNumber: '',
  confirmAccountNumber: '',
  ifscCode: '',
  accountType: 'SAVINGS',
  upiId: '',
  panNumber: '',
};

export default function MediatorBankDetails() {
  const [form, setForm] = useState(EMPTY);
  const [existing, setExisting] = useState(null);
  const [cheque, setCheque] = useState(null);
  const [passbook, setPassbook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    walletService.getBankDetails()
      .then((data) => {
        if (!data) return;
        setExisting(data);
        setForm({
          accountHolderName: data.accountHolderName || '',
          bankName: data.bankName || '',
          branchName: data.branchName || '',
          accountNumber: data.accountNumber || '',
          confirmAccountNumber: data.accountNumber || '',
          ifscCode: data.ifscCode || '',
          accountType: data.accountType || 'SAVINGS',
          upiId: data.upiId || '',
          panNumber: data.panNumber || '',
        });
      })
      .catch(() => setExisting(null))
      .finally(() => setLoading(false));
  }, []);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.accountNumber !== form.confirmAccountNumber) {
      toast.error('Account number confirmation does not match');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v != null && v !== '') fd.append(k, v);
      });
      if (cheque) fd.append('cancelledCheque', cheque);
      if (passbook) fd.append('passbookCopy', passbook);
      const data = await walletService.saveBankDetails(fd);
      setExisting(data);
      toast.success('Bank details saved');
    } catch (err) {
      toast.error(err.message || 'Failed to save bank details');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading bank details…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Bank Details</h1>
          <p className="text-sm text-gray-500">Used for commission redemption settlements.</p>
        </div>
        <Link to="/mediator/wallet" className="text-sm font-medium text-brand-700 hover:underline">Back to Wallet</Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-100 bg-warm-white p-5">
        {[
          ['accountHolderName', 'Account Holder Name', true],
          ['bankName', 'Bank Name', true],
          ['branchName', 'Branch Name', false],
          ['accountNumber', 'Account Number', true],
          ['confirmAccountNumber', 'Confirm Account Number', true],
          ['ifscCode', 'IFSC Code', true],
          ['upiId', 'UPI ID (Optional)', false],
          ['panNumber', 'PAN Number (Optional)', false],
        ].map(([key, label, required]) => (
          <label key={key} className="block text-sm font-medium text-gray-700">
            {label}
            <input
              required={required}
              value={form[key]}
              onChange={(e) => setField(key, e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
        ))}

        <label className="block text-sm font-medium text-gray-700">
          Account Type
          <select
            value={form.accountType}
            onChange={(e) => setField('accountType', e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
          >
            <option value="SAVINGS">Savings</option>
            <option value="CURRENT">Current</option>
          </select>
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Cancelled Cheque (Optional)
          <input type="file" accept="image/*,.pdf" onChange={(e) => setCheque(e.target.files?.[0] || null)} className="mt-1 block w-full text-sm" />
          {existing?.cancelledChequePath && (
            <a href={resolveAssetUrl(existing.cancelledChequePath)} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-brand-700">View current file</a>
          )}
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Passbook Copy (Optional)
          <input type="file" accept="image/*,.pdf" onChange={(e) => setPassbook(e.target.files?.[0] || null)} className="mt-1 block w-full text-sm" />
          {existing?.passbookCopyPath && (
            <a href={resolveAssetUrl(existing.passbookCopyPath)} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-brand-700">View current file</a>
          )}
        </label>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-warm-white hover:bg-brand-800 disabled:opacity-50"
        >
          {saving ? 'Saving…' : existing ? 'Update Bank Details' : 'Save Bank Details'}
        </button>
      </form>
    </div>
  );
}
