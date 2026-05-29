/**
 * DB enum/value mapping (DB = createdb.txt lowercase enums)
 * API layer expects UPPERCASE values (validators/constants).
 */

const normalize = (value) => (value == null ? null : String(value));

const mapValue = (value, map) => {
  const v = normalize(value);
  if (v == null) return null;
  const mapped = map[v];
  return mapped ?? v;
};

const invert = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [v, k]));

// Task
const TASK_STATUS_TO_DB = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};
const TASK_STATUS_FROM_DB = invert(TASK_STATUS_TO_DB);

const TASK_TYPE_TO_DB = {
  ONLINE: 'online',
  OFFLINE: 'offline',
};
const TASK_TYPE_FROM_DB = invert(TASK_TYPE_TO_DB);

// Application
const APPLICATION_STATUS_TO_DB = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  // DB has no WITHDRAWN, map to cancelled
  WITHDRAWN: 'cancelled',
  CANCELLED: 'cancelled',
};
const APPLICATION_STATUS_FROM_DB = {
  pending: 'PENDING',
  accepted: 'ACCEPTED',
  rejected: 'REJECTED',
  cancelled: 'CANCELLED',
};

// Assigned
const ASSIGNED_BY_TO_DB = {
  MANUAL: 'hirer',
  AUTO_MATCH: 'system',
  ADMIN: 'admin',
};

const ASSIGNED_TASK_STATUS_TO_DB = {
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};
const ASSIGNED_TASK_STATUS_FROM_DB = invert(ASSIGNED_TASK_STATUS_TO_DB);

module.exports = {
  toDbTaskStatus: (apiValue) => mapValue(apiValue, TASK_STATUS_TO_DB),
  fromDbTaskStatus: (dbValue) => mapValue(dbValue, TASK_STATUS_FROM_DB),
  toDbTaskType: (apiValue) => mapValue(apiValue, TASK_TYPE_TO_DB),
  fromDbTaskType: (dbValue) => mapValue(dbValue, TASK_TYPE_FROM_DB),

  toDbApplicationStatus: (apiValue) => mapValue(apiValue, APPLICATION_STATUS_TO_DB),
  fromDbApplicationStatus: (dbValue) => mapValue(dbValue, APPLICATION_STATUS_FROM_DB),

  toDbAssignedBy: (apiValue) => mapValue(apiValue, ASSIGNED_BY_TO_DB),

  toDbAssignedTaskStatus: (apiValue) => mapValue(apiValue, ASSIGNED_TASK_STATUS_TO_DB),
  fromDbAssignedTaskStatus: (dbValue) => mapValue(dbValue, ASSIGNED_TASK_STATUS_FROM_DB),
};
