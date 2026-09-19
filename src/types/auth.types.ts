export type Role = 'ADMIN' | 'REMIXER' | 'USER';

export interface User {
  id: string;
  email: string;
  username: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export interface UpdateProfilePayload {
  username: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}
