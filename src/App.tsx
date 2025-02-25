import React, { useState } from 'react';
import { ViewToggle } from './components/ViewToggle';
import { UserRoleToggle } from './components/UserRoleToggle';
import { Dashboard } from './components/Dashboard';
import type { ViewMode, UserRole } from './types';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [userRole, setUserRole] = useState<UserRole>('manager');

  return (
    <div className="min-h-screen bg-gray-100">
      <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
      <UserRoleToggle userRole={userRole} setUserRole={setUserRole} />
      <Dashboard viewMode={viewMode} userRole={userRole} />
    </div>
  );
}

export default App;