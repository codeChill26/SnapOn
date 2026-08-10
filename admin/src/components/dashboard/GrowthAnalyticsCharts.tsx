'use client';

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Layers,
} from 'lucide-react';

export interface RawRecord {
  createdAt: Date | string;
}

interface GrowthAnalyticsChartsProps {
  userRecords: RawRecord[];
  taskRecords: RawRecord[];
  withdrawRecords: RawRecord[];
}

type ModeType = '7d' | 'month' | 'custom';
type MetricType = 'users' | 'tasks' | 'withdraws';

export default function GrowthAnalyticsCharts({
  userRecords,
  taskRecords,
  withdrawRecords,
}: GrowthAnalyticsChartsProps) {
  const [mode, setMode] = useState<ModeType>('7d');
  const [metric, setMetric] = useState<MetricType>('users');

  const formatDateForInput = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  const defaultStart = new Date(today.getTime() - 6 * 86400 * 1000);

  const [customStartDate, setCustomStartDate] = useState(formatDateForInput(defaultStart));
  const [customEndDate, setCustomEndDate] = useState(formatDateForInput(today));

  const activeRecords = useMemo(() => {
    switch (metric) {
      case 'users': return userRecords;
      case 'tasks': return taskRecords;
      case 'withdraws': return withdrawRecords;
    }
  }, [metric, userRecords, taskRecords, withdrawRecords]);

  const comparisonData = useMemo(() => {
    let currentStart: Date;
    let currentEnd: Date;
    let prevStart: Date;
    let prevEnd: Date;

    const now = new Date();

    if (mode === '7d') {
      currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      currentStart = new Date(currentEnd.getTime() - 6 * 86400 * 1000);
      currentStart.setHours(0, 0, 0, 0);

      prevEnd = new Date(currentStart.getTime() - 1);
      prevStart = new Date(prevEnd.getTime() - 6 * 86400 * 1000);
      prevStart.setHours(0, 0, 0, 0);
    } else if (mode === 'month') {
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 23, 59, 59, 999);
    } else {
      const [sy, sm, sd] = customStartDate.split('-').map(Number);
      const [ey, em, ed] = customEndDate.split('-').map(Number);

      currentStart = new Date(sy || now.getFullYear(), (sm || 1) - 1, sd || 1, 0, 0, 0, 0);
      currentEnd = new Date(ey || now.getFullYear(), (em || 1) - 1, ed || 1, 23, 59, 59, 999);

      if (currentEnd < currentStart) {
        currentEnd = new Date(currentStart.getTime() + 86400 * 1000);
      }

      const diffMs = currentEnd.getTime() - currentStart.getTime();
      prevEnd = new Date(currentStart.getTime() - 1);
      prevStart = new Date(prevEnd.getTime() - diffMs);
      prevStart.setHours(0, 0, 0, 0);
    }

    const daysCount = Math.max(1, Math.round((currentEnd.getTime() - currentStart.getTime()) / (86400 * 1000)));

    const currentBuckets: number[] = new Array(daysCount).fill(0);
    const prevBuckets: number[] = new Array(daysCount).fill(0);
    const labels: string[] = [];

    for (let i = 0; i < daysCount; i++) {
      const curDayStart = new Date(currentStart.getTime() + i * 86400 * 1000);
      curDayStart.setHours(0, 0, 0, 0);
      const curDayEnd = new Date(curDayStart.getTime() + 86400 * 1000 - 1);

      const prvDayStart = new Date(prevStart.getTime() + i * 86400 * 1000);
      prvDayStart.setHours(0, 0, 0, 0);
      const prvDayEnd = new Date(prvDayStart.getTime() + 86400 * 1000 - 1);

      labels.push(curDayStart.toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' }));

      activeRecords.forEach((r) => {
        const t = new Date(r.createdAt).getTime();
        if (t >= curDayStart.getTime() && t <= curDayEnd.getTime()) {
          currentBuckets[i]++;
        }
        if (t >= prvDayStart.getTime() && t <= prvDayEnd.getTime()) {
          prevBuckets[i]++;
        }
      });
    }

    const currentTotal = currentBuckets.reduce((a, b) => a + b, 0);
    const prevTotal = prevBuckets.reduce((a, b) => a + b, 0);

    let percentChange = 0;
    if (prevTotal > 0) {
      percentChange = Math.round(((currentTotal - prevTotal) / prevTotal) * 1000) / 10;
    } else if (currentTotal > 0) {
      percentChange = 100;
    }

    return {
      currentStart,
      currentEnd,
      prevStart,
      prevEnd,
      currentBuckets,
      prevBuckets,
      labels,
      currentTotal,
      prevTotal,
      percentChange,
    };
  }, [mode, metric, customStartDate, customEndDate, activeRecords]);

  const height = 240;
  const width = 750;
  const padding = 35;

  const maxVal = Math.max(...comparisonData.currentBuckets, ...comparisonData.prevBuckets, 1);

  const getPoints = (buckets: number[]) => {
    return buckets.map((v, i) => {
      const x = padding + (i / Math.max(buckets.length - 1, 1)) * (width - 2 * padding);
      const y = height - padding - (v / maxVal) * (height - 2 * padding);
      return { x, y, value: v };
    });
  };

  const currentPoints = getPoints(comparisonData.currentBuckets);
  const prevPoints = getPoints(comparisonData.prevBuckets);

  const currentPathD = currentPoints.length > 0 ? `M ${currentPoints.map(p => `${p.x},${p.y}`).join(' L ')}` : '';
  const prevPathD = prevPoints.length > 0 ? `M ${prevPoints.map(p => `${p.x},${p.y}`).join(' L ')}` : '';

  const currentAreaD = currentPoints.length > 0
    ? `M ${padding},${height - padding} L ${currentPoints.map(p => `${p.x},${p.y}`).join(' L ')} L ${width - padding},${height - padding} Z`
    : '';

  return (
    <Card className="col-span-full p-6 space-y-6 bg-white border-[#E4E4E7] text-[#18181B] shadow-md">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E4E4E7] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-[#312F2C]" />
            <h3 className="text-xl font-extrabold text-[#18181B] tracking-tight">Biểu Đồ So Sánh & Tăng Trưởng (Nested Comparison)</h3>
          </div>
          <p className="text-xs text-[#71717A] mt-1 font-medium">
            So sánh kỳ hiện tại so với kỳ đối chứng trước đó theo dạng biểu đồ lồng nhau.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Metric Selector */}
          <div className="flex bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl p-1 text-xs">
            <button
              onClick={() => setMetric('users')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                metric === 'users' ? 'bg-[#312F2C] text-white shadow-sm' : 'text-[#71717A] hover:text-[#18181B]'
              }`}
            >
              Người Dùng
            </button>
            <button
              onClick={() => setMetric('tasks')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                metric === 'tasks' ? 'bg-[#312F2C] text-white shadow-sm' : 'text-[#71717A] hover:text-[#18181B]'
              }`}
            >
              Công Việc
            </button>
            <button
              onClick={() => setMetric('withdraws')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                metric === 'withdraws' ? 'bg-[#312F2C] text-white shadow-sm' : 'text-[#71717A] hover:text-[#18181B]'
              }`}
            >
              Rút Tiền
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="flex bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl p-1 text-xs">
            <button
              onClick={() => setMode('7d')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                mode === '7d' ? 'bg-white text-[#18181B] shadow-xs' : 'text-[#71717A] hover:text-[#18181B]'
              }`}
            >
              7 Ngày vs 7 Ngày Trước
            </button>
            <button
              onClick={() => setMode('month')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                mode === 'month' ? 'bg-white text-[#18181B] shadow-xs' : 'text-[#71717A] hover:text-[#18181B]'
              }`}
            >
              Tháng Này vs Tháng Trước
            </button>
            <button
              onClick={() => setMode('custom')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                mode === 'custom' ? 'bg-white text-[#18181B] shadow-xs' : 'text-[#71717A] hover:text-[#18181B]'
              }`}
            >
              Tùy Chọn Ngày
            </button>
          </div>
        </div>
      </div>

      {/* Date Pickers for Custom Mode */}
      {mode === 'custom' && (
        <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-[#F4F4F5] border border-[#E4E4E7] text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#312F2C]" />
            <span className="font-bold text-[#18181B]">Từ Ngày:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-white border border-[#D4D4D8] text-[#18181B] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#312F2C] shadow-2xs font-semibold"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-[#18181B]">Đến Ngày:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-white border border-[#D4D4D8] text-[#18181B] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#312F2C] shadow-2xs font-semibold"
            />
          </div>

          <p className="text-[11px] text-[#71717A] italic">
            Tự động tính kỳ đối chứng liền trước tương ứng để so sánh lồng nhau.
          </p>
        </div>
      )}

      {/* Summary KPI Comparison Header */}
      <div className="grid gap-4 sm:grid-cols-3 p-5 rounded-2xl bg-[#F4F4F5] border border-[#E4E4E7]">
        <div>
          <p className="text-xs text-[#71717A] font-bold uppercase tracking-wider">Kỳ Hiện Tại (Current)</p>
          <h4 className="text-2xl font-extrabold text-[#18181B] mt-1">
            {comparisonData.currentTotal.toLocaleString()} <span className="text-xs font-semibold text-[#71717A]">lượt</span>
          </h4>
          <p className="text-[11px] text-[#71717A] mt-0.5 font-mono">
            {comparisonData.currentStart.toLocaleDateString('vi-VN')} - {comparisonData.currentEnd.toLocaleDateString('vi-VN')}
          </p>
        </div>

        <div>
          <p className="text-xs text-[#71717A] font-bold uppercase tracking-wider">Kỳ Đối Chứng (Previous)</p>
          <h4 className="text-2xl font-extrabold text-[#71717A] mt-1">
            {comparisonData.prevTotal.toLocaleString()} <span className="text-xs font-semibold text-[#71717A]">lượt</span>
          </h4>
          <p className="text-[11px] text-[#71717A] mt-0.5 font-mono">
            {comparisonData.prevStart.toLocaleDateString('vi-VN')} - {comparisonData.prevEnd.toLocaleDateString('vi-VN')}
          </p>
        </div>

        <div className="flex flex-col justify-center">
          <p className="text-xs text-[#71717A] font-bold uppercase tracking-wider">Tỷ Lệ Tăng Trưởng</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold border ${
              comparisonData.percentChange > 0
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : comparisonData.percentChange < 0
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : 'bg-zinc-200 text-zinc-800 border-zinc-300'
            }`}>
              {comparisonData.percentChange > 0 ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : comparisonData.percentChange < 0 ? (
                <TrendingDown className="h-3.5 w-3.5" />
              ) : (
                <Minus className="h-3.5 w-3.5" />
              )}
              {comparisonData.percentChange > 0 ? `+${comparisonData.percentChange}%` : `${comparisonData.percentChange}%`}
            </span>
            <span className="text-xs text-[#71717A] font-medium">so với kỳ trước</span>
          </div>
        </div>
      </div>

      {/* Legend & Chart Canvas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#312F2C]" />
              <span className="font-bold text-[#18181B]">Kỳ Hiện Tại (Line Liền Nét)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-4 bg-[#3B82F6] stroke-dasharray-2" />
              <span className="font-bold text-[#3B82F6]">Kỳ Đối Chứng (Line Nét Đứt)</span>
            </div>
          </div>

          <span className="text-[#71717A] font-mono font-semibold">Max Value: {maxVal}</span>
        </div>

        <div className="relative w-full h-[250px] bg-[#FAFAFA] rounded-2xl border border-[#E4E4E7] p-3 overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="currentGradientWhite" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#312F2C" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#312F2C" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#E4E4E7" strokeDasharray="3 3" />
            <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#E4E4E7" strokeDasharray="3 3" />
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#D4D4D8" />

            {/* Current Period Area */}
            <path d={currentAreaD} fill="url(#currentGradientWhite)" />

            {/* Previous Period Line (Dashed #3B82F6 Blue) */}
            <path
              d={prevPathD}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2.5"
              strokeDasharray="5 5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Current Period Line (Solid #312F2C Jet) */}
            <path
              d={currentPathD}
              fill="none"
              stroke="#312F2C"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Previous Period Circles */}
            {prevPoints.map((p, i) => (
              <circle
                key={`prev-${i}`}
                cx={p.x}
                cy={p.y}
                r="3.5"
                fill="#FFFFFF"
                stroke="#3B82F6"
                strokeWidth="2"
              >
                <title>{`Kỳ trước (Ngày ${i + 1}): ${p.value} lượt`}</title>
              </circle>
            ))}

            {/* Current Period Circles */}
            {currentPoints.map((p, i) => (
              <circle
                key={`cur-${i}`}
                cx={p.x}
                cy={p.y}
                r="5"
                fill="#312F2C"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                className="hover:r-7 transition-all cursor-pointer"
              >
                <title>{`Kỳ hiện tại (${comparisonData.labels[i] || `Ngày ${i + 1}`}): ${p.value} lượt`}</title>
              </circle>
            ))}
          </svg>
        </div>

        {/* X-axis Labels */}
        <div className="flex justify-between items-center text-[11px] text-[#71717A] font-mono px-2 font-semibold">
          <span>{comparisonData.labels[0] || 'Start'}</span>
          <span>{comparisonData.labels[Math.floor(comparisonData.labels.length / 2)] || 'Middle'}</span>
          <span>{comparisonData.labels[comparisonData.labels.length - 1] || 'End'}</span>
        </div>
      </div>
    </Card>
  );
}
