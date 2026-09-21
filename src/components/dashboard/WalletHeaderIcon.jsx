import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { walletService } from '../../services/walletService';
import { useAuthStore } from '../../store/authStore';
import { useRealtimeSocket } from '../../hooks/useRealtimeSocket';
import { notificationService } from '../../services/notificationService';
import { formatInr } from '../../utils/formatIndianNumber';

export default function WalletHeaderIcon() {
  const { user } = useAuthStore();
  const isAgent = user?.role === 'agent' || user?.role === 'mediator' || user?.role === 'AGENT';
  const [wallet, setWallet] = useState(null);
  const [walletUnread, setWalletUnread] = useState(0);

  async function load() {
    if (!isAgent) return;
    try {
      const [w, list] = await Promise.all([
        walletService.getMine(),
        notificationService.getForUser().catch(() => []),
      ]);
      setWallet(w);
      const unread = (list || []).filter(
        (n) => !n.read && String(n.notificationType || n.type || '').startsWith('wallet_')
      ).length;
      setWalletUnread(unread);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    load();
  }, [user?.id, isAgent]);

  useRealtimeSocket({
    enabled: isAgent,
    onWalletUpdate: (payload) => {
      if (payload?.wallet) setWallet(payload.wallet);
      else load();
    },
    onNotification: (n) => {
      if (String(n?.notificationType || n?.type || '').startsWith('wallet_') && !n.read) {
        setWalletUnread((c) => c + 1);
      }
    },
  });

  if (!isAgent) return null;

  return (
    <Link
      to="/mediator/wallet"
      className="relative flex items-center gap-2 rounded-full bg-brand-700 px-3 py-1.5 text-warm-white shadow-sm ring-1 ring-brand-800/20 hover:bg-brand-800"
      title="My Wallet"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-brand-900 shadow-inner">
        <Wallet size={16} strokeWidth={2.5} />
      </span>
      <span className="hidden text-sm font-bold tracking-tight sm:inline">
        {formatInr(wallet?.availableBalance ?? wallet?.balance ?? 0)}
      </span>
      {(wallet?.pendingRedemptionRequests > 0 || walletUnread > 0) && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-0.5 text-[10px] font-bold text-brand-950 ring-2 ring-warm-white">
          {(wallet?.pendingRedemptionRequests || 0) + walletUnread > 99
            ? '99+'
            : (wallet?.pendingRedemptionRequests || 0) + walletUnread}
        </span>
      )}
    </Link>
  );
}
