import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';
import { supabase } from '../services/supabaseClient';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/cropImage';

interface SettingsProps {
  userProfile: UserProfile | null;
  onProfileUpdate: () => void;
}

const Settings: React.FC<SettingsProps> = ({ userProfile, onProfileUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    full_name: '',
    email: '',
    role: '',
    company: '',
  });
  
  // Crop States
  const [uploading, setUploading] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [avatarFile, setAvatarFile] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  useEffect(() => {
    if (userProfile) {
      setFormData({
        full_name: userProfile.full_name || '',
        email: userProfile.email || '',
        role: userProfile.role || '',
        company: userProfile.company || '',
      });
    }
  }, [userProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSave = async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      // 1. Update Auth Metadata (Backup & Quick Access)
      const { error: authError } = await supabase.auth.updateUser({
        data: {
            full_name: formData.full_name,
            role: formData.role,
            company: formData.company,
        }
      });
      if (authError) throw authError;

      // 2. Update Profiles Table (Source of Truth)
      // Note: This requires 'role' and 'company' columns to exist in the 'profiles' table.
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userProfile.id,
          full_name: formData.full_name,
          role: formData.role,
          company: formData.company,
          updated_at: new Date(),
        });

      if (profileError) throw profileError;

      alert('Perfil atualizado com sucesso!');
      onProfileUpdate();
    } catch (error: any) {
      console.error("Profile update error:", error);
      alert(`Erro ao atualizar perfil: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper to read file
  const readFile = (file: File) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result), false);
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      const imageDataUrl = await readFile(file);
      setAvatarFile(imageDataUrl as string);
      setIsCropping(true);
      // Reset crop state
      setZoom(1);
      setCrop({ x: 0, y: 0 });
    }
    // Clear value to allow re-selecting same file if canceled
    event.target.value = '';
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropSave = async () => {
    try {
        setUploading(true);
        if (!avatarFile || !croppedAreaPixels || !userProfile) return;
        
        const croppedBlob = await getCroppedImg(avatarFile, croppedAreaPixels);
        if (!croppedBlob) throw new Error('Falha ao recortar imagem');

        // Use Date.now() for a clean filename
        const fileName = `${userProfile.id}/${Date.now()}.jpg`;
        
        // Upload to Storage
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, croppedBlob, {
                contentType: 'image/jpeg',
                upsert: true
            });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
        
        // Update Profile Avatar URL
        const { error: updateError } = await supabase
            .from('profiles')
            .upsert({ 
                id: userProfile.id,
                avatar_url: data.publicUrl,
                updated_at: new Date()
            });

        if (updateError) throw updateError;
        
        // Also update auth metadata
        await supabase.auth.updateUser({
            data: { avatar_url: data.publicUrl }
        });

        setIsCropping(false);
        setAvatarFile(null);
        onProfileUpdate();
        
    } catch (e: any) {
        console.error("Avatar save error:", e);
        alert("Erro ao salvar foto: " + e.message);
    } finally {
        setUploading(false);
    }
  };

  if (!userProfile) {
      return <div className="p-6">Carregando perfil...</div>;
  }

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="p-4 lg:p-6 w-full flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configurações</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gerencie seu perfil e preferências da conta.</p>
      </div>

      <div className="bg-white dark:bg-[#151b2b] rounded border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden max-w-3xl">
        
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
                 {userProfile.avatar_url ? (
                     <div 
                        className="size-20 rounded-full bg-slate-200 bg-cover bg-center border-2 border-white dark:border-slate-800 shadow-sm" 
                        style={{ backgroundImage: `url("${userProfile.avatar_url}")` }}
                     ></div>
                 ) : (
                     <div className="size-20 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold border-2 border-white dark:border-slate-800 shadow-sm">
                         {getInitials(userProfile.full_name || userProfile.email)}
                     </div>
                 )}
                 <div>
                    <label className="cursor-pointer px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors inline-block text-center min-w-[100px]">
                        {uploading ? 'Processando...' : 'Alterar Foto'}
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileSelect}
                            disabled={uploading}
                        />
                    </label>
                    <p className="text-[10px] text-slate-400 mt-1">Recomendado: 400x400px</p>
                 </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Nome Completo</span>
                    <input 
                        name="full_name"
                        className="w-full h-10 px-3 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white" 
                        type="text" 
                        value={formData.full_name}
                        onChange={handleChange}
                        placeholder="Seu nome"
                    />
                </label>
                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Email</span>
                    <input 
                        name="email"
                        className="w-full h-10 px-3 rounded border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed" 
                        type="email" 
                        value={formData.email}
                        disabled
                        title="O email não pode ser alterado."
                    />
                </label>
                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cargo</span>
                    <input 
                        name="role"
                        className="w-full h-10 px-3 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white" 
                        type="text" 
                        value={formData.role}
                        onChange={handleChange}
                        placeholder="Ex: SDR Manager"
                    />
                </label>
                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Empresa</span>
                    <input 
                        name="company"
                        className="w-full h-10 px-3 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white" 
                        type="text" 
                        value={formData.company}
                        onChange={handleChange}
                        placeholder="Nome da sua empresa"
                    />
                </label>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center gap-2"
                >
                    {loading && <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>}
                    Salvar Alterações
                </button>
            </div>
        </div>
      </div>

       {/* Cropper Modal for Settings */}
       {isCropping && avatarFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-in fade-in zoom-in duration-200">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
                      <h3 className="font-bold text-slate-900 dark:text-white">Ajustar Foto</h3>
                      <button onClick={() => setIsCropping(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"><span className="material-symbols-outlined">close</span></button>
                  </div>
                  
                  <div className="relative h-64 w-full bg-slate-900">
                    <Cropper
                        image={avatarFile}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                    />
                  </div>

                  <div className="p-6 flex flex-col gap-5">
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">zoom_in</span> Zoom
                            </span>
                            <span className="text-xs font-medium text-slate-400">{zoom.toFixed(1)}x</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setZoom(Math.max(1, zoom - 0.1))} 
                                className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-primary hover:text-white transition-colors flex items-center justify-center shrink-0"
                            >
                                <span className="material-symbols-outlined text-[18px]">remove</span>
                            </button>
                            
                            <div className="flex-1 relative h-6 flex items-center">
                                <input 
                                    type="range" 
                                    value={zoom} 
                                    min={1} 
                                    max={3} 
                                    step={0.1} 
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                            </div>

                            <button 
                                onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                                className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-primary hover:text-white transition-colors flex items-center justify-center shrink-0"
                            >
                                <span className="material-symbols-outlined text-[18px]">add</span>
                            </button>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button 
                            onClick={() => setIsCropping(false)} 
                            className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleCropSave} 
                            disabled={uploading}
                            className="px-5 py-2 bg-primary text-white text-sm font-bold rounded shadow-lg shadow-primary/30 hover:bg-blue-700 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                        >
                            {uploading && <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>}
                            Aplicar Recorte
                        </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Settings;