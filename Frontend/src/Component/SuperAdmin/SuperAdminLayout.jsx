import React, { useState } from 'react';
import SuperAdminSidebar from './SuperAdminSidebar.jsx';
import { Outlet } from 'react-router-dom';

const SuperAdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <SuperAdminSidebar 
        isSidebarOpen={isSidebarOpen} 
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
      />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden md:pl-[280px]">
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default SuperAdminLayout;
