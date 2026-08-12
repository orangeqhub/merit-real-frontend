import { useEffect, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { toast } from '../store/toastStore';

/**
 * Opens a record from ?open= or navigation state after a list loads.
 */
export function useOpenRecordFromUrl({
  records,
  fetchById,
  onOpen,
  paramKey = 'open',
  stateKey = 'openInterestId',
  unavailableMessage = 'This record is no longer available or you no longer have access to it.',
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const openedRef = useRef(null);

  useEffect(() => {
    const openId = searchParams.get(paramKey) || location.state?.[stateKey];
    if (!openId || openedRef.current === String(openId)) return;

    const existing = records.find((row) => String(row.id) === String(openId));
    if (existing) {
      openedRef.current = String(openId);
      onOpen(existing);
      if (searchParams.get(paramKey)) {
        const next = new URLSearchParams(searchParams);
        next.delete(paramKey);
        setSearchParams(next, { replace: true });
      }
      return;
    }

    if (!fetchById) return;

    let active = true;
    fetchById(openId)
      .then((record) => {
        if (!active) return;
        openedRef.current = String(openId);
        if (record) {
          onOpen(record);
        } else {
          toast.error(unavailableMessage);
        }
      })
      .catch(() => {
        if (active) toast.error(unavailableMessage);
      })
      .finally(() => {
        if (!active) return;
        if (searchParams.get(paramKey)) {
          const next = new URLSearchParams(searchParams);
          next.delete(paramKey);
          setSearchParams(next, { replace: true });
        }
      });

    return () => {
      active = false;
    };
  }, [
    records,
    searchParams,
    location.state,
    paramKey,
    stateKey,
    fetchById,
    onOpen,
    unavailableMessage,
    setSearchParams,
  ]);
}
