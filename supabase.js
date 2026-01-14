/* =============================================
   SUPABASE CONFIGURATION
   Diário de Bordo - Agrosystem
   ============================================= */

const SUPABASE_URL = 'https://sibdtuatfpdjqgrhekoe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpYmR0dWF0ZnBkanFncmhla29lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMDkxOTIsImV4cCI6MjA4Mzg4NTE5Mn0.jRDGgIhiekr6cGgHg0nb6jNkHamFKTCunOjaii_9Yew';

// Initialize Supabase client
let supabaseClient = null;

function getSupabase() {
    if (!supabaseClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseClient;
}

// =============================================
// AUTHENTICATION - SIMPLIFIED
// =============================================

// Convert username to email format for Supabase
function usernameToEmail(username) {
    return `${username.toLowerCase().trim().replace(/\s+/g, '_')}@diario.agrosystem.local`;
}

// Sign in with username and password
async function signInWithUsername(username, password) {
    const supabase = getSupabase();
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

    console.log('Login successful:', data.user.email);
    return data;
}

// Sign up with username and password (for admin panel)
async function signUpWithUsername(username, password, role = 'operador') {
    const supabase = getSupabase();
    const email = usernameToEmail(username);

    console.log('Creating user with email:', email);

    // Create auth user
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

    // Wait a moment for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update profile with username and role
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
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Signout error:', error);
    window.location.href = 'login.html';
}

// Get current authenticated user
async function getCurrentUser() {
    const supabase = getSupabase();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    } catch (e) {
        console.error('Get user error:', e);
        return null;
    }
}

// Get current user's profile
async function getCurrentProfile() {
    const supabase = getSupabase();
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

// Check if current user is admin
async function isAdmin() {
    const profile = await getCurrentProfile();
    return profile?.role === 'admin';
}

// =============================================
// USER MANAGEMENT (Admin only)
// =============================================

async function getAllUsers() {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

async function updateUserRole(userId, newRole) {
    const supabase = getSupabase();
    const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

    if (error) throw error;
}

// =============================================
// DATA OPERATIONS
// =============================================

const STORAGE_KEYS = {
    notas: 'diario_notas',
    ordens: 'diario_ordens',
    comentarios: 'diario_comentarios'
};

// Get data (from localStorage for now)
function getData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

// Save data (to localStorage for now)
function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// =============================================
// DATA MIGRATION (localStorage to Supabase)
// =============================================

async function migrateDataToSupabase() {
    // Migration logic here if needed
    console.log('Migration check complete');
}
