'use client';

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Layers,
  BarChart2,
  LineChart
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
type MonthViewType = 'weekly' | 'daily';

export default function GrowthAnalyticsCharts({
  userRecords,
  taskRecords,
  withdrawRecords,
}: GrowthAnalyticsChartsProps) {
  const [mode, setMode] = useState<ModeType>('7d');
  const [metric, setMetric] = useState<MetricType>('users');
  const [monthView, setMonthView] = useState<MonthViewType>('weekly'); // Default weekly for clean 30-day view
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

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

    // Check if we should aggregate by weeks in Month mode
    const isWeeklyMode = mode === 'month' && monthView === 'weekly';

    if (isWeeklyMode) {
      // Group into 4 clean weeks: T1 (1-7), T2 (8-14), T3 (15-21), T4 (22-cuối tháng)
      const currentBuckets = [0, 0, 0, 0];
      const prevBuckets = [0, 0, 0, 0];
      const labels = ['Tuần 1 (1-7)', 'Tuần 2 (8-14)', 'Tuần 3 (15-21)', 'Tuần 4 (22-30)'];

      activeRecords.forEach((r) => {
        const d = new Date(r.createdAt);
        const dayOfMonth = d.getDate();
        const m = d.getMonth();
        const y = d.getFullYear();

        // Current Month
        if (m === now.getMonth() && y === now.getFullYear()) {
          if (dayOfMonth <= 7) currentBuckets[0]++;
          else if (dayOfMonth <= 14) currentBuckets[1]++;
          else if (dayOfMonth <= 21) currentBuckets[2]++;
          else currentBuckets[3]++;
        }

        // Previous Month
        const prevMonthVal = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const prevYearVal = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

        if (m === prevMonthVal && y === prevYearVal) {
          if (dayOfMonth <= 7) prevBuckets[0]++;
          else if (dayOfMonth <= 14) prevBuckets[1]++;
          else if (dayOfMonth <= 21) prevBuckets[2]++;
          else prevBuckets[3]++;
        }
      });

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
    }

    // Daily buckets mode
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
  }, [mode, metric, monthView, activeRecords, customStartDate, customEndDate]);

  // SVG Chart Geometry Constants
  const width = 800;
  const height = 230;
  const padding = 45;
  const bottomMargin = 35;

  const maxVal = Math.max(...comparisonData.currentBuckets, ...comparisonData.prevBuckets, 1);

  const getPoints = (buckets: number[]) => {
    return buckets.map((v, i) => {
      const x = padding + (i / Math.max(buckets.length - 1, 1)) * (width - 2 * padding);
      const y = (height - padding - bottomMargin) - (v / maxVal) * (height - 2 * padding - bottomMargin);
      return { x, y, value: v };
    });
  };

  const currentPoints = getPoints(comparisonData.currentBuckets);
  const prevPoints = getPoints(comparisonData.prevBuckets);

  const currentPathD = currentPoints.length > 0 ? `M ${currentPoints.map(p => `${p.x},${p.y}`).join(' L ')}` : '';
  const prevPathD = prevPoints.length > 0 ? `M ${prevPoints.map(p => `${p.x},${p.y}`).join(' L ')}` : '';

  const currentAreaD = currentPoints.length > 0
    ? `M ${padding},${height - padding - bottomMargin} L ${currentPoints.map(p => `${p.x},${p.y}`).join(' L ')} L ${width - padding},${height - padding - bottomMargin} Z`
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

      {/* Sub-toggle for Month View Mode */}
      {mode === 'month' && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#F4F4F5] border border-[#E4E4E7] text-xs">
          <div className="flex items-center gap-2 text-[#312F2C] font-bold">
            <BarChart2 className="h-4 w-4 text-amber-600" />
            <span>Chế độ xem Tháng:</span>
          </div>
          <div className="flex bg-white border border-[#E4E4E7] rounded-lg p-0.5 shadow-2xs font-extrabold">
            <button
              onClick={() => setMonthView('weekly')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                monthView === 'weekly' ? 'bg-[#312F2C] text-white' : 'text-[#71717A] hover:text-[#18181B]'
              }`}
            >
              <span>Gom 4 Tuần (Dễ Nhìn 100%)</span>
              <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.2 rounded-full uppercase">Khuyên Dùng</span>
            </button>
            <button
              onClick={() => setMonthView('daily')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                monthView === 'daily' ? 'bg-[#312F2C] text-white' : 'text-[#71717A] hover:text-[#18181B]'
              }`}
            >
              <span>Xem Từng Ngày (30 Ngày)</span>
            </button>
          </div>
        </div>
      )}

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

        <div className="relative w-full h-[270px] bg-[#FAFAFA] rounded-2xl border border-[#E4E4E7] p-3 overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="currentGradientWhite" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#312F2C" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#312F2C" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#E4E4E7" strokeDasharray="3 3" />
            <line x1={padding} y1={(height - bottomMargin) / 2} x2={width - padding} y2={(height - bottomMargin) / 2} stroke="#E4E4E7" strokeDasharray="3 3" />
            <line x1={padding} y1={height - padding - bottomMargin} x2={width - padding} y2={height - padding - bottomMargin} stroke="#D4D4D8" />

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
                r={currentPoints.length > 20 ? "2.5" : "3.5"}
                fill="#FFFFFF"
                stroke="#3B82F6"
                strokeWidth="2"
              >
                <title>{`Kỳ đối chứng (${comparisonData.labels[i] || `Ngày ${i + 1}`}): ${p.value} lượt`}</title>
              </circle>
            ))}

            {/* Current Period Circles */}
            {currentPoints.map((p, i) => (
              <circle
                key={`cur-${i}`}
                cx={p.x}
                cy={p.y}
                r={currentPoints.length > 20 ? "3.5" : "5"}
                fill="#312F2C"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
                className="hover:r-7 transition-all cursor-pointer"
              >
                <title>{`Kỳ hiện tại (${comparisonData.labels[i]}): ${p.value} lượt | Kỳ trước: ${comparisonData.prevBuckets[i]} lượt`}</title>
              </circle>
            ))}

            {/* Dynamic Date Labels Positioned Pixel-Perfectly Underneath Each Point */}
            {currentPoints.map((p, i) => {
              const totalDots = currentPoints.length;
              let showLabel = true;

              if (totalDots > 10 && totalDots <= 20) {
                showLabel = i % 2 === 0 || i === totalDots - 1;
              } else if (totalDots > 20) {
                showLabel = i % 4 === 0 || i === totalDots - 1;
              }

              if (!showLabel) return null;

              return (
                <text
                  key={`date-lbl-${i}`}
                  x={p.x}
                  y={height - 12}
                  textAnchor="middle"
                  fill="#18181B"
                  fontSize={totalDots <= 5 ? "12" : "11"}
                  fontWeight="bold"
                  fontFamily={totalDots <= 5 ? "sans-serif" : "monospace"}
                >
                  {comparisonData.labels[i]}
                </text>
              );
            })}
          </svg>
        </div>
      </div>
    </Card>
  );
}
