-- Akili Connect - Multi-tenant SaaS Database Schema
-- Architecture simplifiée utilisant auth.users de Supabase
-- Version mise à jour après migration vers auth.users

-- ============================================================================
-- NOTES IMPORTANTES
-- ============================================================================
-- ✅ Les utilisateurs sont gérés via auth.users de Supabase
-- ✅ platform_role stocké dans auth.users.app_metadata
-- ✅ Métadonnées utilisateur dans auth.users.user_metadata
-- ✅ Pas de table users custom - architecture simplifiée

-- ============================================================================
-- NIVEAU 1: ORGANISATIONS ET WORKSPACES (Multi-tenant)
-- ============================================================================

-- Organizations (entreprises/entités principales)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255), -- domaine email de l'organisation (optionnel)
  plan VARCHAR(50) DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workspaces (espaces de travail au sein d'une organisation)
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL, -- URL-friendly name
  description TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- Workspace Members (relations auth.users ↔ workspaces avec rôles)
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invitation_accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, workspace_id)
);

-- Historique des changements de rôles
CREATE TABLE role_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope VARCHAR(20) NOT NULL CHECK (scope IN ('platform','workspace')),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  old_role VARCHAR(50),
  new_role VARCHAR(50) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- GESTION DES INVITATIONS
-- ============================================================================

-- Invitations (pour inviter des utilisateurs dans un workspace)
CREATE TABLE workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, email)
);

-- ============================================================================
-- FONCTIONNALITÉS PRINCIPALES DU SAAS
-- ============================================================================

-- Bots/Agents IA (ressources principales du SaaS)
CREATE TABLE bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'chatbot',
  configuration JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge Bases (bases de connaissances)
CREATE TABLE knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- AUDIT ET TRAÇABILITÉ
-- ============================================================================

-- Audit Trail
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEX ET OPTIMISATIONS
-- ============================================================================

-- Index pour les performances
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX idx_workspaces_organization_id ON workspaces(organization_id);
CREATE INDEX idx_workspace_invitations_workspace_id ON workspace_invitations(workspace_id);
CREATE INDEX idx_workspace_invitations_email ON workspace_invitations(email);
CREATE INDEX idx_workspace_invitations_token ON workspace_invitations(token);
CREATE INDEX idx_bots_workspace_id ON bots(workspace_id);
CREATE INDEX idx_knowledge_bases_workspace_id ON knowledge_bases(workspace_id);
CREATE INDEX idx_audit_logs_workspace_id ON audit_logs(workspace_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_role_change_logs_target ON role_change_logs(target_user_id);
CREATE INDEX idx_role_change_logs_workspace ON role_change_logs(workspace_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tenant-specific tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_change_logs ENABLE ROW LEVEL SECURITY;

-- Politiques pour organizations
CREATE POLICY "Users can view organizations they belong to" ON organizations
FOR SELECT USING (
  id IN (
    SELECT DISTINCT w.organization_id 
    FROM workspaces w 
    JOIN workspace_members wm ON w.id = wm.workspace_id 
    WHERE wm.user_id = auth.uid()
  )
);

-- Politiques pour workspaces
CREATE POLICY "Users can view workspaces they are members of" ON workspaces
FOR SELECT USING (
  id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);

-- Politiques pour workspace_members
CREATE POLICY "Users can view their workspace memberships" ON workspace_members
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage workspace memberships" ON workspace_members
FOR ALL USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

-- Politiques pour workspace_invitations
CREATE POLICY "Users can view invitations for their workspaces" ON workspace_invitations
FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
  OR invited_by = auth.uid()
);

-- Politiques pour bots
CREATE POLICY "Users can view bots in their workspaces" ON bots
FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage bots in their workspaces" ON bots
FOR ALL USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

-- Politiques pour knowledge_bases
CREATE POLICY "Users can view knowledge bases in their workspaces" ON knowledge_bases
FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage knowledge bases in their workspaces" ON knowledge_bases
FOR ALL USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

-- Politiques pour audit_logs
CREATE POLICY "Users can view audit logs in their workspaces" ON audit_logs
FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);

-- Politiques pour role_change_logs
CREATE POLICY "Users can view role changes in their workspaces" ON role_change_logs
FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid()
  )
  OR target_user_id = auth.uid()
);

-- ============================================================================
-- FONCTIONS UTILITAIRES
-- ============================================================================

-- Function pour vérifier si un utilisateur appartient à un workspace
CREATE OR REPLACE FUNCTION user_belongs_to_workspace(p_user_id UUID, p_workspace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE user_id = p_user_id AND workspace_id = p_workspace_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function pour obtenir le rôle d'un utilisateur dans un workspace
CREATE OR REPLACE FUNCTION get_user_workspace_role(p_user_id UUID, p_workspace_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role 
  FROM workspace_members 
  WHERE user_id = p_user_id AND workspace_id = p_workspace_id;
  
  RETURN COALESCE(user_role, 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function pour créer automatiquement un workspace personnalisé lors de la création d'une org
-- Le workspace aura le nom de l'utilisateur connecté (ex: "John's Workspace")
-- ET l'utilisateur sera automatiquement ajouté comme owner
CREATE OR REPLACE FUNCTION create_default_workspace()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  workspace_name TEXT;
  workspace_slug TEXT;
  new_workspace_id UUID;
  current_user_id UUID;
BEGIN
  -- Récupérer l'ID de l'utilisateur connecté
  current_user_id := (auth.jwt() ->> 'sub')::UUID;
  
  -- Récupérer le prénom de l'utilisateur depuis auth.users
  SELECT 
    COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'first_name'),
      SPLIT_PART((auth.jwt() ->> 'email'), '@', 1)  -- Fallback: partie avant @ de l'email
    ) INTO user_name;
  
  -- Créer le nom du workspace personnalisé
  workspace_name := COALESCE(user_name, 'User') || '''s Workspace';
  
  -- Créer un slug basé sur le nom (remplacer espaces et caractères spéciaux)
  workspace_slug := LOWER(REGEXP_REPLACE(
    COALESCE(user_name, 'user'), 
    '[^a-zA-Z0-9]', 
    '-', 
    'g'
  )) || '-workspace';
  
  -- Insérer le workspace personnalisé
  INSERT INTO workspaces (organization_id, name, slug, description)
  VALUES (NEW.id, workspace_name, workspace_slug, 'Your personal workspace')
  RETURNING id INTO new_workspace_id;
  
  -- Ajouter l'utilisateur comme owner du workspace
  IF current_user_id IS NOT NULL THEN
    INSERT INTO workspace_members (user_id, workspace_id, role, joined_at, invitation_accepted_at)
    VALUES (current_user_id, new_workspace_id, 'owner', NOW(), NOW());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour créer le workspace par défaut
CREATE TRIGGER create_default_workspace_trigger
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION create_default_workspace();

-- Empêcher de rétrograder / supprimer le dernier owner d'un workspace
CREATE OR REPLACE FUNCTION prevent_last_owner_demotion()
RETURNS TRIGGER AS $$
DECLARE owner_count INT;
BEGIN
  IF (TG_OP = 'DELETE' AND OLD.role = 'owner') OR (TG_OP = 'UPDATE' AND OLD.role = 'owner' AND NEW.role <> 'owner') THEN
    SELECT COUNT(*) INTO owner_count FROM workspace_members
      WHERE workspace_id = OLD.workspace_id AND role = 'owner' AND user_id <> OLD.user_id;
    IF owner_count = 0 THEN
      RAISE EXCEPTION 'Cannot remove or demote the last owner of this workspace';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_last_owner_update ON workspace_members;
CREATE TRIGGER trg_prevent_last_owner_update
  BEFORE UPDATE OR DELETE ON workspace_members
  FOR EACH ROW EXECUTE FUNCTION prevent_last_owner_demotion();

-- ============================================================================
-- COMMENTAIRES ET DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE organizations IS 'Organisations principales (clients SaaS)';
COMMENT ON TABLE workspaces IS 'Espaces de travail au sein des organisations';
COMMENT ON TABLE workspace_members IS 'Relations utilisateurs-workspaces avec rôles (utilise auth.users)';
COMMENT ON TABLE workspace_invitations IS 'Invitations pour rejoindre un workspace';
COMMENT ON TABLE bots IS 'Bots/Agents IA créés dans les workspaces';
COMMENT ON TABLE knowledge_bases IS 'Bases de connaissances des workspaces';
COMMENT ON TABLE audit_logs IS 'Logs d''audit pour la traçabilité';
COMMENT ON TABLE role_change_logs IS 'Historique des changements de rôles';

COMMENT ON COLUMN workspace_members.user_id IS 'Référence vers auth.users(id) - utilisateurs Supabase';
COMMENT ON COLUMN workspace_members.role IS 'Rôle dans le workspace: owner, admin, member';
COMMENT ON COLUMN role_change_logs.scope IS 'Portée du changement: platform (app_metadata) ou workspace';

-- ============================================================================
-- DONNÉES D'EXEMPLE (OPTIONNEL - POUR LE DÉVELOPPEMENT)
-- ============================================================================

-- Insérer quelques organisations exemple
INSERT INTO organizations (name, domain, plan) VALUES
  ('Acme Corp', 'acme.com', 'enterprise'),
  ('StartupXYZ', 'startup.xyz', 'pro'),
  ('Solo Freelancer', 'Free.inb', 'starter')
ON CONFLICT DO NOTHING;

-- Note: Les utilisateurs sont maintenant gérés via auth.users
-- Les platform_role sont stockés dans auth.users.app_metadata
-- Les métadonnées utilisateur sont dans auth.users.user_metadata