import { create } from 'zustand';
import type { Role } from '@/types/enums';
import type { User } from '@/types/models';
import { seedUsers } from '@/api/seed';

interface AuthState {
  currentUser: User;
  setRole: (role: Role) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: seedUsers.find(u => u.role === 'KIEROWNIK')!,
  setRole: (role) => set({ currentUser: seedUsers.find(u => u.role === role)! }),
}));
