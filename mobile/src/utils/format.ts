export const formatCurrency = (amount: number | string | undefined | null): string => {
  const numericAmount = Number(amount);
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(isNaN(numericAmount) ? 0 : numericAmount);
};

export const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return 'Chưa cập nhật';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Chưa cập nhật';
    }
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch (error) {
    console.error('formatDate error:', error);
    return 'Chưa cập nhật';
  }
};

export const formatShortDate = (dateString: string | undefined | null): string => {
  if (!dateString) return 'Chưa cập nhật';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Chưa cập nhật';
    }
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).format(date);
  } catch (error) {
    console.error('formatShortDate error:', error);
    return 'Chưa cập nhật';
  }
};

export const formatRelativeTime = (dateString: string | undefined | null): string => {
  if (!dateString) return 'Chưa cập nhật';
  try {
    const now = new Date();
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Chưa cập nhật';
    }
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return formatDate(dateString);
  } catch (error) {
    console.error('formatRelativeTime error:', error);
    return 'Chưa cập nhật';
  }
};

export const formatTimeRemaining = (endDateString: string | undefined | null): string => {
  if (!endDateString) return 'Chưa cập nhật';
  try {
    const now = new Date();
    const end = new Date(endDateString);
    if (isNaN(end.getTime())) {
      return 'Chưa cập nhật';
    }
    const diffMs = end.getTime() - now.getTime();

    if (diffMs <= 0) return 'Đã hết hạn';

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 0) return `${diffDays} ngày ${diffHours} giờ`;
    if (diffHours > 0) return `${diffHours} giờ ${diffMins} phút`;
    return `${diffMins} phút`;
  } catch (error) {
    console.error('formatTimeRemaining error:', error);
    return 'Chưa cập nhật';
  }
};

export const getStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    OPEN: 'Đang mở',
    IN_PROGRESS: 'Đang thực hiện',
    COMPLETED: 'Hoàn thành',
    CANCELLED: 'Đã hủy',
    PENDING: 'Chờ duyệt',
    ACCEPTED: 'Đã chấp nhận',
    REJECTED: 'Từ chối',
    ACTIVE: 'Đang hoạt động',
    HOLDING: 'Đang giữ',
    RELEASED: 'Đã giải ngân',
    REFUNDED: 'Đã hoàn tiền',
    DISPUTED: 'Đang tranh chấp',
  };
  return statusMap[status] || status;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
