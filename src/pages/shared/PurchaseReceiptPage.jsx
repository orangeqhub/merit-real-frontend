import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { expressInterestService } from '../../services/expressInterestService';
import PurchaseReceiptView from '../../components/purchases/PurchaseReceiptView';
import { toast } from '../../store/toastStore';

export default function PurchaseReceiptPage({ backPath = '/buyer/purchases' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('SALE');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    expressInterestService
      .getPurchaseReceipt(id, type)
      .then((data) => {
        if (!cancelled) setReceipt(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setReceipt(null);
          toast.error(err.message || 'Receipt not available.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id, type]);

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading receipt…</div>;
  }

  if (!receipt) {
    return (
      <div className="space-y-3 p-6">
        <p className="text-sm text-gray-600">No receipt found for this purchase yet.</p>
        <Link to={backPath} className="text-sm font-medium text-brand-700 hover:underline">← Back to purchases</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <button type="button" onClick={() => navigate(backPath)} className="text-sm text-brand-700 hover:underline">
          ← Back to purchases
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType('SALE')}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${type === 'SALE' ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-gray-200'}`}
          >
            Sale Receipt
          </button>
          <button
            type="button"
            onClick={() => setType('PAYMENT')}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${type === 'PAYMENT' ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-gray-200'}`}
          >
            Payment Receipt
          </button>
        </div>
      </div>
      <PurchaseReceiptView receipt={receipt} />
    </div>
  );
}
