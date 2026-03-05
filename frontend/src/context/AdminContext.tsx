import React, { createContext, useContext } from 'react';
import type { User, Profile, Permission } from '../types';
import type { CreateUserDto } from '../services/users.service';
import type { CreateProfileDto } from '../services/profiles.service';
import type { CreatePermissionDto } from '../services/permissions.service';

interface AdminContextType {
  currentUser: User | null;
  users: User[];
  profiles: Profile[];
  permissions: Permission[];
  isMobile: boolean;
  isAdmin: boolean; // Añadido
  userIdMap: Map<number, string>; // Añadido: frontend ID → backend UUID
  hasPermission: (code: string) => boolean;
  getPermissionStatus: (
    user: User,
    permId: string,
    profiles: Profile[]
  ) => {
    isActive: boolean;
    fromProfile: boolean;
    isCustomAdded: boolean;
    isCustomRemoved: boolean;
  };
  getUserEffectivePermissions: (user: User) => string[]; // Añadido
  createUser: (userData: CreateUserDto) => Promise<void>;
  onUpdateUser: (id: number, userData: Partial<CreateUserDto>) => Promise<void>;
  onDeleteUser: (id: number) => Promise<void>;
  createProfile: (profileData: CreateProfileDto) => Promise<void>;
  onUpdateProfile: (id: string, profileData: Partial<CreateProfileDto>) => Promise<void>;
  onDeleteProfile: (id: string) => Promise<void>;
  createPermission: (permissionData: CreatePermissionDto) => Promise<void>;
  onUpdatePermission: (id: string, permissionData: Partial<CreatePermissionDto>) => Promise<void>;
  onDeletePermission: (id: string) => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const useAdminContext = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdminContext must be used within an AdminSystemProvider');
  }
  return context;
};

export const AdminSystemProvider: React.FC<React.PropsWithChildren<AdminContextType>> = (
  { children, ...props }
) => {
  return (
    <AdminContext.Provider value={props}>
      {children}
    </AdminContext.Provider>
  );
};
