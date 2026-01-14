/* =============================================
   SUPABASE CONFIGURATION
   Diário de Bordo - Agrosystem
   ============================================= */

const SUPABASE_URL = 'https://sibdtuatfpdjqgrhekoe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpYmR0dWF0ZnBkanFncmhla29lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMDkxOTIsImV4cCI6MjA4Mzg4NTE5Mn0.jRDGgIhekr6cGgHg0nb6jNkHamFKTCunOjaii_9Yew';

// Initialize Supabase client
let supabaseClient = null;

function getSupabase() {
    if (!supabaseClient && window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseClient;
}

// =============================================
// AUTHENTICATION
// =============================================

// Convert username to email format for Supabase (using valid domain)
function usernameToEmail(username) {
    // Use @diario.app which is a valid format Supabase accepts
    return `${username.toLowerCase().trim().replace(/\s+/g, '.')}@diarioagro.app`;
}

// Sign in with username and password
async function signInWithUsername(username, password) {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase não inicializado');

    const email = usernameToEmail(username);
    console.log('Attempting login with email:', email);

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        console.error('Login error:', error);
        throw new Error('Usuário ou senha inválidos');
    }

    console.log('Login successful');
    return data;
}

// Sign up with username and password
async function signUpWithUsername(username, password, role = 'operador') {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase não inicializado');

    const email = usernameToEmail(username);
    console.log('Creating user with email:', email);

    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                name: username,
                role: role
            }
        }
    });

    if (authError) {
        console.error('Signup error:', authError);
        if (authError.message.includes('already registered')) {
            throw new Error('Este usuário já existe');
        }
        throw new Error('Erro ao criar usuário: ' + authError.message);
    }

    // Wait for trigger
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update profile
    const { error: profileError } = await supabase
        .from('profiles')
        .update({
            username: username.toLowerCase().trim(),
            role: role
        })
        .eq('id', authData.user.id);

    if (profileError) {
        console.warn('Profile update warning:', profileError);
    }

    return authData;
}

// Sign out
async function signOut() {
    const supabase = getSupabase();
    if (supabase) {
        await supabase.auth.signOut();
    }
    window.location.href = 'login.html';
}

// Get current user
async function getCurrentUser() {
    const supabase = getSupabase();
    if (!supabase) return null;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    } catch (e) {
        return null;
    }
}

// Get current profile
async function getCurrentProfile() {
    const supabase = getSupabase();
    if (!supabase) return null;

    const user = await getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Profile fetch error:', error);
        return null;
    }

    return data;
}

// Check if admin
async function isAdmin() {
    const profile = await getCurrentProfile();
    return profile?.role === 'admin';
}

// =============================================
// USER MANAGEMENT
// =============================================

async function getAllUsers() {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

// =============================================
// BACKUP SYSTEM
// =============================================

const BACKUP_KEY = 'diario_backups';
const BACKUP_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds

// Create backup of all data
function createBackup() {
    const backup = {
        timestamp: new Date().toISOString(),
        data: {
            notas: localStorage.getItem('diario_notas') || '[]',
            ordens: localStorage.getItem('diario_ordens') || '[]',
            comentarios: localStorage.getItem('diario_comentarios') || '[]'
        }
    };

    // Get existing backups
    let backups = JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]');

    // Add new backup
    backups.unshift(backup);

    // Keep only last 24 backups (24 hours)
    backups = backups.slice(0, 24);

    localStorage.setItem(BACKUP_KEY, JSON.stringify(backups));
    console.log('Backup criado:', backup.timestamp);

    return backup;
}

// Get all backups
function getBackups() {
    return JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]');
}

// Restore from backup
function restoreBackup(index) {
    const backups = getBackups();
    if (index < 0 || index >= backups.length) {
        throw new Error('Backup não encontrado');
    }

    const backup = backups[index];

    // Restore data
    localStorage.setItem('diario_notas', backup.data.notas);
    localStorage.setItem('diario_ordens', backup.data.ordens);
    localStorage.setItem('diario_comentarios', backup.data.comentarios);

    console.log('Backup restaurado:', backup.timestamp);
    return backup;
}

// Start automatic backup
function startAutoBackup() {
    // Create initial backup
    createBackup();

    // Set interval for automatic backups
    setInterval(() => {
        createBackup();
    }, BACKUP_INTERVAL);

    console.log('Auto-backup iniciado (a cada 1 hora)');
}

// Initialize backup on load
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        startAutoBackup();
    });
}

// =============================================
// DATA MIGRATION
// =============================================

async function migrateDataToSupabase() {
    console.log('Migration check complete');
}
