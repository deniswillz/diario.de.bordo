-- =============================================
-- DIÁRIO DE BORDO - SUPABASE DATABASE SETUP
-- Execute este SQL no editor do Supabase
-- =============================================

-- 1. Tabela de perfis de usuário
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    username TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'operador' CHECK (role IN ('admin', 'operador')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de notas fiscais
CREATE TABLE IF NOT EXISTS notas_fiscais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL,
    numero TEXT NOT NULL,
    fornecedor TEXT,
    status TEXT NOT NULL,
    tipo TEXT,
    observacao TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de ordens de produção
CREATE TABLE IF NOT EXISTS ordens_producao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL,
    numero TEXT NOT NULL,
    documento TEXT,
    status TEXT NOT NULL,
    observacao TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de comentários
CREATE TABLE IF NOT EXISTS comentarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL,
    texto TEXT NOT NULL,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordens_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentarios ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any) to avoid conflicts
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can view notas" ON notas_fiscais;
DROP POLICY IF EXISTS "Authenticated users can insert notas" ON notas_fiscais;
DROP POLICY IF EXISTS "Authenticated users can update notas" ON notas_fiscais;
DROP POLICY IF EXISTS "Authenticated users can delete notas" ON notas_fiscais;
DROP POLICY IF EXISTS "Anyone can view ordens" ON ordens_producao;
DROP POLICY IF EXISTS "Authenticated users can insert ordens" ON ordens_producao;
DROP POLICY IF EXISTS "Authenticated users can update ordens" ON ordens_producao;
DROP POLICY IF EXISTS "Authenticated users can delete ordens" ON ordens_producao;
DROP POLICY IF EXISTS "Anyone can view comentarios" ON comentarios;
DROP POLICY IF EXISTS "Authenticated users can insert comentarios" ON comentarios;
DROP POLICY IF EXISTS "Authenticated users can update comentarios" ON comentarios;
DROP POLICY IF EXISTS "Authenticated users can delete comentarios" ON comentarios;

-- Policies for profiles
CREATE POLICY "Users can view all profiles" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Policies for notas_fiscais
CREATE POLICY "Anyone can view notas" ON notas_fiscais
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert notas" ON notas_fiscais
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update notas" ON notas_fiscais
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete notas" ON notas_fiscais
    FOR DELETE USING (auth.role() = 'authenticated');

-- Policies for ordens_producao
CREATE POLICY "Anyone can view ordens" ON ordens_producao
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert ordens" ON ordens_producao
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update ordens" ON ordens_producao
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete ordens" ON ordens_producao
    FOR DELETE USING (auth.role() = 'authenticated');

-- Policies for comentarios
CREATE POLICY "Anyone can view comentarios" ON comentarios
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert comentarios" ON comentarios
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update comentarios" ON comentarios
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete comentarios" ON comentarios
    FOR DELETE USING (auth.role() = 'authenticated');

-- =============================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- =============================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, username, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        split_part(NEW.email, '@', 1),
        COALESCE(NEW.raw_user_meta_data->>'role', 'operador')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- CREATE ADMIN USER
-- ATENÇÃO: O sistema agora usa LOGIN POR NOME DE USUÁRIO
-- =============================================

-- Para criar o admin via Supabase Dashboard:
-- 1. Vá em Authentication > Users > Add User
-- 2. Email: admin@diario.local (ou qualquer email com formato: nomedousuario@diario.local)
-- 3. Defina uma senha

-- Depois execute este SQL para torná-lo admin:
-- UPDATE profiles SET role = 'admin', username = 'admin' WHERE email = 'admin@diario.local';

-- OU crie o admin diretamente via interface do sistema após executar este setup.
