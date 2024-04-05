export interface SchemaType {
  id: number;
  name: string;
  isActive: boolean;
}

export interface Column {
  system: boolean;
  isActive: boolean;
  id: number;
  name: string;
  type: string; // You might want to use a union of string literals if the types are known and limited.
  required: boolean;
  presentable: boolean;
  unique: boolean;
  options: Option;
}

export interface Option {
  min?: number | null;
  max?: number | null;
  pattern?: string;
  convertUrls?: boolean;
  noDecimal?: boolean;
  exceptDomains?: any; // Specify more precise type if possible
  onlyDomains?: any; // Specify more precise type if possible
  values?: string[];
  mimeTypes?: string[];
  thumbs?: string[];
  maxSelect?: number;
  maxSize?: number;
  protected?: boolean;
  collectionId?: any; // Specify more precise type if possible
  cascadeDelete?: boolean;
  minSelect?: number | null;
  displayFields?: any; // Specify more precise type if possible
}

// Assuming 'data' is the object containing the 'columns' array
export interface TableStructure {
  columns: Column[];
}

export interface SchemaOption {
  min?: number;
  max?: number;
  pattern?: string;
  convertUrls?: boolean;
  noDecimal?: boolean;
  exceptDomains?: string | null;
  onlyDomains?: string;
  maxSelect?: number;
  values?: string[];
}

export interface SchemaField {
  system: boolean;
  isActive: boolean;
  id: number;
  name: string;
  type: string;
  required: boolean;
  presentable: boolean;
  unique: boolean;
  default: string;
  options: SchemaOption;
}

export interface Schema {
  type: number;
  name: string;
  connectionPoolId: string;
  schema: SchemaField[];
  uuid: string;
  isActive: boolean;
  softDelete: boolean;
  createdBy: string;
  updatedBy: string;
  created: string;
  updated: string;
  operations: string[];
}

export interface Pagination {
  current_page: number;
  per_page: number;
  total_pages: number;
  total: number;
  sort_by: string;
  sort_order: 'asc' | 'desc';
}
