import React from 'react';
import { Page } from '../types';

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate, isOpen, onClose }) => {
  const getLinkClass = (page: Page) => {
    const base = "flex items-center gap-3 px-3 py-2.5 rounded transition-colors cursor-pointer group/item whitespace-nowrap ";
    if (activePage === page || (activePage === 'campaign-editor' && page === 'campaigns')) {
      return base + "bg-primary/10 text-primary font-bold";
    }
    return base + "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary dark:hover:text-primary";
  };

  return (
    <aside 
      className={`
        bg-white dark:bg-[#151b2b] border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 ease-in-out group z-20 flex-shrink-0 overflow-hidden
        ${isOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 border-none'}
      `}
    >
      {/* Sidebar Header Space (Logo is now in Header) */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100 dark:border-slate-800/50">
         {/* Placeholder or simple branding text if sidebar is open, though user moved main logo to right */}
         <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Menu</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-3">
        <div onClick={() => onNavigate('dashboard')} className={getLinkClass('dashboard')}>
          <span className="material-symbols-outlined text-[24px]">dashboard</span>
          <span className="block text-sm">Dashboard</span>
        </div>
        
        {/* Tasks Link Added Here */}
        <div onClick={() => onNavigate('tasks')} className={getLinkClass('tasks')}>
          <span className="material-symbols-outlined text-[24px]">check_circle</span>
          <span className="block text-sm">Tarefas</span>
        </div>

        <div onClick={() => onNavigate('campaigns')} className={getLinkClass('campaigns')}>
          <span className={`material-symbols-outlined text-[24px] ${activePage === 'campaigns' || activePage === 'campaign-editor' ? 'fill-1' : ''}`}>campaign</span>
          <span className="block text-sm">Campanhas</span>
        </div>
        <div onClick={() => onNavigate('contacts')} className={getLinkClass('contacts')}>
          <span className="material-symbols-outlined text-[24px]">groups</span>
          <span className="block text-sm">Contatos</span>
        </div>
        <div onClick={() => onNavigate('companies')} className={getLinkClass('companies')}>
          <span className="material-symbols-outlined text-[24px]">domain</span>
          <span className="block text-sm">Empresas</span>
        </div>
        <div onClick={() => onNavigate('reports')} className={getLinkClass('reports')}>
          <span className="material-symbols-outlined text-[24px]">bar_chart</span>
          <span className="block text-sm">Relatórios</span>
        </div>
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        <div onClick={() => onNavigate('settings')} className={getLinkClass('settings')}>
          <span className="material-symbols-outlined text-[24px]">settings</span>
          <span className="block text-sm">Configurações</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;