export interface Database {
  uuid: string;
  display_name: string;
  name: string;
  user: string;
  password: string;
  host: string;
  port: number;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
  created: string;
  updated: string;
  label?: string;
  [key: string]: string | number | boolean | any;
}
