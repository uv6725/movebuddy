import React from 'react';
import { UserCog, Users } from 'lucide-react';
import type { UserRoleToggleProps, UserRole } from '../types';

export function UserRoleToggle({ userRole, setUserRole }: UserRoleToggleProps) {
  const roles: { role: UserRole; Icon: React.ElementType; label: string }[] = [
    { role: 'manager', Icon: UserCog, label: 'Manager' },
    { role: 'employee', Icon: Users, label: 'Employee' },
  ];

  return (
    <div className="fixed top-4 left-4 bg-white rounded-lg shadow-md p-2 flex gap-2">
      {roles.map(({ role, Icon, label }) => (
        <button
          key={role}
          onClick={() => setUserRole(role)}
          className={`p-2 rounded-md flex items-center gap-2 transition-colors
            ${userRole === role 
              ? 'bg-blue-500 text-white' 
              : 'hover:bg-gray-100'
            }`}
          title={label}
        >
          <Icon size={20} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}