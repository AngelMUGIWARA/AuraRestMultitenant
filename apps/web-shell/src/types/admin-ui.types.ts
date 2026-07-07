export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: 'super_admin';
  avatarUrl?: string;
  permissions: string[];
}
