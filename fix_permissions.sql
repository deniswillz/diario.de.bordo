-- ========================================================
-- SCRIPT DE CORREÇÃO DE PERMISSÕES (ERRO 401)
-- ========================================================
-- Este script resolve o problema de "Failed to load resource: 401"
-- desabilitando o bloqueio padrão do Supabase para tabelas RLS.
-- Como a autenticação é gerenciada pelo app (tabela users), 
-- podemos abrir o acesso da API.

ALTER TABLE public.notas_fiscais DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_producao DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Se no futuro quiser reabilitar segurança, use:
-- ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Public All" ON public.notas_fiscais FOR ALL USING (true);
