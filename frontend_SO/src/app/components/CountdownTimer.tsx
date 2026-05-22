import { useState, useEffect } from 'react';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface CountdownTimerProps {
  expiresAt: number;
  size?: 'sm' | 'md' | 'lg';
  onExpire?: () => void;
}

export function CountdownTimer({ expiresAt, size = 'md', onExpire }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(Math.max(0, expiresAt - Date.now()));

  useEffect(() => {
    if (remaining <= 0) {
      onExpire?.();
      return;
    }
    const id = setInterval(() => {
      const r = Math.max(0, expiresAt - Date.now());
      setRemaining(r);
      if (r <= 0) {
        clearInterval(id);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpire]);

  const totalMs = expiresAt - (expiresAt - remaining - (Date.now() - expiresAt + remaining));
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const progress = Math.max(0, remaining / (10 * 60 * 1000));
  const isExpired = remaining <= 0;
  const isUrgent = remaining < 60000 && remaining > 0;

  if (size === 'sm') {
    return (
      <div className={`flex items-center gap-1 text-xs ${isExpired ? 'text-gray-400' : isUrgent ? 'text-red-500' : 'text-orange-500'}`}
        style={{ fontWeight: 600 }}>
        <Clock className="w-3 h-3" />
        {isExpired ? 'Hết hạn' : `${mins}:${secs.toString().padStart(2, '0')}`}
      </div>
    );
  }

  if (size === 'lg') {
    return (
      <div className="flex flex-col items-center">
        {isExpired ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <span className="text-green-600" style={{ fontWeight: 700, fontSize: '1.1rem' }}>Đã đóng ứng tuyển</span>
          </div>
        ) : (
          <>
            <div className={`flex items-baseline gap-1 ${isUrgent ? 'text-red-500' : 'text-orange-500'}`}>
              <span style={{ fontWeight: 800, fontSize: '3.5rem', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {mins.toString().padStart(2, '0')}
              </span>
              <span style={{ fontWeight: 800, fontSize: '2.5rem' }}>:</span>
              <span style={{ fontWeight: 800, fontSize: '3.5rem', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {secs.toString().padStart(2, '0')}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`w-2 h-2 rounded-full animate-pulse ${isUrgent ? 'bg-red-500' : 'bg-orange-400'}`} />
              <span className={`text-sm ${isUrgent ? 'text-red-500' : 'text-gray-500'}`} style={{ fontWeight: isUrgent ? 600 : 400 }}>
                {isUrgent ? 'Sắp hết hạn!' : 'Còn thời gian ứng tuyển'}
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full max-w-xs mt-3 bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${isUrgent ? 'bg-red-500' : 'bg-orange-400'}`}
                style={{ width: `${Math.min(100, progress * 100)}%` }}
              />
            </div>
          </>
        )}
      </div>
    );
  }

  // md (default)
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
      isExpired ? 'bg-gray-100 text-gray-500' :
      isUrgent ? 'bg-red-50 text-red-600' :
      'bg-orange-50 text-orange-600'
    }`} style={{ fontWeight: 600 }}>
      {isExpired ? (
        <><AlertCircle className="w-4 h-4" /> Hết hạn</>
      ) : (
        <>
          <div className={`w-2 h-2 rounded-full animate-pulse ${isUrgent ? 'bg-red-500' : 'bg-orange-400'}`} />
          <Clock className="w-4 h-4" />
          {mins}:{secs.toString().padStart(2, '0')} còn lại
        </>
      )}
    </div>
  );
}
