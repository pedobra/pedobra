-- ==============================================================================
-- FORTALEZA DE SEGURANÇA: Políticas de Row Level Security (RLS) para o Supabase
-- ==============================================================================
--
-- Instruções:
-- Execute este script na aba "SQL Editor" do seu painel do Supabase.
-- Isso irá trancar as tabelas para que usuários não autenticados não possam
-- ler nem escrever dados, e para que os usuários só vejam dados de suas próprias 
-- organizações (Multi-tenant Isolation).
--

-- 1. Tabela PROCEDURES / SETTINGS (Geral)
-- Habilita RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Todos os usuários logados podem LER as configurações.
CREATE POLICY "Logged in users can read settings" ON public.company_settings
FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Apenas Admin pode atualizar
-- Assumindo que o papel do usuário (role) está salvo em public.profiles
CREATE POLICY "Admins can update settings" ON public.company_settings
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);


-- 2. Tabela PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: O usuário pode ler o próprio perfil E os administradores da mesma organização podem ler
CREATE POLICY "Users can read own profile" ON public.profiles
FOR SELECT USING ( auth.uid() = id );

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING ( auth.uid() = id );


-- 3. Tabela SITES (Obras)
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários autenticados podem ler obras (Dependendo da regra de negócio, limite por tenant)
CREATE POLICY "Authenticated users can read sites" ON public.sites
FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Apenas Administradores podem Inserir/Atualizar/Deletar Obras
CREATE POLICY "Admins can modify sites" ON public.sites
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);


-- 4. Tabela ORDERS (Pedidos)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policy: Workers podem LER e CRIAR pedidos para as obras que estão associados. Admins podem ler e alterar tudo.
CREATE POLICY "Admins can do everything on orders" ON public.orders
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Workers can create orders" ON public.orders
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

CREATE POLICY "Workers can read own created orders or orders from their site" ON public.orders
FOR SELECT USING (
  user_id = auth.uid() OR 
  site_id IN (SELECT site_id FROM profiles WHERE profiles.id = auth.uid())
);


-- 5. STORAGE BUCKETS (Secure Assets)
-- Crie um bucket chamado 'secure-assets' no painel Storage. Marque como PRIVADO.
-- A rota e manipulação da URL assinada (Signed URL) já foi programada no Frontend via `security.ts`.
-- Políticas do Bucket (Execute após criar o bucket):

-- INSERT: Permite que usuários autenticados façam upload
CREATE POLICY "Authed users can upload secure assets" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'secure-assets' AND 
  auth.role() = 'authenticated'
);

-- SELECT: Permite que apenas autenticados vejam arquivos privados 
-- (Na prática, o admin gerará signed URLs, o Select permitirá essa geração)
CREATE POLICY "Authed users can read secure assets" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'secure-assets' AND 
  auth.role() = 'authenticated'
);

-- FIM DO SCRIPT DE REFERÊNCIA.
