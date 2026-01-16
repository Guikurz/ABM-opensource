import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CampaignData, JourneyStep, UserProfile, StepType } from '../types';
import { supabase } from '../services/supabaseClient';

interface TasksProps {
  campaigns: CampaignData[];
  userProfile: UserProfile | null;
  onRefresh: () => void;
  highlightedTaskId?: string | null;
}

// Helper to flatten steps into tasks
interface FlatTask extends JourneyStep {
  campaignName: string;
  campaignId: string;
  targetCompany?: string;
  created_at?: string;
  dueDateObj: Date;
}

const Tasks: React.FC<TasksProps> = ({ campaigns, userProfile, onRefresh, highlightedTaskId }) => {
  // Filter States
  const [filterType, setFilterType] = useState<string>('All');
  const [filterOwner, setFilterOwner] = useState<string>('All');
  const [filterCampaign, setFilterCampaign] = useState<string>('All');
  const [filterCompany, setFilterCompany] = useState<string>('All');
  const [filterDate, setFilterDate] = useState<string>(''); // YYYY-MM-DD string

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  const taskRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  useEffect(() => {
    if (highlightedTaskId && taskRefs.current[highlightedTaskId]) {
      taskRefs.current[highlightedTaskId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedTaskId]);

  // Derive all pending tasks from active campaigns
  const allTasks: FlatTask[] = useMemo(() => {
    const tasks: FlatTask[] = [];
    campaigns.forEach(camp => {
      if (camp.status === 'Active' || camp.status === 'Ativa') {
        if (camp.steps && Array.isArray(camp.steps)) {
          camp.steps.forEach(step => {
            if (!step.completed && step.type !== 'Wait') {
              const start = camp.created_at ? new Date(camp.created_at) : new Date();
              const dueDate = new Date(start);
              dueDate.setDate(start.getDate() + Number(step.day));

              tasks.push({
                ...step,
                campaignName: camp.name,
                campaignId: camp.id || '',
                targetCompany: camp.targetCompany,
                created_at: (camp as any).created_at,
                dueDateObj: dueDate
              });
            }
          });
        }
      }
    });
    return tasks.sort((a, b) => a.dueDateObj.getTime() - b.dueDateObj.getTime());
  }, [campaigns]);

  // Unique Filter Options
  const uniqueOwners = useMemo(() => Array.from(new Set(allTasks.map(t => t.owner || 'Não atribuído'))).sort(), [allTasks]);
  const uniqueCampaigns = useMemo(() => Array.from(new Set(allTasks.map(t => t.campaignName))).sort(), [allTasks]);
  const uniqueCompanies = useMemo(() => Array.from(new Set(allTasks.map(t => t.targetCompany || ''))).filter(Boolean).sort(), [allTasks]);
  
  const allTaskTypes: StepType[] = [
      'Email', 'LinkedIn', 'Mensagem LinkedIn', 'Ligação', 'WhatsApp', 
      'Brinde', 'Visita Presencial', 'Convite Evento', 'Encontro Evento', 
      'Almoço/Jantar', 'Reunião Virtual', 'Orçamento', 'Proposta', 'Contrato'
  ];

  // Filtering Logic
  const filteredTasks = allTasks.filter(task => {
    const typeMatch = filterType === 'All' || task.type === filterType;
    const ownerMatch = filterOwner === 'All' || task.owner === filterOwner;
    const campaignMatch = filterCampaign === 'All' || task.campaignName === filterCampaign;
    const companyMatch = filterCompany === 'All' || task.targetCompany === filterCompany;
    
    let dateMatch = true;
    if (filterDate) {
        // Compare dates ignoring time
        const filterD = new Date(filterDate);
        filterD.setHours(0,0,0,0);
        const taskD = new Date(task.dueDateObj);
        taskD.setHours(0,0,0,0);
        dateMatch = filterD.getTime() === taskD.getTime();
    }

    return typeMatch && ownerMatch && campaignMatch && companyMatch && dateMatch;
  });

  const groupedTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    return {
        overdue: filteredTasks.filter(t => {
            const d = new Date(t.dueDateObj);
            d.setHours(0,0,0,0);
            return d < today;
        }),
        today: filteredTasks.filter(t => {
            const d = new Date(t.dueDateObj);
            d.setHours(0,0,0,0);
            return d.getTime() === today.getTime();
        }),
        upcoming: filteredTasks.filter(t => {
            const d = new Date(t.dueDateObj);
            d.setHours(0,0,0,0);
            return d > today;
        })
    };
  }, [filteredTasks]);

  const handleCompleteTask = async (task: FlatTask) => {
    setUpdatingId(task.id);
    try {
      const campaign = campaigns.find(c => c.id === task.campaignId);
      if (!campaign || !campaign.steps) return;

      const updatedSteps = campaign.steps.map(s => 
        s.id === task.id ? { ...s, completed: true } : s
      );

      const totalSteps = updatedSteps.length;
      const completedSteps = updatedSteps.filter(s => s.completed).length;
      const progress = Math.round((completedSteps / totalSteps) * 100);
      
      // Calculate Total Points based on updated steps
      const totalPoints = updatedSteps.reduce((acc, s) => s.completed ? acc + (s.points || 0) : acc, 0);

      const { error } = await supabase
        .from('campaigns')
        .update({ 
          steps: updatedSteps,
          progress: progress,
          sent: completedSteps, 
          total_points: totalPoints, // Update points in DB
          updated_at: new Date().toISOString()
        })
        .eq('id', task.campaignId);

      if (error) throw error;
      onRefresh();

    } catch (e) {
      console.error("Error completing task:", e);
      alert("Erro ao concluir tarefa. Tente novamente.");
    } finally {
      setUpdatingId(null);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
        case 'Email': return 'mail';
        case 'LinkedIn': return 'person_add';
        case 'Mensagem LinkedIn': return 'chat_bubble';
        case 'Ligação': return 'call';
        case 'WhatsApp': return 'chat';
        case 'Brinde': return 'redeem';
        case 'Visita Presencial': return 'storefront';
        case 'Convite Evento': return 'event';
        case 'Encontro Evento': return 'handshake';
        case 'Almoço/Jantar': return 'restaurant';
        case 'Reunião Virtual': return 'video_camera_front';
        case 'Orçamento': return 'attach_money';
        case 'Proposta': return 'description';
        case 'Contrato': return 'verified';
        default: return 'task_alt';
    }
  };

  const getColor = (type: string) => {
    switch (type) {
        case 'Email': return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
        case 'LinkedIn': 
        case 'Mensagem LinkedIn': return 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20';
        case 'Ligação': return 'text-orange-500 bg-orange-50 dark:bg-orange-900/20';
        case 'WhatsApp': return 'text-green-500 bg-green-50 dark:bg-green-900/20';
        case 'Brinde': return 'text-pink-500 bg-pink-50 dark:bg-pink-900/20';
        case 'Visita Presencial':
        case 'Almoço/Jantar': return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20';
        case 'Reunião Virtual': return 'text-violet-500 bg-violet-50 dark:bg-violet-900/20';
        case 'Convite Evento':
        case 'Encontro Evento': return 'text-purple-500 bg-purple-50 dark:bg-purple-900/20';
        case 'Orçamento':
        case 'Proposta': return 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20';
        case 'Contrato': return 'text-teal-600 bg-teal-50 dark:bg-teal-900/20';
        default: return 'text-slate-500 bg-slate-50 dark:bg-slate-800';
    }
  };

  const renderTaskRow = (task: FlatTask) => {
      const isHighlighted = highlightedTaskId === task.id;
      return (
        <tr 
            key={task.id} 
            ref={el => { taskRefs.current[task.id] = el; }}
            className={`group transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 ${
                isHighlighted 
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-l-yellow-400' 
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
        >
            <td className="px-6 py-4">
                <button 
                    onClick={() => handleCompleteTask(task)}
                    disabled={updatingId === task.id}
                    className={`size-5 rounded border flex items-center justify-center transition-all ${
                        updatingId === task.id 
                        ? 'bg-slate-100 border-slate-300 cursor-wait' 
                        : 'border-slate-300 dark:border-slate-600 hover:border-primary hover:bg-primary/5 text-transparent hover:text-primary'
                    }`}
                >
                    {updatingId === task.id ? (
                        <span className="material-symbols-outlined text-[14px] animate-spin text-slate-500">sync</span>
                    ) : (
                        <span className="material-symbols-outlined text-[16px]">check</span>
                    )}
                </button>
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className={`size-8 rounded flex items-center justify-center shrink-0 ${getColor(task.type)}`}>
                        <span className="material-symbols-outlined text-[18px]">{getIcon(task.type)}</span>
                    </div>
                    <div>
                        <p className="font-bold text-slate-900 dark:text-white">{task.title}</p>
                        <p className="text-xs text-slate-500 max-w-xs truncate" title={task.description}>
                            {task.description}
                        </p>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4">
                <p className="font-medium text-slate-900 dark:text-white">{task.campaignName}</p>
                {task.targetCompany && (
                    <p className="text-xs text-primary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">domain</span>
                        {task.targetCompany}
                    </p>
                )}
            </td>
            <td className="px-6 py-4">
                {task.owner ? (
                    <div className="flex items-center gap-2">
                        <div className="size-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                            {task.owner.charAt(0)}
                        </div>
                        <span className="text-sm">{task.owner}</span>
                    </div>
                ) : (
                    <span className="text-slate-400 italic text-xs">Não atribuído</span>
                )}
            </td>
            <td className="px-6 py-4 text-right">
                <span className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase ${
                    task.dueDateObj < new Date() && new Date().toDateString() !== task.dueDateObj.toDateString()
                    ? 'bg-red-50 text-red-600 dark:bg-red-900/20' 
                    : new Date().toDateString() === task.dueDateObj.toDateString()
                    ? 'bg-green-50 text-green-600 dark:bg-green-900/20'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                    {task.dueDateObj.toLocaleDateString('pt-BR')}
                </span>
            </td>
        </tr>
      );
  };

  return (
    <div className="p-4 lg:p-6 w-full flex flex-col gap-6 h-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tarefas</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Gerencie as atividades pendentes organizadas por data de execução.
        </p>
      </div>

      {/* Improved Filters */}
      <div className="bg-white dark:bg-[#151b2b] p-4 rounded border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Type Filter */}
        <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Tipo</span>
            <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="h-9 px-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:ring-primary focus:border-primary w-full"
            >
                <option value="All">Todas</option>
                {allTaskTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                ))}
            </select>
        </div>

        {/* Date Filter */}
        <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Data</span>
            <input 
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="h-9 px-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:ring-primary focus:border-primary w-full"
            />
        </div>

        {/* Owner Filter */}
        <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Responsável</span>
            <select 
                value={filterOwner}
                onChange={(e) => setFilterOwner(e.target.value)}
                className="h-9 px-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:ring-primary focus:border-primary w-full"
            >
                <option value="All">Todos</option>
                {uniqueOwners.map(owner => (
                    <option key={owner} value={owner}>{owner}</option>
                ))}
            </select>
        </div>

        {/* Campaign Filter */}
        <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Campanha</span>
            <select 
                value={filterCampaign}
                onChange={(e) => setFilterCampaign(e.target.value)}
                className="h-9 px-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:ring-primary focus:border-primary w-full"
            >
                <option value="All">Todas</option>
                {uniqueCampaigns.map(camp => (
                    <option key={camp} value={camp}>{camp}</option>
                ))}
            </select>
        </div>

        {/* Company Filter */}
        <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Empresa</span>
            <select 
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="h-9 px-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:ring-primary focus:border-primary w-full"
            >
                <option value="All">Todas</option>
                {uniqueCompanies.map(comp => (
                    <option key={comp} value={comp}>{comp}</option>
                ))}
            </select>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white dark:bg-[#151b2b] rounded border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col flex-1 overflow-hidden">
        <div className="overflow-auto flex-1">
            {filteredTasks.length > 0 ? (
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="px-6 py-3 font-bold text-slate-900 dark:text-white w-12"></th>
                        <th className="px-6 py-3 font-bold text-slate-900 dark:text-white">Tarefa</th>
                        <th className="px-6 py-3 font-bold text-slate-900 dark:text-white">Campanha / Empresa</th>
                        <th className="px-6 py-3 font-bold text-slate-900 dark:text-white">Responsável</th>
                        <th className="px-6 py-3 font-bold text-slate-900 dark:text-white text-right">Data de Execução</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {groupedTasks.overdue.length > 0 && (
                        <>
                            <tr className="bg-red-50/50 dark:bg-red-900/10">
                                <td colSpan={5} className="px-6 py-2 text-xs font-bold text-red-600 uppercase tracking-wide">
                                    Atrasadas ({groupedTasks.overdue.length})
                                </td>
                            </tr>
                            {groupedTasks.overdue.map(renderTaskRow)}
                        </>
                    )}

                    {groupedTasks.today.length > 0 && (
                        <>
                            <tr className="bg-green-50/50 dark:bg-green-900/10">
                                <td colSpan={5} className="px-6 py-2 text-xs font-bold text-green-600 uppercase tracking-wide">
                                    Para Hoje ({groupedTasks.today.length})
                                </td>
                            </tr>
                            {groupedTasks.today.map(renderTaskRow)}
                        </>
                    )}

                    {groupedTasks.upcoming.length > 0 && (
                        <>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                                <td colSpan={5} className="px-6 py-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
                                    Próximas ({groupedTasks.upcoming.length})
                                </td>
                            </tr>
                            {groupedTasks.upcoming.map(renderTaskRow)}
                        </>
                    )}
                </tbody>
            </table>
            ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-8">
                    <div className="size-16 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-green-500 text-3xl">task_alt</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tudo limpo!</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-xs">
                        Você não tem tarefas pendentes com os filtros atuais.
                    </p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Tasks;