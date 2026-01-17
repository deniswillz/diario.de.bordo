
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

  // Monitor de Backup Automático às 17:45
  useEffect(() => {
    const backupInterval = setInterval(() => {
      const now = new Date();
      // Verifica se é 17:45
      if (now.getHours() === 17 && now.getMinutes() === 45) {
        const lastAutoBackup = localStorage.getItem('last_auto_backup_date');
        const todayStr = now.toDateString();

        if (lastAutoBackup !== todayStr && data.notas.length > 0) {
          console.log("Iniciando backup automático de rotina (17:45)...");
          db.system.createBackup(data, 'automatico')
            .then(() => {
              localStorage.setItem('last_auto_backup_date', todayStr);
              console.log("Backup automático concluído com sucesso.");
            })
            .catch(err => console.error("Falha no backup automático:", err));
        }
      }
    }, 60000); // Checa a cada minuto

    return () => clearInterval(backupInterval);
  }, [data]);

  useEffect(() => {
    const storedUser = localStorage.getItem('diario_user');
    const guestMode = localStorage.getItem('diario_guest_mode') === 'true';

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else if (guestMode) {
      setIsGuest(true);
    }

    refreshData();

    // Setup Realtime
    const channel = supabase.channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        refreshData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshData]);

  const handleSmartAnalysis = async () => {
    setAnalysis("Analisando registros operacionais e identificando tendências...");
    const result = await analyzeDailyLogs(data);
    setAnalysis(result || "Falha na análise.");
  };

  const logout = () => {
    localStorage.removeItem('diario_user');
    localStorage.removeItem('diario_guest_mode');
    setUser(null);
    setIsGuest(false);
  };

  if (!user && !isGuest) {
    return <Auth onLogin={setUser} onGuest={() => setIsGuest(true)} />;
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
          title="Ordens de Produção"
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
          title="Comentários"
          items={data.comentarios}
          role={role}
          type="comentario"
          onSave={db.comentarios.save}
          onDelete={db.comentarios.delete}
          onRefresh={refreshData}
        />
      )}
      {currentSection === 'admin' && role === 'admin' && (
        <AdminPanel currentData={data} onRefresh={refreshData} />
      )}
    </Layout>
  );
};

export default App;
