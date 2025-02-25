import React, { useState } from 'react';
import { Calendar, Map, Warehouse, MessageSquare, FileSpreadsheet, Users } from 'lucide-react';
import { RoutePlanning } from './RoutePlanning';
import { Calendar as CalendarModule } from '../modules/calendar/Calendar';
import { LeadManagement } from '../modules/leads/LeadManagement';
import type { ViewMode, UserRole } from '../types';

interface DashboardProps {
  viewMode: ViewMode;
  userRole: UserRole;
}

export function Dashboard({ viewMode, userRole }: DashboardProps) {
  const [activeModule, setActiveModule] = useState<string | null>(null);

  const modules = [
    { icon: Calendar, title: 'Calendar', description: 'Schedule and manage moves', component: CalendarModule },
    { icon: Map, title: 'Route Planning', description: 'Plan and optimize moving routes', component: RoutePlanning },
    { icon: Users, title: 'Lead Management', description: 'Manage and track leads', component: LeadManagement },
    { icon: Warehouse, title: 'Inventory', description: 'Track warehouse inventory' },
    { icon: MessageSquare, title: 'Communications', description: 'Team messaging and notifications' },
    { icon: FileSpreadsheet, title: 'Reports', description: 'Generate and view reports' },
  ];

  if (activeModule) {
    const ActiveComponent = modules.find(m => m.title === activeModule)?.component;
    return (
      <div className="fixed inset-0 bg-white">
        {ActiveComponent && <ActiveComponent viewMode={viewMode} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-12 pt-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">MoveBuddy</h1>
          <p className="text-gray-600">
            {userRole === 'manager' ? 'Manager Dashboard' : 'Employee Dashboard'}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              onClick={() => setActiveModule(title)}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Icon className="text-blue-600" size={24} />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              </div>
              <p className="text-gray-600">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}