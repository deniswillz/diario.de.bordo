/* =============================================
   SUPABASE CONFIGURATION
   Diário de Bordo - Agrosystem
   ============================================= */

const SUPABASE_URL = 'https://sibdtuatfpdjqgrhekoe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpYmR0dWF0ZnBkanFncmhla29lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMDkxOTIsImV4cCI6MjA4Mzg4NTE5Mn0.jRDGgIhiekr6cGgHg0nb6jNkHamFKTCunOjaii_9Yew';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =============================================
// AUTHENTICATION
// =============================================

async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) throw error;
    return data;
}

// Username-based login (converts username to internal email format)
async function signInWithUsername(username, password) {
    // Convert username to internal email format
    const internalEmail = `${username.toLowerCase().replace(/\s+/g, '_')}@diario.local`;

    const { data, error } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password: password
    });

    if (error) {
        // Translate error message
        if (error.message.includes('Invalid login credentials')) {
            throw new Error('Usuário ou senha inválidos');
        }
        throw error;
    }
    return data;
}

async function signUp(email, password, name, role = 'operador') {
    // First create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password
    });

    if (authError) throw authError;

    // Then create profile
    const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
            id: authData.user.id,
            email: email,
            name: name,
            role: role
        }]);

    if (profileError) throw profileError;

    return authData;
}

// Username-based signup (creates user with internal email format)
async function signUpWithUsername(username, password, role = 'operador') {
    // Convert username to internal email format
    const internalEmail = `${username.toLowerCase().replace(/\s+/g, '_')}@diario.local`;

    // First create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: internalEmail,
        password: password,
        options: {
            data: {
                name: username,
                role: role
            }
        }
    });

    if (authError) {
        if (authError.message.includes('already registered')) {
            throw new Error('Usuário já existe');
        }
        throw authError;
    }

    // Create profile with username
    const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
            id: authData.user.id,
            email: internalEmail,
            name: username,
            username: username.toLowerCase().replace(/\s+/g, '_'),
            role: role
        }]);

    if (profileError) throw profileError;

    return authData;
}

async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    window.location.href = 'login.html';
}

async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

async function getCurrentProfile() {
    const user = await getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }

    return data;
}

async function isAdmin() {
    const profile = await getCurrentProfile();
    return profile?.role === 'admin';
}

function checkAuth() {
    return new Promise((resolve) => {
        supabase.auth.onAuthStateChange((event, session) => {
            resolve(session?.user || null);
        });
    });
}

async function requireAuth() {
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return null;
    }
    return user;
}

// =============================================
// USER MANAGEMENT (Admin only)
// =============================================

async function getAllUsers() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

async function updateUserRole(userId, newRole) {
    const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

    if (error) throw error;
}

async function deleteUser(userId) {
    // Note: This only deletes the profile. Auth deletion requires admin API.
    const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

    if (error) throw error;
}

// =============================================
// DATA OPERATIONS (Supabase)
// =============================================

// Notas Fiscais
async function getNotas() {
    const { data, error } = await supabase
        .from('notas_fiscais')
        .select('*')
        .order('data', { ascending: false });

    if (error) throw error;
    return data;
}

async function saveNotaSupabase(nota) {
    if (nota.id && nota.id.length > 20) {
        // Existing record - update
        const { error } = await supabase
            .from('notas_fiscais')
            .update({
                data: nota.data,
                numero: nota.numero,
                fornecedor: nota.fornecedor,
                status: nota.status,
                tipo: nota.tipo,
                observacao: nota.observacao,
                updated_at: new Date().toISOString()
            })
            .eq('id', nota.id);

        if (error) throw error;
    } else {
        // New record - insert
        const user = await getCurrentUser();
        const { data, error } = await supabase
            .from('notas_fiscais')
            .insert([{
                data: nota.data,
                numero: nota.numero,
                fornecedor: nota.fornecedor,
                status: nota.status,
                tipo: nota.tipo,
                observacao: nota.observacao,
                created_by: user?.id
            }])
            .select();

        if (error) throw error;
        return data[0];
    }
}

async function deleteNotaSupabase(id) {
    const { error } = await supabase
        .from('notas_fiscais')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// Ordens de Produção
async function getOrdens() {
    const { data, error } = await supabase
        .from('ordens_producao')
        .select('*')
        .order('data', { ascending: false });

    if (error) throw error;
    return data;
}

async function saveOrdemSupabase(ordem) {
    if (ordem.id && ordem.id.length > 20) {
        const { error } = await supabase
            .from('ordens_producao')
            .update({
                data: ordem.data,
                numero: ordem.numero,
                documento: ordem.documento,
                status: ordem.status,
                observacao: ordem.observacao,
                updated_at: new Date().toISOString()
            })
            .eq('id', ordem.id);

        if (error) throw error;
    } else {
        const user = await getCurrentUser();
        const { data, error } = await supabase
            .from('ordens_producao')
            .insert([{
                data: ordem.data,
                numero: ordem.numero,
                documento: ordem.documento,
                status: ordem.status,
                observacao: ordem.observacao,
                created_by: user?.id
            }])
            .select();

        if (error) throw error;
        return data[0];
    }
}

async function deleteOrdemSupabase(id) {
    const { error } = await supabase
        .from('ordens_producao')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// Comentários
async function getComentarios() {
    const { data, error } = await supabase
        .from('comentarios')
        .select('*')
        .order('data', { ascending: false });

    if (error) throw error;
    return data;
}

async function saveComentarioSupabase(comentario) {
    if (comentario.id && comentario.id.length > 20) {
        const { error } = await supabase
            .from('comentarios')
            .update({
                data: comentario.data,
                texto: comentario.texto,
                updated_at: new Date().toISOString()
            })
            .eq('id', comentario.id);

        if (error) throw error;
    } else {
        const user = await getCurrentUser();
        const { data, error } = await supabase
            .from('comentarios')
            .insert([{
                data: comentario.data,
                texto: comentario.texto,
                created_by: user?.id
            }])
            .select();

        if (error) throw error;
        return data[0];
    }
}

async function deleteComentarioSupabase(id) {
    const { error } = await supabase
        .from('comentarios')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// =============================================
// DATA MIGRATION (localStorage to Supabase)
// =============================================

async function migrateDataToSupabase() {
    const user = await getCurrentUser();
    if (!user) return;

    // Migrate Notas
    const localNotas = JSON.parse(localStorage.getItem('diario_notas') || '[]');
    for (const nota of localNotas) {
        try {
            // Check if already exists by numero
            const { data: existing } = await supabase
                .from('notas_fiscais')
                .select('id')
                .eq('numero', nota.numero)
                .single();

            if (!existing) {
                await supabase.from('notas_fiscais').insert([{
                    data: nota.data,
                    numero: nota.numero,
                    fornecedor: nota.fornecedor,
                    status: nota.status,
                    tipo: nota.tipo,
                    observacao: nota.observacao,
                    created_by: user.id,
                    created_at: nota.criadoEm || new Date().toISOString()
                }]);
            }
        } catch (e) {
            console.log('Nota already exists or error:', nota.numero);
        }
    }

    // Migrate Ordens
    const localOrdens = JSON.parse(localStorage.getItem('diario_ordens') || '[]');
    for (const ordem of localOrdens) {
        try {
            const { data: existing } = await supabase
                .from('ordens_producao')
                .select('id')
                .eq('numero', ordem.numero)
                .single();

            if (!existing) {
                await supabase.from('ordens_producao').insert([{
                    data: ordem.data,
                    numero: ordem.numero,
                    documento: ordem.documento,
                    status: ordem.status,
                    observacao: ordem.observacao,
                    created_by: user.id,
                    created_at: ordem.criadoEm || new Date().toISOString()
                }]);
            }
        } catch (e) {
            console.log('Ordem already exists or error:', ordem.numero);
        }
    }

    // Migrate Comentarios
    const localComentarios = JSON.parse(localStorage.getItem('diario_comentarios') || '[]');
    for (const comentario of localComentarios) {
        try {
            await supabase.from('comentarios').insert([{
                data: comentario.data,
                texto: comentario.texto,
                created_by: user.id,
                created_at: comentario.criadoEm || new Date().toISOString()
            }]);
        } catch (e) {
            console.log('Error migrating comentario');
        }
    }

    console.log('Migration complete!');
}
