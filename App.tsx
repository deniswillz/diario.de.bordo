
import React, { useState, useEffect, useCallback } from 'react';
import { User, UserRole, AppState, NotaFiscal, OrdemProducao, Comentario } from './types';
import { db, supabase } from './services/supabase';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ListManager } from './components/ListManager';
import { AdminPanel } from './components/AdminPanel';
import { Auth } from './components/Auth';
import { analyzeDailyLogs } from './services/gemini';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [currentSection, setCurrentSection] = useState<'dashboard' | 'notas' | 'ordens' | 'comentarios' | 'admin'>('dashboard');
  const [data, setData] = useState<AppState>({ notas: [], ordens: [], comentarios: [] });
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<string>('');

  const refreshData = useCallback(async () => {
    try {
      const [notas, ordens, comentarios] = await Promise.all([
        db.notas.fetch(),
        db.ordens.fetch(),
        db.comentarios.fetch()
      ]);
      setData({ notas, ordens, comentarios });
    } catch (error) {
      console.error("Failed to refresh data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Monitor de Backup Automático sincronizado via Supabase
  useEffect(() => {
    const backupInterval = setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 17 && now.getMinutes() === 45) {
        const todayStr = now.toDateString();
        const lastAutoBackup = await db.system.getSetting('last_auto_backup_date');

        if (lastAutoBackup !== todayStr && data.notas.length > 0) {
          console.log("Iniciando backup automático Nano (17:45)...");
          try {
            await db.system.createBackup(data, 'automatico');
            await db.system.setSetting('last_auto_backup_date', todayStr);
          } catch (err) {
            console.error("Falha no backup automático Nano:", err);
          }
        }
      }
    }, 60000);

    return () => clearInterval(backupInterval);
  }, [data]);

  useEffect(() => {
    refreshData();
    const channel = supabase.channel('nano-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        refreshData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshData]);

  const handleSmartAnalysis = async () => {
    setAnalysis("Analisando registros operacionais Nano e identificando tendências...");
    const result = await analyzeDailyLogs(data);
    setAnalysis(result || "Falha na análise Nano.");
  };

  const handleLogin = (u: User) => {
    setUser(u);
    sessionStorage.setItem('active_user', JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    setIsGuest(false);
    setCurrentSection('dashboard');
    sessionStorage.removeItem('active_user');
  };

  if (!user && !isGuest) {
    return <Auth onLogin={handleLogin} onGuest={() => setIsGuest(true)} />;
  }

  const role: UserRole = isGuest ? 'guest' : user?.role || 'operador';

  return (
    <Layout 
      currentSection={currentSection} 
      onSectionChange={setCurrentSection} 
      user={user} 
      isGuest={isGuest}
      onLogout={logout}
      data={data}
    >
      {currentSection === 'dashboard' && (
        <Dashboard 
          data={data} 
          analysis={analysis} 
          onRunAnalysis={handleSmartAnalysis}
          onRefresh={refreshData}
          isGuest={isGuest}
        />
      )}
      {currentSection === 'notas' && (
        <ListManager<NotaFiscal>
          title="Notas Fiscais"
          items={data.notas}
          role={role}
          type="nota"
          onSave={db.notas.save}
          onDelete={db.notas.delete}
          onRefresh={refreshData}
        />
      )}
      {currentSection === 'ordens' && (
        <ListManager<OrdemProducao>
          title="Ordem"
          items={data.ordens}
          role={role}
          type="ordem"
          onSave={db.ordens.save}
          onDelete={db.ordens.delete}
          onRefresh={refreshData}
        />
      )}
      {currentSection === 'comentarios' && !isGuest && (
        <ListManager<Comentario>
          title="Apontamentos"
          items={data.comentarios}
          role={role}
          type="comentario"
          onSave={db.comentarios.save}
          onDelete={db.comentarios.delete}
          onRefresh={refreshData}
        />
      )}
      {/* Liberado para todos logados, o componente interno AdminPanel fará a filtragem por cargo */}
      {currentSection === 'admin' && !isGuest && (
        <AdminPanel currentData={data} onRefresh={refreshData} />
      )}
    </Layout>
  );
};

export default App;
