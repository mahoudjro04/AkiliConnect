-- ============================================================================
-- REQUÊTES SQL COMPLÈTES POUR TOUTES LES TABLES AKILICONNECT
-- ============================================================================

-- ============================================================================
-- 1. GESTION DES ORGANISATIONS
-- ============================================================================

-- Créer une nouvelle organisation
INSERT INTO organizations (name, domain, plan, status, settings)
VALUES (
    'Mon Entreprise',
    'monentreprise.com',
    'pro',
    'active',
    '{"timezone": "Europe/Paris", "currency": "EUR"}'::jsonb
);

-- Lister toutes les organisations
SELECT 
    id,
    name,
    domain,
    plan,
    status,
    settings,
    created_at,
    updated_at
FROM organizations
ORDER BY created_at DESC;

-- Mettre à jour une organisation
UPDATE organizations 
SET 
    plan = 'enterprise',
    settings = settings || '{"max_workspaces": 50}'::jsonb,
    updated_at = NOW()
WHERE id = 'organization_uuid_here';

-- Supprimer une organisation (ATTENTION: supprime tout en cascade)
DELETE FROM organizations WHERE id = 'organization_uuid_here';

-- Statistiques des organisations par plan
SELECT 
    plan,
    status,
    COUNT(*) as count
FROM organizations
GROUP BY plan, status
ORDER BY plan, status;

-- ============================================================================
-- 2. GESTION DES WORKSPACES
-- ============================================================================

-- Créer un nouveau workspace
INSERT INTO workspaces (organization_id, name, slug, description, settings)
VALUES (
    'organization_uuid_here',
    'Équipe Marketing',
    'equipe-marketing',
    'Workspace pour l''équipe marketing',
    '{"theme": "light", "notifications": true}'::jsonb
);

-- Lister tous les workspaces d'une organisation
SELECT 
    w.id,
    w.name,
    w.slug,
    w.description,
    w.settings,
    w.created_at,
    o.name as organization_name,
    COUNT(wm.id) as member_count
FROM workspaces w
JOIN organizations o ON w.organization_id = o.id
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
WHERE w.organization_id = 'organization_uuid_here'
GROUP BY w.id, w.name, w.slug, w.description, w.settings, w.created_at, o.name
ORDER BY w.created_at DESC;

-- Workspaces auxquels un utilisateur appartient
SELECT 
    w.id,
    w.name,
    w.slug,
    o.name as organization_name,
    wm.role,
    wm.joined_at
FROM workspaces w
JOIN organizations o ON w.organization_id = o.id
JOIN workspace_members wm ON w.id = wm.workspace_id
WHERE wm.user_id = 'user_uuid_here'
ORDER BY wm.joined_at DESC;

-- Mettre à jour un workspace
UPDATE workspaces 
SET 
    name = 'Nouveau nom',
    description = 'Nouvelle description',
    settings = settings || '{"new_setting": "value"}'::jsonb,
    updated_at = NOW()
WHERE id = 'workspace_uuid_here';

-- Supprimer un workspace
DELETE FROM workspaces WHERE id = 'workspace_uuid_here';

-- ============================================================================
-- 3. GESTION DES MEMBRES DE WORKSPACE
-- ============================================================================

-- Ajouter un membre à un workspace
INSERT INTO workspace_members (user_id, workspace_id, role, invited_by, invitation_accepted_at)
VALUES (
    'user_uuid_here',
    'workspace_uuid_here',
    'member',
    'inviter_user_uuid_here',
    NOW()
);

-- Lister tous les membres d'un workspace avec leurs infos
SELECT 
    u.id as user_id,
    u.email,
    u.raw_user_meta_data->>'display_name' as display_name,
    wm.role,
    wm.joined_at,
    wm.invitation_accepted_at,
    inviter.email as invited_by_email
FROM workspace_members wm
JOIN auth.users u ON wm.user_id = u.id
LEFT JOIN auth.users inviter ON wm.invited_by = inviter.id
WHERE wm.workspace_id = 'workspace_uuid_here'
ORDER BY wm.joined_at DESC;

-- Changer le rôle d'un membre
UPDATE workspace_members 
SET role = 'admin'
WHERE user_id = 'user_uuid_here' 
AND workspace_id = 'workspace_uuid_here';

-- Retirer un membre d'un workspace
DELETE FROM workspace_members 
WHERE user_id = 'user_uuid_here' 
AND workspace_id = 'workspace_uuid_here';

-- Statistiques des rôles dans un workspace
SELECT 
    role,
    COUNT(*) as count
FROM workspace_members 
WHERE workspace_id = 'workspace_uuid_here'
GROUP BY role
ORDER BY count DESC;

-- Trouver tous les workspaces où un utilisateur est admin ou owner
SELECT 
    w.id,
    w.name,
    o.name as organization_name,
    wm.role
FROM workspace_members wm
JOIN workspaces w ON wm.workspace_id = w.id
JOIN organizations o ON w.organization_id = o.id
WHERE wm.user_id = 'user_uuid_here' 
AND wm.role IN ('admin', 'owner')
ORDER BY w.name;

-- ============================================================================
-- 4. GESTION DES INVITATIONS
-- ============================================================================

-- Créer une invitation
INSERT INTO workspace_invitations (workspace_id, email, role, invited_by, token, expires_at)
VALUES (
    'workspace_uuid_here',
    'nouveau@example.com',
    'member',
    'inviter_uuid_here',
    encode(gen_random_bytes(32), 'base64'),
    NOW() + INTERVAL '7 days'
);

-- Lister les invitations en attente pour un workspace
SELECT 
    wi.id,
    wi.email,
    wi.role,
    wi.expires_at,
    wi.created_at,
    u.email as invited_by_email,
    w.name as workspace_name
FROM workspace_invitations wi
JOIN auth.users u ON wi.invited_by = u.id
JOIN workspaces w ON wi.workspace_id = w.id
WHERE wi.workspace_id = 'workspace_uuid_here'
AND wi.accepted_at IS NULL
AND wi.expires_at > NOW()
ORDER BY wi.created_at DESC;

-- Accepter une invitation
UPDATE workspace_invitations 
SET accepted_at = NOW()
WHERE token = 'invitation_token_here'
AND expires_at > NOW()
AND accepted_at IS NULL;

-- Supprimer les invitations expirées
DELETE FROM workspace_invitations 
WHERE expires_at < NOW() 
AND accepted_at IS NULL;

-- Révoquer une invitation
DELETE FROM workspace_invitations 
WHERE id = 'invitation_uuid_here'
AND accepted_at IS NULL;

-- ============================================================================
-- 5. GESTION DES BOTS/AGENTS IA
-- ============================================================================

-- Créer un nouveau bot
INSERT INTO bots (workspace_id, name, description, type, configuration, created_by)
VALUES (
    'workspace_uuid_here',
    'Assistant Marketing',
    'Bot pour automatiser les tâches marketing',
    'chatbot',
    '{
        "model": "gpt-4",
        "temperature": 0.7,
        "max_tokens": 1000,
        "personality": "professional"
    }'::jsonb,
    'user_uuid_here'
);

-- Lister tous les bots d'un workspace
SELECT 
    b.id,
    b.name,
    b.description,
    b.type,
    b.configuration,
    b.is_active,
    b.created_at,
    u.email as created_by_email,
    w.name as workspace_name
FROM bots b
JOIN auth.users u ON b.created_by = u.id
JOIN workspaces w ON b.workspace_id = w.id
WHERE b.workspace_id = 'workspace_uuid_here'
ORDER BY b.created_at DESC;

-- Mettre à jour la configuration d'un bot
UPDATE bots 
SET 
    configuration = configuration || '{"new_parameter": "value"}'::jsonb,
    updated_at = NOW()
WHERE id = 'bot_uuid_here';

-- Activer/désactiver un bot
UPDATE bots 
SET is_active = false
WHERE id = 'bot_uuid_here';

-- Supprimer un bot
DELETE FROM bots WHERE id = 'bot_uuid_here';

-- Statistiques des bots par type
SELECT 
    type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_active = true) as active_count
FROM bots 
WHERE workspace_id = 'workspace_uuid_here'
GROUP BY type
ORDER BY total DESC;

-- ============================================================================
-- 6. GESTION DES KNOWLEDGE BASES
-- ============================================================================

-- Créer une nouvelle knowledge base
INSERT INTO knowledge_bases (workspace_id, name, description, settings, created_by)
VALUES (
    'workspace_uuid_here',
    'Documentation Produit',
    'Base de connaissances pour la documentation produit',
    '{
        "indexing": "automatic",
        "similarity_threshold": 0.8,
        "chunk_size": 1000
    }'::jsonb,
    'user_uuid_here'
);

-- Lister toutes les knowledge bases d'un workspace
SELECT 
    kb.id,
    kb.name,
    kb.description,
    kb.settings,
    kb.created_at,
    u.email as created_by_email,
    w.name as workspace_name
FROM knowledge_bases kb
JOIN auth.users u ON kb.created_by = u.id
JOIN workspaces w ON kb.workspace_id = w.id
WHERE kb.workspace_id = 'workspace_uuid_here'
ORDER BY kb.created_at DESC;

-- Mettre à jour une knowledge base
UPDATE knowledge_bases 
SET 
    name = 'Nouveau nom',
    description = 'Nouvelle description',
    settings = settings || '{"auto_update": true}'::jsonb,
    updated_at = NOW()
WHERE id = 'kb_uuid_here';

-- Supprimer une knowledge base
DELETE FROM knowledge_bases WHERE id = 'kb_uuid_here';

-- ============================================================================
-- 7. AUDIT ET LOGS
-- ============================================================================

-- Insérer un log d'audit
INSERT INTO audit_logs (workspace_id, user_id, action, resource_type, resource_id, metadata, ip_address, user_agent)
VALUES (
    'workspace_uuid_here',
    'user_uuid_here',
    'bot_created',
    'bot',
    'bot_uuid_here',
    '{"bot_name": "Assistant Marketing", "bot_type": "chatbot"}'::jsonb,
    '192.168.1.1'::inet,
    'Mozilla/5.0...'
);

-- Consulter les logs d'audit d'un workspace
SELECT 
    al.id,
    al.action,
    al.resource_type,
    al.resource_id,
    al.metadata,
    al.ip_address,
    al.created_at,
    u.email as user_email
FROM audit_logs al
LEFT JOIN auth.users u ON al.user_id = u.id
WHERE al.workspace_id = 'workspace_uuid_here'
ORDER BY al.created_at DESC
LIMIT 100;

-- Logs d'audit par action
SELECT 
    action,
    COUNT(*) as count,
    MAX(created_at) as last_occurrence
FROM audit_logs 
WHERE workspace_id = 'workspace_uuid_here'
AND created_at > NOW() - INTERVAL '30 days'
GROUP BY action
ORDER BY count DESC;

-- Nettoyer les anciens logs (plus de 90 jours)
DELETE FROM audit_logs 
WHERE created_at < NOW() - INTERVAL '90 days';

-- ============================================================================
-- 8. HISTORIQUE DES CHANGEMENTS DE RÔLES
-- ============================================================================

-- Enregistrer un changement de rôle
INSERT INTO role_change_logs (scope, workspace_id, target_user_id, actor_user_id, old_role, new_role, reason)
VALUES (
    'workspace',
    'workspace_uuid_here',
    'target_user_uuid',
    'actor_user_uuid',
    'member',
    'admin',
    'Promotion due to good performance'
);

-- Consulter l'historique des changements de rôles
SELECT 
    rcl.id,
    rcl.scope,
    target_user.email as target_user_email,
    actor_user.email as actor_user_email,
    rcl.old_role,
    rcl.new_role,
    rcl.reason,
    rcl.created_at,
    w.name as workspace_name
FROM role_change_logs rcl
LEFT JOIN auth.users target_user ON rcl.target_user_id = target_user.id
LEFT JOIN auth.users actor_user ON rcl.actor_user_id = actor_user.id
LEFT JOIN workspaces w ON rcl.workspace_id = w.id
WHERE rcl.workspace_id = 'workspace_uuid_here'
ORDER BY rcl.created_at DESC;

-- ============================================================================
-- 9. REQUÊTES COMPLEXES ET RAPPORTS
-- ============================================================================

-- Rapport complet d'un workspace
SELECT 
    w.id as workspace_id,
    w.name as workspace_name,
    o.name as organization_name,
    COUNT(DISTINCT wm.user_id) as total_members,
    COUNT(DISTINCT b.id) as total_bots,
    COUNT(DISTINCT kb.id) as total_knowledge_bases,
    COUNT(DISTINCT wi.id) as pending_invitations
FROM workspaces w
JOIN organizations o ON w.organization_id = o.id
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
LEFT JOIN bots b ON w.id = b.workspace_id
LEFT JOIN knowledge_bases kb ON w.id = kb.workspace_id
LEFT JOIN workspace_invitations wi ON w.id = wi.workspace_id AND wi.accepted_at IS NULL
WHERE w.id = 'workspace_uuid_here'
GROUP BY w.id, w.name, o.name;

-- Utilisateurs les plus actifs (basé sur les logs d'audit)
SELECT 
    u.email,
    COUNT(al.id) as activity_count,
    MAX(al.created_at) as last_activity,
    array_agg(DISTINCT al.action) as actions_performed
FROM audit_logs al
JOIN auth.users u ON al.user_id = u.id
WHERE al.workspace_id = 'workspace_uuid_here'
AND al.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.id, u.email
ORDER BY activity_count DESC
LIMIT 10;

-- Workspaces avec le plus de membres
SELECT 
    w.name,
    o.name as organization_name,
    COUNT(wm.user_id) as member_count,
    w.created_at
FROM workspaces w
JOIN organizations o ON w.organization_id = o.id
JOIN workspace_members wm ON w.id = wm.workspace_id
GROUP BY w.id, w.name, o.name, w.created_at
ORDER BY member_count DESC
LIMIT 10;

-- ============================================================================
-- 10. FONCTIONS UTILITAIRES
-- ============================================================================

-- Fonction pour vérifier si un utilisateur a accès à un workspace
CREATE OR REPLACE FUNCTION user_has_workspace_access(p_user_id UUID, p_workspace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM workspace_members 
        WHERE user_id = p_user_id 
        AND workspace_id = p_workspace_id
    );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir le rôle d'un utilisateur dans un workspace
CREATE OR REPLACE FUNCTION get_user_workspace_role(p_user_id UUID, p_workspace_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM workspace_members 
    WHERE user_id = p_user_id 
    AND workspace_id = p_workspace_id;
    
    RETURN COALESCE(user_role, 'none');
END;
$$ LANGUAGE plpgsql;

-- Fonction pour nettoyer les invitations expirées
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM workspace_invitations 
    WHERE expires_at < NOW() 
    AND accepted_at IS NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Utilisation des fonctions
SELECT user_has_workspace_access('user_uuid', 'workspace_uuid');
SELECT get_user_workspace_role('user_uuid', 'workspace_uuid');
SELECT cleanup_expired_invitations();

-- ============================================================================
-- 11. VUES UTILES
-- ============================================================================

-- Vue pour les informations complètes des workspaces
CREATE OR REPLACE VIEW workspace_details AS
SELECT 
    w.id,
    w.name,
    w.slug,
    w.description,
    w.settings,
    w.created_at,
    w.updated_at,
    o.name as organization_name,
    o.plan as organization_plan,
    COUNT(DISTINCT wm.user_id) as member_count,
    COUNT(DISTINCT b.id) as bot_count,
    COUNT(DISTINCT kb.id) as knowledge_base_count
FROM workspaces w
JOIN organizations o ON w.organization_id = o.id
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
LEFT JOIN bots b ON w.id = b.workspace_id AND b.is_active = true
LEFT JOIN knowledge_bases kb ON w.id = kb.workspace_id
GROUP BY w.id, w.name, w.slug, w.description, w.settings, w.created_at, w.updated_at, o.name, o.plan;

-- Vue pour les membres avec leurs informations complètes
CREATE OR REPLACE VIEW workspace_members_details AS
SELECT 
    wm.workspace_id,
    wm.user_id,
    wm.role,
    wm.joined_at,
    u.email,
    u.raw_user_meta_data->>'display_name' as display_name,
    u.raw_user_meta_data->>'avatar_url' as avatar_url,
    u.is_super_admin,
    w.name as workspace_name,
    o.name as organization_name
FROM workspace_members wm
JOIN auth.users u ON wm.user_id = u.id
JOIN workspaces w ON wm.workspace_id = w.id
JOIN organizations o ON w.organization_id = o.id;

-- Utilisation des vues
SELECT * FROM workspace_details WHERE organization_name = 'Mon Entreprise';
SELECT * FROM workspace_members_details WHERE workspace_id = 'workspace_uuid_here';

-- ============================================================================
-- 12. MAINTENANCE ET OPTIMISATION
-- ============================================================================

-- Créer des index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_workspace_members_composite ON workspace_members(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_bots_workspace_active ON bots(workspace_id, is_active);
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_date ON audit_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_token_expires ON workspace_invitations(token, expires_at);

-- Analyser les statistiques des tables
ANALYZE organizations;
ANALYZE workspaces;
ANALYZE workspace_members;
ANALYZE bots;
ANALYZE knowledge_bases;
ANALYZE audit_logs;

-- Vacuum pour optimiser l'espace disque
VACUUM ANALYZE audit_logs;