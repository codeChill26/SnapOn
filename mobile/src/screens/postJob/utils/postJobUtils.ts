export const WORK_MODES = [
  { label: 'Tại chỗ (Onsite)', value: 'ONSITE' },
  { label: 'Từ xa (Remote)', value: 'REMOTE' },
  { label: 'Theo thỏa thuận', value: 'NEGOTIABLE' },
];

export const SALARY_UNITS = [
  { label: '/công việc', value: 'PER_JOB' },
  { label: '/giờ', value: 'PER_HOUR' },
  { label: '/ngày', value: 'PER_DAY' },
  { label: '/tháng', value: 'PER_MONTH' },
];

export const EMPLOYMENT_TYPES = [
  { label: 'Công việc một lần', value: 'ONE_TIME' },
  { label: 'Bán thời gian', value: 'PART_TIME' },
  { label: 'Toàn thời gian', value: 'FULL_TIME' },
  { label: 'Theo hợp đồng', value: 'CONTRACT' },
  { label: 'Freelance', value: 'FREELANCE' },
  { label: 'Theo ca', value: 'SHIFT' },
  { label: 'Thực tập', value: 'INTERNSHIP' },
  { label: 'Theo thỏa thuận', value: 'NEGOTIABLE' },
];

export const EXPERIENCE_LEVELS = [
  { label: 'Không yêu cầu kinh nghiệm', value: 'NO_REQUIREMENT' },
  { label: 'Chưa có kinh nghiệm', value: 'NO_EXPERIENCE' },
  { label: 'Dưới 1 năm', value: 'UNDER_1_YEAR' },
  { label: '1–2 năm', value: 'ONE_TO_TWO_YEARS' },
  { label: '3–5 năm', value: 'THREE_TO_FIVE_YEARS' },
  { label: 'Trên 5 năm', value: 'OVER_FIVE_YEARS' },
];

export const EDUCATION_LEVELS = [
  { label: 'Không yêu cầu bằng cấp', value: 'NO_REQUIREMENT' },
  { label: 'Trung học cơ sở', value: 'SECONDARY_SCHOOL' },
  { label: 'Trung học phổ thông', value: 'HIGH_SCHOOL' },
  { label: 'Trung cấp nghề', value: 'VOCATIONAL' },
  { label: 'Cao đẳng', value: 'COLLEGE' },
  { label: 'Đại học', value: 'UNIVERSITY' },
  { label: 'Sau đại học', value: 'POSTGRADUATE' },
  { label: 'Chứng chỉ chuyên môn', value: 'CERTIFICATE' },
];

export const GENDER_REQUIREMENTS = [
  { label: 'Không yêu cầu giới tính', value: 'NO_REQUIREMENT' },
  { label: 'Nam', value: 'MALE' },
  { label: 'Nữ', value: 'FEMALE' },
  { label: 'Khác', value: 'OTHER' },
];

export const getRawPrice = (text: string): number => {
  const numericVal = text.replace(/[^0-9]/g, '');
  return parseInt(numericVal) || 0;
};

export const PRICE_PRESETS = [
  { label: '50K–100K', min: 50000, max: 100000 },
  { label: '100K–200K', min: 100000, max: 200000 },
  { label: '150K–300K', min: 150000, max: 300000 },
  { label: '200K–400K', min: 200000, max: 400000 },
  { label: '300K–600K', min: 300000, max: 600000 },
  { label: '500K–1tr', min: 500000, max: 1000000 },
];

export const DEADLINE_PRESETS = [
  { label: '1 ngày', value: 1 },
  { label: '3 ngày', value: 3 },
  { label: '7 ngày', value: 7 },
  { label: '14 ngày', value: 14 },
  { label: '30 ngày', value: 30 },
  { label: 'Không giới hạn', value: null },
];
