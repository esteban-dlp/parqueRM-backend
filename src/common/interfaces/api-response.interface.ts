export interface ApiResponse<T = unknown> {
  success: boolean;
  code: string;
  message: string;
  data: T | null;
  meta?: Record<string, unknown>;
  errors?: Record<string, unknown> | string[] | null;
}

export interface AuthenticatedUser {
  id: number;
  username: string;
  roleId: number;
  roleName: string;
  permissions: string[];
}
