export enum SCHEMA_TYPE {
  PG_TABLE = 1,
  AUTH_TABLE = 2,
  JSON_STANDALONE = 3,
}

export enum FIELD_TYPE {
  TEXT = 1,
  EDITOR = 2,
  NUMBER = 3,
  BOOL = 4,
  EMAIL = 5,
  URL = 6,
  DATE = 7,
  SELECT = 8,
  FILE = 9,
  JSON = 10,
  RELATION = 11,
}

export enum API_NAMES {
  GET_ALL = 'Filtering / Pagination',
  GET_BY_ID = 'Details',
  POST = 'Create',
  PUT = 'Update',
  DELETE = 'Delete',
}
