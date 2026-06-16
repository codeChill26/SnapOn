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
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};
const TASK_STATUS_FROM_DB = invert(TASK_STATUS_TO_DB);

const TASK_TYPE_TO_DB = {
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
};
const TASK_TYPE_FROM_DB = invert(TASK_TYPE_TO_DB);

// Application
const APPLICATION_STATUS_TO_DB = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'CANCELLED',
  CANCELLED: 'CANCELLED',
};
const APPLICATION_STATUS_FROM_DB = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
};

// Assigned
const ASSIGNED_BY_TO_DB = {
  MANUAL: 'POSTER',
  AUTO_MATCH: 'SYSTEM',
  ADMIN: 'ADMIN',
};

const ASSIGNED_TASK_STATUS_TO_DB = {
  ASSIGNED: 'ACTIVE',
  IN_PROGRESS: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};
const ASSIGNED_TASK_STATUS_FROM_DB = {
  ACTIVE: 'ASSIGNED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

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
