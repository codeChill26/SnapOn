import { useState, useEffect } from 'react';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface CountdownTimerProps {
  expiresAt?: number | string | null;
  size?: 'sm' | 'md' | 'lg';
  onExpire?: () => void;
}

export function CountdownTimer({ expiresAt, size = 'md', onExpire }: CountdownTimerProps) {
  const targetTime = typeof expiresAt === 'string' ? new Date(expiresAt).getTime() : (expiresAt || 0);

  const [remaining, setRemaining] = useState(() => {
    if (!targetTime || isNaN(targetTime)) return 0;
    return Math.max(0, targetTime - Date.now());
  });

  useEffect(() => {
    if (!targetTime || isNaN(targetTime)) return;
    const r = Math.max(0, targetTime - Date.now());
    setRemaining(r);
    if (r <= 0) {
      onExpire?.();
      return;
    }

    const id = setInterval(() => {
      const rem = Math.max(0, targetTime - Date.now());
      setRemaining(rem);
      if (rem <= 0) {
        clearInterval(id);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(id);
  }, [targetTime, onExpire]);

  if (!targetTime || isNaN(targetTime)) {
    return (
      <div className="flex items-center gap-1 text-xs text-gray-400 font-medium">
        <Clock className="w-3 h-3" />
        <span>Linh hoạt</span>
      </div>
    );
  }
  const isExpired = remaining <= 0;
  const isUrgent = remaining > 0 && remaining < 2 * 3600 * 1000; // Under 2 hours

  const days = Math.floor(remaining / (24 * 3600 * 1000));
  const hours = Math.floor((remaining % (24 * 3600 * 1000)) / (3600 * 1000));
  const mins = Math.floor((remaining % (3600 * 1000)) / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);

  // Formatted display text
  let formattedTime = '';
  if (isExpired) {
    formattedTime = 'Hết hạn';
  } else if (days > 30) {
    formattedTime = 'Không thời hạn';
  } else if (days > 1) {
    formattedTime = `${days} ngày nữa`;
  } else if (days === 1) {
    formattedTime = `1 ngày ${hours}h`;
  } else if (hours > 0) {
    formattedTime = `${hours}h ${mins}m`;
  } else {
    formattedTime = `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  if (size === 'sm') {
    return (
      <div className={`inline-flex items-center gap-1 text-xs font-semibold ${
        isExpired ? 'text-gray-400' : isUrgent ? 'text-red-500 font-bold' : 'text-gray-500'
      }`}>
        <Clock className="w-3 h-3" />
        <span>{formattedTime}</span>
      </div>
    );
  }

  if (size === 'lg') {
    return (
      <div className="flex flex-col items-center">
        {isExpired ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 className="w-10 h-10 text-gray-400" />
            <span className="text-gray-500 font-bold text-base">Đã đóng nhận hồ sơ</span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className={`flex items-baseline gap-2 ${isUrgent ? 'text-red-500' : 'text-orange-600'}`}>
              <Clock className="w-6 h-6" />
              <span className="font-extrabold text-2xl md:text-3xl tracking-tight">
                {formattedTime}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1 font-medium">Thời hạn nhận hồ sơ ứng tuyển</p>
          </div>
        )}
      </div>
    );
  }

  // Size md
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
      isExpired
        ? 'bg-gray-100 text-gray-500'
        : isUrgent
        ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse'
        : 'bg-orange-50 text-orange-600 border border-orange-200'
    }`}>
      <Clock className="w-3.5 h-3.5" />
      <span>{formattedTime}</span>
    </div>
  );
}
