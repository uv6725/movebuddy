export type ViewMode = 'desktop' | 'tablet' | 'phone';
export type UserRole = 'manager' | 'employee';

export interface ViewToggleProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

export interface UserRoleToggleProps {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
}

// Add Google Maps types
declare global {
  interface Window {
    google: typeof google;
  }
}