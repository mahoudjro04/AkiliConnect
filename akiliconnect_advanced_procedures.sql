-- ============================================================================
-- PROCÉDURES STOCKÉES ET REQUÊTES AVANCÉES AKILICONNECT
-- ============================================================================

-- ============================================================================
-- 1. PROCÉDURES POUR LA GESTION DES WORKSPACES
-- ============================================================================

-- Procédure pour créer un workspace complet avec owner
CREATE OR REPLACE FUNCTION create_workspace_with_owner(
    p_organization_id UUID,
    p_workspace_name TEXT,
    p_workspace_slug TEXT,
    p_workspace_description TEXT,
    p_owner_user_id UUID,
    p_settings JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    new_workspace_id UUID;
BEGIN
    -- Créer le workspace
    INSERT INTO workspaces (organization_id, name, slug, description, settings)
    VALUES (p_organization_id, p_workspace_name, p_workspace_slug, p_workspace_description, p_settings)
    RETURNING id INTO new_workspace_id;
    
    -- Ajouter l'owner
    INSERT INTO workspace_members (user_id, workspace_id, role, joined_at, invitation_accepted_at)
    VALUES (p_owner_user_id, new_workspace_id, 'owner', NOW(), NOW());
    
    -- Log de l'action
    INSERT INTO audit_logs (workspace_id, user_id, action, resource_type, resource_id, metadata)
    VALUES (
        new_workspace_id, 
        p_owner_user_id, 
        'workspace_created', 
        'workspace', 
        new_workspace_id,
        jsonb_build_object('workspace_name', p_workspace_name)
    );
    
    RETURN new_workspace_id;
END;
$$ LANGUAGE plpgsql;

-- Utilisation:
-- SELECT create_workspace_with_owner('org_id', 'Mon Workspace', 'mon-workspace', 'Description', 'user_id');

-- ============================================================================
-- 2. PROCÉDURES POUR LA GESTION DES INVITATIONS
-- ============================================================================

-- Procédure pour inviter un utilisateur avec validation
CREATE OR REPLACE FUNCTION invite_user_to_workspace(
    p_workspace_id UUID,
    p_email TEXT,
    p_role TEXT,
    p_invited_by UUID,
    p_expires_in_days INTEGER DEFAULT 7
)
RETURNS TEXT AS $$
DECLARE
    invitation_token TEXT;
    existing_member UUID;
    existing_invitation UUID;
BEGIN
    -- Vérifier si l'utilisateur est déjà membre
    SELECT user_id INTO existing_member
    FROM workspace_members wm
    JOIN auth.users u ON wm.user_id = u.id
    WHERE wm.workspace_id = p_workspace_id AND u.email = p_email;
    
    IF existing_member IS NOT NULL THEN
        RAISE EXCEPTION 'Utilisateur % est déjà membre du workspace', p_email;
    END IF;
    
    -- Vérifier s'il y a déjà une invitation en attente
    SELECT id INTO existing_invitation
    FROM workspace_invitations
    WHERE workspace_id = p_workspace_id 
    AND email = p_email 
    AND accepted_at IS NULL 
    AND expires_at > NOW();
    
    IF existing_invitation IS NOT NULL THEN
        RAISE EXCEPTION 'Une invitation est déjà en attente pour %', p_email;
    END IF;
    
    -- Générer un token unique
    invitation_token := encode(gen_random_bytes(32), 'base64');
    
    -- Créer l'invitation
    INSERT INTO workspace_invitations (workspace_id, email, role, invited_by, token, expires_at)
    VALUES (
        p_workspace_id, 
        p_email, 
        p_role, 
        p_invited_by, 
        invitation_token, 
        NOW() + (p_expires_in_days || ' days')::interval
    );
    
    -- Log de l'action
    INSERT INTO audit_logs (workspace_id, user_id, action, resource_type, metadata)
    VALUES (
        p_workspace_id, 
        p_invited_by, 
        'user_invited', 
        'invitation',
        jsonb_build_object('invited_email', p_email, 'role', p_role)
    );
    
    RETURN invitation_token;
END;
$$ LANGUAGE plpgsql;

-- Procédure pour accepter une invitation
CREATE OR REPLACE FUNCTION accept_workspace_invitation(
    p_token TEXT,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    invitation_record RECORD;
BEGIN
    -- Récupérer l'invitation
    SELECT * INTO invitation_record
    FROM workspace_invitations
    WHERE token = p_token
    AND accepted_at IS NULL
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invitation invalide ou expirée';
    END IF;
    
    -- Vérifier que l'email correspond
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = p_user_id 
        AND email = invitation_record.email
    ) THEN
        RAISE EXCEPTION 'Email ne correspond pas à l''invitation';
    END IF;
    
    -- Ajouter l'utilisateur au workspace
    INSERT INTO workspace_members (user_id, workspace_id, role, invited_by, joined_at, invitation_accepted_at)
    VALUES (
        p_user_id, 
        invitation_record.workspace_id, 
        invitation_record.role, 
        invitation_record.invited_by, 
        NOW(), 
        NOW()
    );
    
    -- Marquer l'invitation comme acceptée
    UPDATE workspace_invitations 
    SET accepted_at = NOW()
    WHERE id = invitation_record.id;
    
    -- Log de l'action
    INSERT INTO audit_logs (workspace_id, user_id, action, resource_type, metadata)
    VALUES (
        invitation_record.workspace_id, 
        p_user_id, 
        'invitation_accepted', 
        'workspace_member',
        jsonb_build_object('role', invitation_record.role)
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. GESTION AVANCÉE DES PERMISSIONS
-- ============================================================================

-- Fonction pour vérifier les permissions détaillées
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id UUID,
    p_workspace_id UUID,
    p_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    is_super_admin BOOLEAN;
BEGIN
    -- Vérifier si l'utilisateur est super admin
    SELECT COALESCE(raw_app_meta_data->>'platform_role' = 'super_admin', false) OR COALESCE(is_super_admin, false)
    INTO is_super_admin
    FROM auth.users
    WHERE id = p_user_id;
    
    IF is_super_admin THEN
        RETURN TRUE;
    END IF;
    
    -- Récupérer le rôle dans le workspace
    SELECT role INTO user_role
    FROM workspace_members
    WHERE user_id = p_user_id AND workspace_id = p_workspace_id;
    
    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Vérifier les permissions selon le rôle et l'action
    RETURN CASE 
        WHEN user_role = 'owner' THEN TRUE
        WHEN user_role = 'admin' AND p_permission IN (
            'manage_members', 'create_bot', 'edit_bot', 'delete_bot', 
            'create_kb', 'edit_kb', 'delete_kb', 'view_audit'
        ) THEN TRUE
        WHEN user_role = 'member' AND p_permission IN (
            'view_workspace', 'use_bot', 'view_kb'
        ) THEN TRUE
        ELSE FALSE
    END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. STATISTIQUES ET RAPPORTS AVANCÉS
-- ============================================================================

-- Fonction pour générer un rapport d'activité
CREATE OR REPLACE FUNCTION generate_workspace_activity_report(
    p_workspace_id UUID,
    p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
    metric TEXT,
    count BIGINT,
    details JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'total_actions'::TEXT,
        COUNT(*)::BIGINT,
        jsonb_build_object('period_days', p_days_back)
    FROM audit_logs
    WHERE workspace_id = p_workspace_id
    AND created_at > NOW() - (p_days_back || ' days')::interval
    
    UNION ALL
    
    SELECT 
        'unique_users'::TEXT,
        COUNT(DISTINCT user_id)::BIGINT,
        jsonb_build_object('period_days', p_days_back)
    FROM audit_logs
    WHERE workspace_id = p_workspace_id
    AND created_at > NOW() - (p_days_back || ' days')::interval
    AND user_id IS NOT NULL
    
    UNION ALL
    
    SELECT 
        'bot_creations'::TEXT,
        COUNT(*)::BIGINT,
        jsonb_build_object('period_days', p_days_back)
    FROM audit_logs
    WHERE workspace_id = p_workspace_id
    AND action = 'bot_created'
    AND created_at > NOW() - (p_days_back || ' days')::interval
    
    UNION ALL
    
    SELECT 
        'new_members'::TEXT,
        COUNT(*)::BIGINT,
        jsonb_build_object('period_days', p_days_back)
    FROM workspace_members
    WHERE workspace_id = p_workspace_id
    AND joined_at > NOW() - (p_days_back || ' days')::interval;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. MAINTENANCE AUTOMATIQUE
-- ============================================================================

-- Procédure de nettoyage automatique
CREATE OR REPLACE FUNCTION cleanup_workspace_data(
    p_workspace_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    expired_invitations INTEGER;
    old_audit_logs INTEGER;
    result JSONB;
BEGIN
    -- Nettoyer les invitations expirées
    DELETE FROM workspace_invitations 
    WHERE (p_workspace_id IS NULL OR workspace_id = p_workspace_id)
    AND expires_at < NOW() 
    AND accepted_at IS NULL;
    GET DIAGNOSTICS expired_invitations = ROW_COUNT;
    
    -- Nettoyer les anciens logs d'audit (plus de 90 jours)
    DELETE FROM audit_logs 
    WHERE (p_workspace_id IS NULL OR workspace_id = p_workspace_id)
    AND created_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS old_audit_logs = ROW_COUNT;
    
    result := jsonb_build_object(
        'expired_invitations_cleaned', expired_invitations,
        'old_audit_logs_cleaned', old_audit_logs,
        'cleaned_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. TRIGGERS POUR AUDIT AUTOMATIQUE
-- ============================================================================

-- Fonction trigger pour audit automatique des changements de rôles
CREATE OR REPLACE FUNCTION audit_role_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Pour les changements de rôle dans workspace_members
    IF TG_TABLE_NAME = 'workspace_members' THEN
        IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
            INSERT INTO role_change_logs (scope, workspace_id, target_user_id, old_role, new_role)
            VALUES ('workspace', NEW.workspace_id, NEW.user_id, OLD.role, NEW.role);
        END IF;
    END IF;
    
    -- Pour les changements dans auth.users (platform roles)
    IF TG_TABLE_NAME = 'users' AND TG_TABLE_SCHEMA = 'auth' THEN
        IF TG_OP = 'UPDATE' AND 
           (OLD.raw_app_meta_data->>'platform_role') IS DISTINCT FROM (NEW.raw_app_meta_data->>'platform_role') THEN
            INSERT INTO role_change_logs (scope, target_user_id, old_role, new_role)
            VALUES (
                'platform', 
                NEW.id, 
                COALESCE(OLD.raw_app_meta_data->>'platform_role', 'user'),
                COALESCE(NEW.raw_app_meta_data->>'platform_role', 'user')
            );
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Créer les triggers
DROP TRIGGER IF EXISTS workspace_members_role_audit ON workspace_members;
CREATE TRIGGER workspace_members_role_audit
    AFTER UPDATE ON workspace_members
    FOR EACH ROW
    EXECUTE FUNCTION audit_role_changes();

DROP TRIGGER IF EXISTS auth_users_role_audit ON auth.users;
CREATE TRIGGER auth_users_role_audit
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION audit_role_changes();

-- ============================================================================
-- 7. REQUÊTES DE MIGRATION ET SETUP
-- ============================================================================

-- Procédure pour initialiser un nouvel environnement
CREATE OR REPLACE FUNCTION setup_initial_data(
    p_admin_email TEXT,
    p_org_name TEXT,
    p_workspace_name TEXT
)
RETURNS JSONB AS $$
DECLARE
    admin_user_id UUID;
    org_id UUID;
    workspace_id UUID;
    result JSONB;
BEGIN
    -- Trouver l'utilisateur admin
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = p_admin_email;
    
    IF admin_user_id IS NULL THEN
        RAISE EXCEPTION 'Utilisateur admin % non trouvé', p_admin_email;
    END IF;
    
    -- Assigner super admin si pas déjà fait
    UPDATE auth.users 
    SET 
        is_super_admin = true,
        raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
            'platform_role', 'super_admin',
            'assigned_at', NOW()::text,
            'assigned_by', 'setup'
        )
    WHERE id = admin_user_id
    AND (is_super_admin IS NOT TRUE OR raw_app_meta_data->>'platform_role' != 'super_admin');
    
    -- Créer l'organisation
    INSERT INTO organizations (name, plan, status)
    VALUES (p_org_name, 'pro', 'active')
    RETURNING id INTO org_id;
    
    -- Créer le workspace principal
    SELECT create_workspace_with_owner(
        org_id, 
        p_workspace_name, 
        lower(replace(p_workspace_name, ' ', '-')), 
        'Workspace principal', 
        admin_user_id
    ) INTO workspace_id;
    
    result := jsonb_build_object(
        'admin_user_id', admin_user_id,
        'organization_id', org_id,
        'workspace_id', workspace_id,
        'setup_completed_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. REQUÊTES D'ANALYSE DE PERFORMANCE
-- ============================================================================

-- Analyser l'utilisation des workspaces
CREATE OR REPLACE VIEW workspace_usage_stats AS
SELECT 
    w.id,
    w.name,
    o.name as organization_name,
    COUNT(DISTINCT wm.user_id) as member_count,
    COUNT(DISTINCT b.id) as bot_count,
    COUNT(DISTINCT kb.id) as kb_count,
    COUNT(DISTINCT al.id) as activity_count_30d,
    MAX(al.created_at) as last_activity,
    w.created_at
FROM workspaces w
JOIN organizations o ON w.organization_id = o.id
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
LEFT JOIN bots b ON w.id = b.workspace_id
LEFT JOIN knowledge_bases kb ON w.id = kb.workspace_id
LEFT JOIN audit_logs al ON w.id = al.workspace_id AND al.created_at > NOW() - INTERVAL '30 days'
GROUP BY w.id, w.name, o.name, w.created_at;

-- Analyser les utilisateurs les plus actifs
CREATE OR REPLACE VIEW user_activity_stats AS
SELECT 
    u.id,
    u.email,
    u.raw_user_meta_data->>'display_name' as display_name,
    COUNT(DISTINCT wm.workspace_id) as workspace_count,
    COUNT(DISTINCT al.id) as activity_count_30d,
    MAX(al.created_at) as last_activity,
    array_agg(DISTINCT wm.role) as roles
FROM auth.users u
LEFT JOIN workspace_members wm ON u.id = wm.user_id
LEFT JOIN audit_logs al ON u.id = al.user_id AND al.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.id, u.email, u.raw_user_meta_data->>'display_name';

-- ============================================================================
-- 9. PROCÉDURES DE BACKUP
-- ============================================================================

-- Créer une sauvegarde complète des données critiques
CREATE OR REPLACE FUNCTION create_workspace_backup(p_workspace_id UUID)
RETURNS JSONB AS $$
DECLARE
    backup_data JSONB;
BEGIN
    SELECT jsonb_build_object(
        'workspace', (SELECT row_to_json(w.*) FROM workspaces w WHERE w.id = p_workspace_id),
        'members', (SELECT jsonb_agg(row_to_json(wm.*)) FROM workspace_members wm WHERE wm.workspace_id = p_workspace_id),
        'bots', (SELECT jsonb_agg(row_to_json(b.*)) FROM bots b WHERE b.workspace_id = p_workspace_id),
        'knowledge_bases', (SELECT jsonb_agg(row_to_json(kb.*)) FROM knowledge_bases kb WHERE kb.workspace_id = p_workspace_id),
        'backup_created_at', NOW()
    ) INTO backup_data;
    
    RETURN backup_data;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. UTILISATION DES PROCÉDURES
-- ============================================================================

-- Exemples d'utilisation:

-- 1. Créer un workspace complet
-- SELECT create_workspace_with_owner('org_id', 'Marketing Team', 'marketing-team', 'Équipe Marketing', 'user_id');

-- 2. Inviter un utilisateur
-- SELECT invite_user_to_workspace('workspace_id', 'user@example.com', 'member', 'inviter_id', 7);

-- 3. Accepter une invitation
-- SELECT accept_workspace_invitation('token_here', 'user_id');

-- 4. Vérifier une permission
-- SELECT check_user_permission('user_id', 'workspace_id', 'create_bot');

-- 5. Générer un rapport d'activité
-- SELECT * FROM generate_workspace_activity_report('workspace_id', 30);

-- 6. Nettoyer les données
-- SELECT cleanup_workspace_data('workspace_id');

-- 7. Setup initial
-- SELECT setup_initial_data('admin@example.com', 'Mon Entreprise', 'Workspace Principal');

-- 8. Créer un backup
-- SELECT create_workspace_backup('workspace_id');