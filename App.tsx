import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import CampaignList from './components/CampaignList';
import CampaignEditor from './components/CampaignEditor';
import ContactsList from './components/ContactsList';
import ContactDetailsPage from './components/ContactDetailsPage';
import CompaniesList from './components/CompaniesList';
import CompanyDetailsPage from './components/CompanyDetailsPage';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Tasks from './components/Tasks';
import Login from './components/Login';
import { Page, Company, Contact, CampaignData, UserProfile, DashboardStats, AppNotification } from './types';
import { supabase } from './services/supabaseClient';
import { Session } from '@supabase/supabase-js';

// Mock companies data for lookup purposes (Fallback)
const MOCK_COMPANIES: Company[] = [
  { id: '1', name: 'TechFlow Inc.', industry: 'Software', size: '50-200', domain: 'techflow.com', contactsCount: 12, deals: 3, location: 'São Paulo, SP', description: 'Desenvolvimento de soluções SaaS para automação industrial.' },
];

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState<Page>('dashboard'); // Start at dashboard
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [previousPage, setPreviousPage] = useState<Page>('contacts');
  
  // Notification State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  // Toasts are transient UI representations of notifications
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  
  // Control flag to ensure task notification only shows once per session
  const [hasShownTaskNotification, setHasShownTaskNotification] = useState(false);
  
  // Highlighting State for Tasks
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);

  // Data State
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [editingCampaign, setEditingCampaign] = useState<CampaignData | undefined>(undefined);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
      hasCompany: false,
      hasContact: false,
      hasCampaign: false,
      hasProposalValue: false,
      pipelineValue: 0,
      activeCampaignsCount: 0,
      completedCampaignsCount: 0,
      totalActions: 0
  });

  // New Campaign Modal State
  const [isNewCampaignModalOpen, setIsNewCampaignModalOpen] = useState(false);
  const [companiesForModal, setCompaniesForModal] = useState<Company[]>([]);
  const [selectedCompanyForCampaign, setSelectedCompanyForCampaign] = useState('');

  // Notification Helpers - Wrapped in useCallback to be stable for useEffect dependencies
  const addNotification = useCallback((title: string, message: string, type: 'success' | 'info' | 'warning' | 'error', link?: Page, linkData?: any) => {
    const newNotif: AppNotification = {
        id: Date.now().toString(),
        title,
        message,
        type,
        timestamp: new Date(),
        read: false,
        link,
        linkData
    };
    
    // Add to persistent list
    setNotifications(prev => [newNotif, ...prev]);
    
    // Add to toasts (transient)
    setToasts(prev => [...prev, newNotif]);
    
    // Auto remove toast after 25s (Requested by user)
    setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newNotif.id));
    }, 25000);
  }, []);

  const markAsRead = (id: string) => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearNotifications = () => {
      setNotifications([]);
  };

  // Robust Profile Fetching with Auto-Creation fallback
  const fetchProfile = async (sessionData: Session) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionData.user.id)
        .single();
      
      const meta = sessionData.user.user_metadata || {};

      if (data) {
        // Merge DB profile with Metadata for extended fields
        setUserProfile({
           ...data,
           full_name: data.full_name || meta.full_name,
           // Extended fields from metadata if not in DB
           role: data.role || meta.role,
           company: data.company || meta.company,
           language: data.language || meta.language
        });
      } else {
         // Profile missing in DB, construct from session
         console.warn(`Profile not found in DB: ${error?.message}`);
         setUserProfile({
            id: sessionData.user.id,
            email: sessionData.user.email || '',
            full_name: meta.full_name || '',
            avatar_url: meta.avatar_url || '',
            role: meta.role,
            company: meta.company,
            language: meta.language
         });
      }
    } catch (error: any) {
      // Handle unexpected JS errors
      const errorMsg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      console.warn(`Profile fetch error: ${errorMsg}`);
    }
  };

  const fetchCampaigns = useCallback(async (uid?: string) => {
      if (!uid) return;
      try {
          const { data, error } = await supabase
            .from('campaigns')
            .select('*')
            .eq('user_id', uid) // Filter by user
            .order('created_at', { ascending: false });
          
          if (error) {
             // If table doesn't exist (42P01) or other error, throw to catch block
             throw error;
          }

          if (data) {
              const mappedCampaigns = data.map(c => {
                  // Calculate points directly from steps to ensure accuracy
                  const steps = c.steps || [];
                  const calculatedPoints = steps.reduce((acc: number, step: any) => {
                      return step.completed ? acc + (step.points || 0) : acc;
                  }, 0);

                  return {
                    id: c.id,
                    name: c.name,
                    targetCompany: c.target_company,
                    objective: c.objective,
                    status: c.status,
                    progress: c.progress || 0,
                    sent: c.sent || 0,
                    open_rate: c.open_rate || '0%',
                    totalPoints: calculatedPoints, // Use calculated points
                    steps: steps,
                    created_at: c.created_at // Important for calculating due dates
                  };
              });
              setCampaigns(mappedCampaigns);
          } else {
              setCampaigns([]);
          }
      } catch (err: any) {
          const errorMsg = err?.message || JSON.stringify(err);
          console.warn(`Error fetching campaigns (using empty list): ${errorMsg}`);
          // Set empty array on error to prevent map crashes
          setCampaigns([]); 
          
          // User Feedback for Network Errors
          if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
              addNotification(
                  'Erro de Conexão', 
                  'Não foi possível conectar ao banco de dados. Verifique sua conexão com a internet.', 
                  'error'
              );
          }
      }
  }, [addNotification]);

  const fetchStats = useCallback(async (uid?: string) => {
      if (!uid) return;
      // Use Promise.allSettled to ensure one failure doesn't break the whole dashboard
      try {
          const [companyRes, contactRes, campaignRes, dealsRes] = await Promise.allSettled([
              supabase.from('companies').select('*', { count: 'exact', head: true }).eq('user_id', uid),
              supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', uid),
              supabase.from('campaigns').select('*').eq('user_id', uid), // Need full data for sum
              supabase.from('deals').select('value').eq('user_id', uid) // Fetch deals for pipeline calculation
          ]);

          // Safely extract values, handling potential DB errors in the 'value' prop if fulfilled
          const getCount = (res: PromiseSettledResult<any>) => {
              if (res.status === 'fulfilled' && !res.value.error) {
                  return res.value.count || 0;
              }
              return 0;
          };

          const getData = (res: PromiseSettledResult<any>) => {
              if (res.status === 'fulfilled' && !res.value.error) {
                  return res.value.data || [];
              }
              return [];
          };

          const companyCount = getCount(companyRes);
          const contactCount = getCount(contactRes);
          const campaignData = getData(campaignRes);
          const dealsData = getData(dealsRes);
          
          const hasCampaign = campaignData.length > 0;
          
          // Calculate pipeline from Deals first
          const dealsValue = dealsData.reduce((acc: number, curr: any) => acc + (curr.value || 0), 0);
          
          // Calculations based on REAL data (legacy points system fallback)
          // Calculate total points dynamically from steps
          const pointsValue = campaignData.reduce((acc: number, curr: any) => {
              const steps = curr.steps || [];
              const campaignPoints = steps.reduce((sAcc: number, s: any) => s.completed ? sAcc + (s.points || 0) : sAcc, 0);
              return acc + campaignPoints;
          }, 0) * 100; // Assuming 1 point = R$ 100 for visualization
          
          // Prioritize deals value if available, otherwise use points
          const pipelineValue = dealsValue > 0 ? dealsValue : pointsValue;
          const hasProposalValue = pipelineValue > 0;
          
          const activeCampaignsCount = campaignData.filter((c: any) => c.status === 'Active' || c.status === 'Ativa').length;
          const completedCampaignsCount = campaignData.filter((c: any) => c.status === 'Completed' || c.status === 'Finalizada').length;
          
          // Total Actions = Sum of completed steps in all campaigns (more accurate than 'sent' column which might lag)
          const totalActions = campaignData.reduce((acc: number, curr: any) => {
              if (curr.steps && Array.isArray(curr.steps)) {
                  // Count completed steps directly
                  const completedSteps = curr.steps.filter((s: any) => s.completed).length;
                  return acc + completedSteps;
              }
              // Fallback to sent property if steps are not available
              return acc + (curr.sent || 0);
          }, 0);

          setDashboardStats({
              hasCompany: companyCount > 0,
              hasContact: contactCount > 0,
              hasCampaign,
              hasProposalValue,
              pipelineValue,
              activeCampaignsCount,
              completedCampaignsCount,
              totalActions
          });

      } catch (e: any) {
          const errorMsg = e?.message || String(e);
          console.error(`Critical error fetching stats: ${errorMsg}`);
      }

  }, []);

  const refreshAllData = useCallback(async () => {
      // Wrapper to refresh both campaigns (for task list) and stats (for dashboard counters)
      if (session?.user.id) {
          await Promise.all([fetchCampaigns(session.user.id), fetchStats(session.user.id)]);
      }
  }, [fetchCampaigns, fetchStats, session]);

  // Main Data Loading Logic
  useEffect(() => {
    let mounted = true;

    const loadData = async (currentSession: Session) => {
        if (!mounted) return;
        await Promise.all([
            fetchProfile(currentSession),
            fetchCampaigns(currentSession.user.id),
            fetchStats(currentSession.user.id)
        ]);
        if (mounted) setLoading(false);
    };

    // Initialize Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
          setSession(session);
          if (session) {
            loadData(session);
          } else {
            setLoading(false);
          }
      }
    });

    // Listen for Auth Changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
          setSession(session);
          if (session) {
            // Re-fetch data on login
            setLoading(true); 
            loadData(session);
          } else {
            setUserProfile(null);
            setCampaigns([]);
            setLoading(false);
            // Reset notification flag on logout so they get it again on next login
            setHasShownTaskNotification(false);
          }
      }
    });

    return () => {
        mounted = false;
        subscription.unsubscribe();
    };
  }, [fetchCampaigns, fetchStats]);

  // Specific refresher for stats when navigating to dashboard and "Task Notification" logic
  useEffect(() => {
      if (currentPage === 'dashboard' && session) {
          fetchStats(session.user.id);
          fetchCampaigns(session.user.id); // Ensure campaigns are fresh for the agenda
          
          // Only show if we have active campaigns AND we haven't shown it this session
          const activeCamps = campaigns.filter(c => c.status === 'Active' || c.status === 'Ativa');
          
          if (activeCamps.length > 0 && !hasShownTaskNotification) {
              
              // Find the first due task to link to and its campaign
              let firstDueTask: any = null;
              let targetCampaign: any = null;
              
              // Use a small timeout so it feels like a check happened
              setTimeout(() => {
                  for (const c of activeCamps) {
                      if (c.steps) {
                         const found = c.steps.find((s: any) => !s.completed && s.type !== 'Wait');
                         if(found) {
                             firstDueTask = found;
                             targetCampaign = c;
                             break;
                         }
                      }
                  }

                  if (targetCampaign) {
                      addNotification(
                          'Você tem tarefas hoje!', 
                          `Existem ${activeCamps.length} campanhas ativas com atividades na agenda. Clique para ver.`, 
                          'warning', 
                          'campaign-editor', // Redirect to Campaign Flow/Editor
                          { campaign: targetCampaign, taskId: firstDueTask?.id } 
                      );
                      // Mark as shown for this session
                      setHasShownTaskNotification(true);
                  }
              }, 1500);
          }
      }
  }, [currentPage, fetchStats, fetchCampaigns, session, campaigns.length, hasShownTaskNotification, addNotification]);

  const handleNotificationNavigation = (page: Page, data?: any) => {
      if (page === 'campaign-editor' && data?.campaign) {
          // Set the campaign to be edited before navigating
          setEditingCampaign(data.campaign);
      }
      
      setCurrentPage(page);
      
      if (page === 'tasks' && data?.taskId) {
          setHighlightedTaskId(data.taskId);
          // Clear highlight after 3 seconds
          setTimeout(() => setHighlightedTaskId(null), 3000);
      }
  };

  const handleCompanyClick = (company: Company) => {
    setSelectedCompany(company);
    setCurrentPage('company-details');
  };

  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact);
    setPreviousPage(currentPage);
    setCurrentPage('contact-details');
  };

  const handleBackFromContact = () => {
    setCurrentPage(previousPage);
  };

  const handleContactCompanyClick = (companyName: string) => {
    const foundCompany = MOCK_COMPANIES.find(c => c.name === companyName);
    if (foundCompany) {
        setSelectedCompany(foundCompany);
        setCurrentPage('company-details');
    } else {
        alert("Página da empresa não encontrada neste protótipo.");
    }
  };

  const handleEditCampaign = (campaign: CampaignData) => {
    setEditingCampaign(campaign);
    setCurrentPage('campaign-editor');
  };

  // Altered to open Modal instead of going directly to editor
  const handleCreateCampaignClick = async () => {
    setLoading(true);
    // Fetch available companies first
    try {
        if (session?.user.id) {
            const { data } = await supabase.from('companies').select('*').eq('user_id', session.user.id);
            if (data) {
                 const mapped: Company[] = data.map(c => ({
                    id: c.id,
                    name: c.name,
                    industry: c.industry || '',
                    size: c.size || '',
                    domain: c.domain || '',
                    contactsCount: 0,
                    deals: 0
                }));
                setCompaniesForModal(mapped);
            }
        }
    } catch (e) {
        console.error("Error loading companies for modal", e);
    } finally {
        setLoading(false);
        setSelectedCompanyForCampaign('');
        setIsNewCampaignModalOpen(true);
    }
  };

  const handleConfirmNewCampaign = () => {
      if (!selectedCompanyForCampaign) {
          alert("Por favor, selecione uma empresa para iniciar.");
          return;
      }
      
      // Setup initial data with selected company
      const initialData: CampaignData = {
          name: `Nova Campanha - ${selectedCompanyForCampaign}`,
          targetCompany: selectedCompanyForCampaign,
          objective: 'Agendar Reunião',
          totalPoints: 0,
          steps: [],
          created_at: new Date().toISOString() // Set created_at for drafts too
      };

      setEditingCampaign(initialData);
      setIsNewCampaignModalOpen(false);
      setCurrentPage('campaign-editor');
  };

  const handleSaveCampaign = async (campaign: CampaignData) => {
    if (!session?.user?.id) return;

    // NOTE: Removed setLoading(true) here to prevent full-screen loading spinner
    // from unmounting the JourneyBuilder/Modal components during auto-saves.
    
    try {
        // Ensure we calculate 'sent' correctly based on steps, so we don't rely on stale state
        let sentCount = campaign.sent || 0;
        let calculatedPoints = campaign.totalPoints || 0;

        if (campaign.steps) {
            sentCount = campaign.steps.filter(s => s.completed).length;
            // Recalculate points to be sure
            calculatedPoints = campaign.steps.reduce((acc, s) => s.completed ? acc + (s.points || 0) : acc, 0);
        }

        const campaignPayload: any = {
            name: campaign.name,
            target_company: campaign.targetCompany,
            objective: campaign.objective,
            status: campaign.status || 'Active',
            progress: campaign.progress || 0,
            sent: sentCount, // Use calculated count
            open_rate: campaign.open || '0%',
            total_points: calculatedPoints, // Use calculated points
            user_id: session.user.id,
            steps: campaign.steps || [],
            updated_at: new Date().toISOString()
        };
        
        // Preserve created_at if updating, set if new
        if (campaign.created_at) {
             campaignPayload.created_at = campaign.created_at;
        } else {
             campaignPayload.created_at = new Date().toISOString();
        }

        const isUpdate = campaign.id && !campaign.id.toString().startsWith('camp-');

        if (isUpdate) {
            campaignPayload.id = campaign.id;
        }

        const { data, error } = await supabase
            .from('campaigns')
            .upsert(campaignPayload)
            .select()
            .single();

        if (error) throw error;

        await fetchCampaigns(session.user.id);
        await fetchStats(session.user.id); 
        
        // Notify Success
        addNotification(
            'Campanha Salva!', 
            `A campanha "${campaign.name}" foi atualizada com sucesso.`, 
            'success',
            'campaign-editor',
            { campaign: data ? { ...campaign, id: data.id, totalPoints: calculatedPoints } : campaign } // Link back to editor with data
        );

        if (isUpdate && data) {
            // If updating, update the local editing state so user sees changes immediately but stays on page
            const updatedCampaignData: CampaignData = {
                ...campaign,
                id: data.id,
                totalPoints: calculatedPoints,
                steps: data.steps || campaign.steps
            };
            setEditingCampaign(updatedCampaignData);
            // DO NOT change currentPage here, stay on 'campaign-editor'
        } else {
            // New campaign created, go back to list
            setEditingCampaign(undefined);
            setCurrentPage('campaigns');
        }

    } catch (err: any) {
        console.error("Error saving campaign:", err);
        addNotification('Erro', "Falha ao salvar campanha. Verifique se o banco de dados possui todas as colunas necessárias.", 'error');
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!id || id.startsWith('camp-')) {
        setCampaigns(prev => prev.filter(c => c.id !== id));
        setCurrentPage('campaigns');
        return;
    }

    try {
        const { error } = await supabase
            .from('campaigns')
            .delete()
            .eq('id', id);

        if (error) throw error;

        setCampaigns(prev => prev.filter(c => c.id !== id));
        if (session) fetchStats(session.user.id); 
        addNotification('Campanha Removida', 'A campanha foi excluída com sucesso.', 'info');
        setCurrentPage('campaigns');
    } catch (err: any) {
        console.error("Error deleting campaign:", err);
        addNotification('Erro', "Falha ao excluir campanha.", 'error');
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  };

  const refreshProfile = async () => {
      if (session) {
          await fetchProfile(session);
      }
  };

  const renderPage = () => {
    switch(currentPage) {
      case 'dashboard': return <Dashboard userProfile={userProfile} stats={dashboardStats} campaigns={campaigns} onNavigate={setCurrentPage} />;
      case 'campaigns': 
        return <CampaignList campaigns={campaigns} onNavigate={setCurrentPage} onEdit={handleEditCampaign} onCreate={handleCreateCampaignClick} />;
      case 'campaign-editor': 
        return <CampaignEditor onNavigate={setCurrentPage} onSave={handleSaveCampaign} onDelete={handleDeleteCampaign} initialCampaign={editingCampaign} onContactClick={handleContactClick} />;
      case 'contacts': return <ContactsList onContactClick={handleContactClick} userId={session?.user.id} onNotify={addNotification} />;
      case 'contact-details':
        return selectedContact ? (
            <ContactDetailsPage 
                contact={selectedContact}
                onBack={handleBackFromContact}
                onCompanyClick={handleContactCompanyClick}
            />
        ) : <ContactsList onContactClick={handleContactClick} userId={session?.user.id} onNotify={addNotification} />;
      case 'companies': return <CompaniesList onCompanyClick={handleCompanyClick} userId={session?.user.id} onNotify={addNotification} />;
      case 'company-details': 
        return selectedCompany ? (
          <CompanyDetailsPage 
            company={selectedCompany} 
            onBack={() => setCurrentPage('companies')}
            onContactClick={handleContactClick}
            userId={session?.user.id} // Passing User ID here
            onNotify={addNotification}
          />
        ) : <CompaniesList onCompanyClick={handleCompanyClick} userId={session?.user.id} onNotify={addNotification} />;
      case 'reports': return <Reports />;
      case 'settings': return <Settings userProfile={userProfile} onProfileUpdate={refreshProfile} />;
      // New Page: Pass refreshAllData here
      case 'tasks': return <Tasks campaigns={campaigns} userProfile={userProfile} onRefresh={refreshAllData} highlightedTaskId={highlightedTaskId} />;
      default: return <Dashboard userProfile={userProfile} stats={dashboardStats} campaigns={campaigns} onNavigate={setCurrentPage} />;
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background-light dark:bg-background-dark text-primary flex-col gap-4">
         <span className="material-symbols-outlined text-4xl animate-spin">sync</span>
         <span className="text-sm font-semibold animate-pulse">Carregando seus dados...</span>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <div className="flex h-screen w-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-white">
      <Sidebar 
        activePage={currentPage} 
        onNavigate={setCurrentPage} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative transition-all duration-300">
        <Header 
          activePage={currentPage} 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          userProfile={userProfile}
          onSignOut={handleSignOut}
          onNavigate={(page) => handleNotificationNavigation(page)} // Use wrapper for special nav logic
          notifications={notifications}
          onMarkAsRead={markAsRead}
          onClearAll={clearNotifications}
          stats={dashboardStats} // Pass stats to Header for tutorial logic
        />
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          {renderPage()}
        </div>

        {/* Toasts Container (Bottom Left) */}
        <div className="fixed bottom-4 left-4 z-50 flex flex-col-reverse gap-2 max-w-sm w-full pointer-events-none">
            {toasts.map((toast) => (
                <div 
                    key={toast.id} 
                    onClick={() => {
                        if (toast.link) {
                            handleNotificationNavigation(toast.link, toast.linkData);
                            // Optionally remove toast immediately on click
                            setToasts(prev => prev.filter(t => t.id !== toast.id));
                        }
                    }}
                    className={`bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-slate-800 p-4 rounded-lg shadow-xl shadow-slate-200/50 dark:shadow-black/50 pointer-events-auto flex items-start gap-3 animate-in slide-in-from-left duration-300 ${toast.link ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors' : ''}`}
                >
                    <div className={`mt-0.5 ${
                        toast.type === 'success' ? 'text-green-500' : 
                        toast.type === 'error' ? 'text-red-500' : 
                        toast.type === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                    }`}>
                        <span className="material-symbols-outlined text-[20px]">
                            {toast.type === 'success' ? 'check_circle' : 
                             toast.type === 'error' ? 'error' : 
                             toast.type === 'warning' ? 'warning' : 'info'}
                        </span>
                    </div>
                    <div className="flex-1">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{toast.title}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{toast.message}</p>
                    </div>
                    <button 
                        onClick={(e) => {
                             e.stopPropagation();
                             setToasts(prev => prev.filter(t => t.id !== toast.id));
                        }}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
                    >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                </div>
            ))}
        </div>

        {/* Select Company Modal (New Campaign Flow) */}
        {isNewCampaignModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-[#151b2b] w-full max-w-md rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-6">
                    <div className="text-center">
                        <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-[28px]">domain_add</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Iniciar Nova Campanha</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                            Selecione a empresa alvo para carregar automaticamente os contatos e dados relevantes.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Empresa Alvo</label>
                        <select
                            className="w-full h-11 px-3 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                            value={selectedCompanyForCampaign}
                            onChange={(e) => setSelectedCompanyForCampaign(e.target.value)}
                        >
                            <option value="">Selecione uma empresa...</option>
                            {companiesForModal.map(company => (
                                <option key={company.id} value={company.name}>{company.name}</option>
                            ))}
                        </select>
                         {companiesForModal.length === 0 && (
                            <p className="text-xs text-red-500 mt-1">Nenhuma empresa cadastrada. Vá em Empresas para criar uma.</p>
                        )}
                    </div>

                    <div className="flex gap-3 mt-2">
                        <button 
                            onClick={() => setIsNewCampaignModalOpen(false)}
                            className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleConfirmNewCampaign}
                            disabled={!selectedCompanyForCampaign}
                            className="flex-1 px-4 py-2.5 bg-primary text-white text-sm font-bold rounded shadow-lg shadow-primary/20 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Continuar
                        </button>
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
};

export default App;