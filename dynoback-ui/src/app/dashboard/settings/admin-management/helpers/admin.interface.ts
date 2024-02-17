export interface Admin {
  uuid: string;
  isActive: boolean;
  email: string;
  created: Date;
  access: any;
}

export interface Pagination {
  current_page: number;
  per_page: number;
  total_pages: number;
  total_admins: number;
  sort_by: string;
  sort_order: 'asc' | 'desc';
}

export interface PaginatedAdminResponse {
  success: boolean;
  admins: Admin[];
  pagination: Pagination;
}
