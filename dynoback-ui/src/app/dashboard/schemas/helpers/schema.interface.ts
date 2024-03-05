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
