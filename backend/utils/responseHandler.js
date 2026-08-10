/**
 * Standardized API Response Handler
 */

const success = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const error = (res, message = 'Internal Server Error', statusCode = 500, details = null, code = 'INTERNAL_SERVER_ERROR') => {
  let cleanMessage = message;
  let cleanStatusCode = statusCode;
  let cleanDetails = details;
  let cleanCode = code;

  if (message instanceof Error) {
    cleanMessage = message.message;
    cleanStatusCode = message.statusCode || message.status || statusCode;
    cleanDetails = message.details || message.errors || details;
    cleanCode = message.code || (cleanStatusCode === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_SERVER_ERROR');
  }

  // Map HTTP Status codes to default Error Codes if not specified
  if (!cleanCode || cleanCode === 'INTERNAL_SERVER_ERROR') {
    if (cleanStatusCode === 400) cleanCode = 'BAD_REQUEST';
    else if (cleanStatusCode === 401) cleanCode = 'AUTH_REQUIRED';
    else if (cleanStatusCode === 403) cleanCode = 'FORBIDDEN';
    else if (cleanStatusCode === 404) cleanCode = 'NOT_FOUND';
    else if (cleanStatusCode === 429) cleanCode = 'RATE_LIMIT_EXCEEDED';
  }

  const responseBody = {
    success: false,
    code: cleanCode,
    message: cleanMessage
  };

  if (cleanDetails) {
    responseBody.details = cleanDetails;
    responseBody.errors = cleanDetails; // Backwards compatibility for errors field
  }

  return res.status(cleanStatusCode).json(responseBody);
};

const paginated = (res, data, pagination = {}, message = 'Success', extra = {}) => {
  const page = pagination.page !== undefined && pagination.page !== null ? parseInt(pagination.page, 10) : null;
  const limit = pagination.limit !== undefined && pagination.limit !== null ? parseInt(pagination.limit, 10) : null;
  const total = pagination.total !== undefined && pagination.total !== null ? parseInt(pagination.total, 10) : null;
  
  // Calculate hasNext automatically if not provided explicitly
  let hasNext = false;
  if (pagination.hasNext !== undefined && pagination.hasNext !== null) {
    hasNext = !!pagination.hasNext;
  } else if (page !== null && limit !== null && total !== null) {
    hasNext = (page * limit) < total;
  }
  
  const cursor = pagination.cursor !== undefined ? pagination.cursor : null;
  const totalPages = pagination.totalPages !== undefined && pagination.totalPages !== null
    ? parseInt(pagination.totalPages, 10) 
    : (limit && total ? Math.ceil(total / limit) : null);

  const formattedPagination = {
    page,
    limit,
    total,
    hasNext,
    cursor,
    totalPages
  };

  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: formattedPagination,
    ...extra
  });
};

module.exports = { success, error, paginated };
