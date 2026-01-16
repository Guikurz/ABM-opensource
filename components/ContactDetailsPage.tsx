import React, { useState, useEffect } from 'react';
import { Contact, UserProfile } from '../types';
import { supabase } from '../services/supabaseClient';

interface ContactDetailsPageProps {
  contact: Contact;
  onBack: () => void;
  onCompanyClick: (companyName: string) => void;
}

const ContactDetailsPage: React.FC<ContactDetailsPageProps> = ({ contact, onBack, onCompanyClick }) => {
  // Initialize state with props + empty defaults for "not defined" appearance
  const initialData = {
    ...contact,
    phone: contact.phone || '',
    linkedin: contact.linkedin || '',
    instagram: contact.instagram || '',
    children: contact.children || '',
    sportsTeam: contact.sportsTeam || '',
    activeCampaign: contact.activeCampaign || '',
    address: contact.address || '',
    personalEmail: contact.personalEmail || '',
    hobbies: contact.hobbies || '',
    pets: contact.pets || '',
    maritalStatus: contact.maritalStatus || '',
    age: contact.age || '',
    notes: contact.notes || "",
    owners: contact.owners || []
  };

  const [isEditing, setIsEditing] = useState(false);
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  const [data, setData] = useState(initialData); 
  const [formData, setFormData] = useState(initialData); 
  
  // Real users state
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
        const { data } = await supabase.from('profiles').select('*');
        if (data) {
            setAvailableUsers(data);
        }
    };
    fetchUsers();
  }, []);

  const handleEditClick = () => {
    setFormData(data); 
    setIsEditing(true);
  };

  const handleSave = () => {
    setData(formData); 
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleOwner = (userName: string) => {
    const currentOwners = data.owners || [];
    let newOwners;
    if (currentOwners.includes(userName)) {
      newOwners = currentOwners.filter(o => o !== userName);
    } else {
      newOwners = [...currentOwners, userName];
    }
    // Update both data and form data immediately for this specific interaction
    const newData = { ...data, owners: newOwners };
    setData(newData);
    setFormData(newData);
  };

  // Helper for rendering inputs vs text
  const renderField = (field: keyof typeof initialData, label: string, type: string = 'text', fullWidth: boolean = false) => {
    if (isEditing) {
      return (
        <input
          type={type}
          value={formData[field] as string | number}
          onChange={(e) => handleChange(field as string, e.target.value)}
          className={`px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-1 focus:ring-primary focus:border-primary ${fullWidth ? 'w-full' : 'w-full'}`}
          placeholder={`Adicionar ${label}`}
        />
      );
    }
    const val = data[field];
    if (!val) {
        return <p className="text-sm text-slate-400 italic">Não informado</p>;
    }
    return <p className="text-base font-semibold text-slate-900 dark:text-white truncate" title={String(val)}>{val}</p>;
  };

  const PersonalItem = ({ icon, label, field, colorClass = "text-slate-400" }: { icon: string, label: string, field: keyof typeof initialData, colorClass?: string }) => (
    <div className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        <div className={`size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 ${colorClass}`}>
            <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-0.5">{label}</p>
            {isEditing ? (
                <input 
                    type="text" 
                    value={formData[field] as string} 
                    onChange={(e) => handleChange(field as string, e.target.value)} 
                    className="w-full px-2 py-1 h-7 text-xs rounded border border-slate-300 dark:border-slate-700"
                    placeholder="—"
                />
            ) : (
                <p className={`text-sm font-bold truncate ${!data[field] ? 'text-slate-300 dark:text-slate-600 font-normal' : 'text-slate-800 dark:text-slate-200'}`} title={String(data[field])}>
                    {data[field] || '—'}
                </p>
            )}
        </div>
    </div>
  );

  return (
    <div className="p-4 lg:p-6 w-full flex flex-col gap-6 h-full pb-10 relative">
      {/* Navigation */}
      <div>
          <button onClick={onBack} className="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors text-sm font-medium mb-4">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Voltar
          </button>
      </div>

      {/* Header Profile Card */}
      <div className="bg-white dark:bg-[#151b2b] rounded-lg border border-slate-200 dark:border-slate-800 p-6 lg:p-8 shadow-sm">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
            <div className="flex items-center gap-6 flex-1">
                {data.type === 'generic' ? (
                    <div className="size-24 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-3xl font-bold border-4 border-white dark:border-slate-700 shadow-sm shrink-0">
                        {data.name.charAt(0)}
                    </div>
                ) : (
                    <div 
                        className="size-24 rounded-full bg-slate-200 bg-cover bg-center border-4 border-white dark:border-slate-700 shadow-sm shrink-0" 
                        style={{ backgroundImage: `url("${data.avatar}")` }}
                    ></div>
                )}
                
                <div className="flex-1 min-w-0">
                    {isEditing ? (
                        <div className="flex flex-col gap-3 max-w-md">
                            <input 
                                type="text" 
                                value={formData.name} 
                                onChange={(e) => handleChange('name', e.target.value)}
                                className="text-3xl font-bold text-slate-900 dark:text-white bg-transparent border-b border-slate-300 dark:border-slate-700 focus:border-primary focus:outline-none px-1"
                            />
                             <div className="flex items-center gap-2">
                                <input 
                                    type="text" 
                                    value={formData.role} 
                                    onChange={(e) => handleChange('role', e.target.value)}
                                    placeholder="Cargo"
                                    className="text-base font-medium text-slate-500 dark:text-slate-400 bg-transparent border-b border-slate-300 dark:border-slate-700 focus:border-primary focus:outline-none px-1 w-1/3"
                                />
                                <span className="text-slate-400">@</span>
                                <input 
                                    type="text" 
                                    value={formData.company} 
                                    onChange={(e) => handleChange('company', e.target.value)}
                                    placeholder="Empresa"
                                    className="text-base font-medium text-primary bg-transparent border-b border-slate-300 dark:border-slate-700 focus:border-primary focus:outline-none px-1 w-1/3"
                                />
                             </div>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{data.name}</h1>
                            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                                {data.role} 
                                <span className="text-slate-300">•</span>
                                <button 
                                    onClick={() => onCompanyClick(data.company)}
                                    className="text-primary hover:underline hover:text-blue-700 font-bold transition-colors flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[18px]">domain</span>
                                    {data.company}
                                </button>
                            </p>
                        </>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-3 mt-4">
                         <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            data.priority === 'Alta' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            data.priority === 'Média' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                         }`}>
                            Prioridade {data.priority}
                         </span>
                         <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full">
                            <span className="material-symbols-outlined text-[16px]">schedule</span>
                            Última atividade: 2h atrás
                         </span>

                         {/* Owners Section in Header */}
                         <div className="flex items-center gap-2 ml-2 pl-4 border-l border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Responsáveis:</span>
                            <div className="flex -space-x-2">
                                {data.owners && data.owners.length > 0 ? (
                                    data.owners.map((owner: string, idx: number) => {
                                        const userInitials = owner.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
                                        return (
                                            <div key={idx} className="size-8 rounded-full bg-slate-700 text-white text-xs font-bold flex items-center justify-center border-2 border-white dark:border-slate-800 ring-1 ring-slate-100 dark:ring-slate-700" title={owner}>
                                                {userInitials}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <span className="text-xs text-slate-400 italic px-2">Nenhum</span>
                                )}
                                <button 
                                    onClick={() => setIsOwnerModalOpen(true)}
                                    className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary hover:bg-slate-200 dark:hover:bg-slate-700 border-2 border-white dark:border-slate-800 flex items-center justify-center transition-colors"
                                    title="Editar Responsáveis"
                                >
                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                </button>
                            </div>
                         </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-3 w-full xl:w-auto">
                {isEditing ? (
                    <>
                         <button 
                            onClick={handleCancel}
                            className="flex-1 xl:flex-none px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleSave}
                            className="flex-1 xl:flex-none px-6 py-2.5 bg-green-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[20px]">check</span>
                            Salvar Perfil
                        </button>
                    </>
                ) : (
                    <button 
                        onClick={handleEditClick}
                        className="flex-1 xl:flex-none px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                        Editar Perfil
                    </button>
                )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Info & Personal (Width 7/12) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Contact Info - EXPANDED */}
            <div className="bg-white dark:bg-[#151b2b] rounded-lg border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <span className="material-symbols-outlined text-primary text-[24px]">contact_phone</span>
                    Informações de Contato
                </h3>
                
                <div className="space-y-6">
                    {/* Primary Email */}
                    <div className="flex items-start gap-4 group">
                         <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-primary">
                            <span className="material-symbols-outlined text-[24px]">mail</span>
                         </div>
                         <div className="flex-1 overflow-hidden">
                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wide mb-1">Email Corporativo</p>
                            {renderField('email', 'Email')}
                         </div>
                         {!isEditing && (
                             <button className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-primary transition-all p-2">
                                 <span className="material-symbols-outlined text-[20px]">content_copy</span>
                             </button>
                         )}
                    </div>

                    {/* Phone */}
                    <div className="flex items-start gap-4">
                         <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-green-600">
                            <span className="material-symbols-outlined text-[24px]">call</span>
                         </div>
                         <div className="flex-1">
                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wide mb-1">Telefone / WhatsApp</p>
                            {renderField('phone', 'Telefone')}
                         </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Personal Email */}
                        <div className="flex items-start gap-4">
                            <div className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-lg text-slate-500">
                                <span className="material-symbols-outlined text-[20px]">alternate_email</span>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wide mb-1">Email Pessoal</p>
                                {renderField('personalEmail', 'Email Pessoal')}
                            </div>
                        </div>

                         {/* Address */}
                         <div className="flex items-start gap-4">
                            <div className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-lg text-slate-500">
                                <span className="material-symbols-outlined text-[20px]">pin_drop</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wide mb-1">Endereço</p>
                                {renderField('address', 'Endereço')}
                            </div>
                        </div>
                    </div>

                    {/* Socials */}
                    <div className="pt-6 mt-2 border-t border-slate-100 dark:border-slate-800">
                         {isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="flex flex-col gap-1.5">
                                    <span className="text-xs font-bold text-slate-500">LinkedIn URL</span>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[18px]">link</span>
                                        <input type="text" value={formData.linkedin} onChange={(e) => handleChange('linkedin', e.target.value)} className="w-full pl-9 px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" placeholder="URL do perfil" />
                                    </div>
                                </label>
                                <label className="flex flex-col gap-1.5">
                                    <span className="text-xs font-bold text-slate-500">Instagram Handle</span>
                                    <div className="relative">
                                         <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">@</span>
                                        <input type="text" value={formData.instagram} onChange={(e) => handleChange('instagram', e.target.value)} className="w-full pl-8 px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" placeholder="usuario" />
                                    </div>
                                </label>
                            </div>
                         ) : (
                             <div className="flex gap-4">
                                {data.linkedin ? (
                                    <a href={`https://${data.linkedin}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#0077b5]/10 hover:bg-[#0077b5]/20 text-[#0077b5] transition-colors border border-[#0077b5]/20">
                                        <span className="font-bold text-xl">in</span>
                                        <span className="text-sm font-bold">LinkedIn Profile</span>
                                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                    </a>
                                ) : (
                                    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed">
                                        <span className="font-bold text-xl opacity-50">in</span>
                                        <span className="text-sm font-bold opacity-50">LinkedIn</span>
                                    </div>
                                )}
                                {data.instagram ? (
                                    <a href={`https://${data.instagram}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#E1306C]/10 hover:bg-[#E1306C]/20 text-[#E1306C] transition-colors border border-[#E1306C]/20">
                                        <span className="font-bold text-xl">IG</span>
                                        <span className="text-sm font-bold">Instagram</span>
                                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                    </a>
                                ) : (
                                    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed">
                                        <span className="font-bold text-xl opacity-50">IG</span>
                                        <span className="text-sm font-bold opacity-50">Instagram</span>
                                    </div>
                                )}
                             </div>
                         )}
                    </div>
                </div>
            </div>

            {/* Personal Info - REDESIGNED GRID */}
            <div className="bg-white dark:bg-[#151b2b] rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                    <span className="material-symbols-outlined text-pink-500 text-[24px]">favorite</span>
                    Pessoal & Interesses
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <PersonalItem icon="cake" label="Idade" field="age" colorClass="text-pink-500" />
                     <PersonalItem icon="favorite" label="Estado Civil" field="maritalStatus" colorClass="text-red-500" />
                     <PersonalItem icon="child_care" label="Filhos" field="children" colorClass="text-blue-500" />
                     <PersonalItem icon="pets" label="Pets" field="pets" colorClass="text-orange-500" />
                     <PersonalItem icon="sports_soccer" label="Time do Coração" field="sportsTeam" colorClass="text-green-600" />
                     <PersonalItem icon="palette" label="Hobbies" field="hobbies" colorClass="text-purple-500" />
                </div>
            </div>

        </div>

        {/* Right Column: Context & Campaigns (Width 5/12) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Notes - COMPACT */}
            <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-900/30 p-4 shadow-sm relative group transition-all hover:shadow-md">
                 <div className="absolute top-0 right-0 size-8 bg-yellow-100 dark:bg-yellow-900/50 rounded-bl-xl border-l border-b border-yellow-200 dark:border-yellow-900/30 z-10"></div>
                 <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-800 dark:text-yellow-100 flex items-center gap-2 text-sm">
                        <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-[18px]">sticky_note_2</span>
                        Anotações Rápidas
                    </h3>
                    <span className="text-[10px] uppercase font-bold text-yellow-600/60 dark:text-yellow-400/60">
                        {isEditing ? 'Editando...' : 'Salvo'}
                    </span>
                 </div>
                 <textarea 
                    className={`w-full h-32 p-3 rounded bg-white/50 dark:bg-black/20 border border-yellow-200/50 dark:border-yellow-900/30 text-slate-700 dark:text-slate-300 text-sm focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 resize-none leading-relaxed ${isEditing ? 'bg-white dark:bg-slate-900 ring-1 ring-yellow-400' : ''}`}
                    value={isEditing ? formData.notes : data.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    readOnly={!isEditing}
                    placeholder="Adicione contexto aqui..."
                 ></textarea>
            </div>

             {/* Campaigns */}
             <div className="bg-white dark:bg-[#151b2b] rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-[24px]">campaign</span>
                    Jornada Ativa
                </h3>
                
                <div className="flex flex-col gap-4">
                    {data.activeCampaign ? (
                    <>
                        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary/50 cursor-pointer transition-all group hover:shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors shadow-sm">
                                    <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">{data.activeCampaign}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded">
                                            <span className="size-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                            Em andamento
                                        </span>
                                        <span className="text-xs text-slate-500">Passo 1 de X</span>
                                    </div>
                                </div>
                            </div>
                            <button className="text-slate-300 hover:text-primary transition-colors">
                                <span className="material-symbols-outlined">chevron_right</span>
                            </button>
                        </div>
                        {/* Timeline / History Stub */}
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-3">Histórico Recente</p>
                            <div className="space-y-3 pl-2 border-l-2 border-slate-100 dark:border-slate-800 ml-1">
                                <div className="pl-4 relative">
                                    <div className="absolute -left-[5px] top-1.5 size-2 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                                    <p className="text-xs text-slate-600 dark:text-slate-300">Contato criado</p>
                                    <p className="text-[10px] text-slate-400">Hoje</p>
                                </div>
                            </div>
                        </div>
                    </>
                    ) : (
                        <div className="text-center py-8 text-slate-400">
                            <p className="text-sm">Nenhuma campanha ativa.</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
      </div>

      {/* Owners Modal */}
      {isOwnerModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-slate-900 dark:text-white">Gerenciar Responsáveis</h3>
                    <button onClick={() => setIsOwnerModalOpen(false)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
                </div>
                <div className="p-2 max-h-[300px] overflow-y-auto">
                    {availableUsers.map(user => {
                        const userName = user.full_name || user.email;
                        const isSelected = (data.owners || []).includes(userName);
                        return (
                            <div 
                                key={user.id} 
                                onClick={() => toggleOwner(userName)}
                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-primary/5 border border-primary/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'}`}
                            >
                                <div className={`size-8 rounded-full flex items-center justify-center font-bold text-xs ${isSelected ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600'} overflow-hidden`}>
                                    {user.avatar_url ? (
                                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        userName.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>{userName}</p>
                                    <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                                </div>
                                {isSelected && <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>}
                            </div>
                        );
                    })}
                    {availableUsers.length === 0 && (
                        <div className="p-4 text-center text-sm text-slate-400">
                            Nenhum usuário encontrado.
                        </div>
                    )}
                </div>
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 text-center">
                    <button onClick={() => setIsOwnerModalOpen(false)} className="text-xs font-bold text-primary hover:underline">Concluído</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ContactDetailsPage;