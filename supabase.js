/* =============================================
   SUPABASE CONFIGURATION & SIMPLE AUTH
   Diário de Bordo - Agrosystem
   ============================================= */

const SUPABASE_URL = 'https://sibdtuatfpdjqgrhekoe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpYmR0dWF0ZnBkanFncmhla29lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMDkxOTIsImV4cCI6MjA4Mzg4NTE5Mn0.jRDGgIhiekr6cGgHg0nb6jNkHamFKTCunOjaii_9Yew';

// Initialize Supabase client
let supabaseClient = null;

function getSupabase() {
    if (!supabaseClient && window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseClient;
}

// =============================================
// SIMPLE AUTHENTICATION (Custom Implementation)
// =============================================

// Sign in with username and password (checks 'users' table)
async function signInWithUsername(username, password) {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase não inicializado');

    // Normalize username
    const safeUsername = username.toLowerCase().trim();
    console.log('Attempting login for:', safeUsername);

    // 1. First check if user exists
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('username', safeUsername)
        .single();

    if (userError || !user) {
        console.error('User not found:', userError);
        throw new Error('Usuário não encontrado. Verifique se criou a tabela "users".');
    }

    // 2. Check password
    if (user.password !== password) {
        console.error('Wrong password for user:', safeUsername);
        throw new Error('Senha incorreta.');
    }

    console.log('Login successful:', user.username);

    // Store user session in localStorage (Simple Session)
    localStorage.setItem('diario_user', JSON.stringify(user));

    return user;
}

// Sign up new user (creates row in 'users' table)
async function signUpWithUsername(username, password, role = 'operador') {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase não inicializado');

    console.log('Creating user:', username);

    // Check if user already exists
    const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

    if (existingUser) {
        throw new Error('Este usuário já existe');
    }

    // Insert new user
    const { data, error } = await supabase
        .from('users')
        .insert([{
            username: username,
            password: password,
            name: username, // Default name to username
            role: role
        }])
        .select()
        .single();

    if (error) {
        console.error('Signup error:', error);
        throw new Error('Erro ao criar usuário: ' + error.message);
    }

    return data;
}

// Sign out
async function signOut() {
    // Clear local session
    localStorage.removeItem('diario_user');
    localStorage.removeItem('diario_guest_mode');
    window.location.href = 'login.html';
}

// Get current logged in user from localStorage
async function getCurrentUser() {
    const userStr = localStorage.getItem('diario_user');
    if (!userStr) return null;

    try {
        return JSON.parse(userStr);
    } catch (e) {
        return null;
    }
}

// Get current profile (Same as user in this refined system)
async function getCurrentProfile() {
    return getCurrentUser();
}

// Check if admin
async function isAdmin() {
    const user = await getCurrentUser();
    return user?.role === 'admin';
}

// =============================================
// USER MANAGEMENT (Admin only)
// =============================================

async function getAllUsers() {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

// =============================================
// BACKUP SYSTEM
// =============================================

const BACKUP_KEY = 'diario_backups';

// Create backup
window.createBackup = function (isManual = false) {
    try {
        const backup = {
            timestamp: new Date().toISOString(),
            type: isManual ? 'manual' : 'auto',
            data: {
                notas: localStorage.getItem('diario_notas') || '[]',
                ordens: localStorage.getItem('diario_ordens') || '[]',
                comentarios: localStorage.getItem('diario_comentarios') || '[]'
            }
        };

        let backups = JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]');

        // Add new backup
        backups.unshift(backup);

        // Keep only last 7 backups (7 dias)
        backups = backups.slice(0, 7);

        localStorage.setItem(BACKUP_KEY, JSON.stringify(backups));
        console.log(`Backup ${isManual ? 'Manual' : 'Automático'} criado:`, backup.timestamp);
        return true;
    } catch (e) {
        console.error('Backup failed:', e);
        return false;
    }
};

// Get backups
window.getBackups = function () {
    return JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]');
};

// Restore backup
window.restoreBackup = function (backupIndex) {
    try {
        const backups = window.getBackups();
        const backup = backups[backupIndex];

        if (!backup) throw new Error('Backup não encontrado');

        localStorage.setItem('diario_notas', backup.data.notas);
        localStorage.setItem('diario_ordens', backup.data.ordens);
        localStorage.setItem('diario_comentarios', backup.data.comentarios);

        console.log('Backup restaurado com sucesso');
        return true;
    } catch (e) {
        console.error('Restore failed:', e);
        return false;
    }
};

// Start auto backup scheduler
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        // Check every minute if it's time for backup (17:45)
        setInterval(() => {
            const now = new Date();
            // Check timing (17:45)
            if (now.getHours() === 17 && now.getMinutes() === 45) {
                const lastBackupDate = localStorage.getItem('diario_last_auto_backup_date');
                const todayStr = now.toDateString();

                // Only run once per day
                if (lastBackupDate !== todayStr) {
                    console.log('Iniciando backup automático agendado (17:45)...');
                    window.createBackup(false);
                    localStorage.setItem('diario_last_auto_backup_date', todayStr);
                }
            }
        }, 60000); // Check every 60s

        console.log('Backup scheduler started (Daily at 17:45)');
    });
}

// =============================================
// DATABASE OPERATIONS
// =============================================

// --- NOTAS FISCAIS ---

window.fetchNotas = async function () {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('notas_fiscais')
        .select('*')
        .order('data', { ascending: false });

    if (error) {
        console.error('Erro ao buscar notas:', error);
        return [];
    }
    return data;
};

window.saveNota = async function (nota) {
    const supabase = getSupabase();
    const user = JSON.parse(localStorage.getItem('diario_user'));

    const payload = {
        ...nota,
        created_by: user ? user.id : null,
        updated_at: new Date().toISOString()
    };

    // Se tem ID e já existe, é update. Mas aqui o app gera ID local.
    // Vamos usar upsert para simplificar salvar/editar
    const { data, error } = await supabase
        .from('notas_fiscais')
        .upsert(payload)
        .select()
        .single();

    if (error) throw error;
    return data;
};

window.deleteNota = async function (id) {
    const supabase = getSupabase();
    const { error } = await supabase
        .from('notas_fiscais')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
};

// --- ORDENS DE PRODUÇÃO ---

window.fetchOrdens = async function () {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('ordens_producao')
        .select('*')
        .order('data', { ascending: false });

    if (error) {
        console.error('Erro ao buscar ordens:', error);
        return [];
    }
    return data;
};

window.saveOrdem = async function (ordem) {
    const supabase = getSupabase();
    const user = JSON.parse(localStorage.getItem('diario_user'));

    const payload = {
        ...ordem,
        created_by: user ? user.id : null,
        updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('ordens_producao')
        .upsert(payload)
        .select()
        .single();

    if (error) throw error;
    return data;
};

window.deleteOrdem = async function (id) {
    const supabase = getSupabase();
    const { error } = await supabase
        .from('ordens_producao')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
};

// --- COMENTÁRIOS ---

window.fetchComentarios = async function () {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('comentarios')
        .select('*')
        .order('data', { ascending: false });

    if (error) {
        console.error('Erro ao buscar comentarios:', error);
        return [];
    }
    return data;
};

window.saveComentario = async function (comentario) {
    const supabase = getSupabase();
    const user = JSON.parse(localStorage.getItem('diario_user'));

    const payload = {
        ...comentario,
        created_by: user ? user.id : null,
        updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('comentarios')
        .upsert(payload)
        .select()
        .single();

    if (error) throw error;
    return data;
};

window.deleteComentario = async function (id) {
    const supabase = getSupabase();
    const { error } = await supabase
        .from('comentarios')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
};

// =============================================
// REALTIME SUBSCRIPTION
// =============================================

window.subscribeToChanges = function (onUpdate) {
    const supabase = getSupabase();

    const channel = supabase.channel('db-changes')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public' },
            (payload) => {
                console.log('Change received!', payload);
                // Quando houver qualquer mudança, avisa o app para recarregar
                if (onUpdate) onUpdate(payload);
            }
        )
        .subscribe();

    return channel;
}

