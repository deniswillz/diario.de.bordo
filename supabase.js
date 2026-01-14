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
const BACKUP_INTERVAL = 60 * 60 * 1000; // 1 hour

// Create backup
function createBackup() {
    try {
        const backup = {
            timestamp: new Date().toISOString(),
            data: {
                notas: localStorage.getItem('diario_notas') || '[]',
                ordens: localStorage.getItem('diario_ordens') || '[]',
                comentarios: localStorage.getItem('diario_comentarios') || '[]'
            }
        };

        let backups = JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]');
        backups.unshift(backup);
        backups = backups.slice(0, 24); // Keep last 24

        localStorage.setItem(BACKUP_KEY, JSON.stringify(backups));
        console.log('Backup criado:', backup.timestamp);
        return backup;
    } catch (e) {
        console.error('Backup failed:', e);
    }
}

// Start auto backup
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        setInterval(createBackup, BACKUP_INTERVAL);
        // Create initial backup if none exists
        if (!localStorage.getItem(BACKUP_KEY)) {
            createBackup();
        }
    });
}

// =============================================
// DATA MIGRATION
// =============================================

async function migrateDataToSupabase() {
    console.log('System ready (Simple Auth Mode)');
}
