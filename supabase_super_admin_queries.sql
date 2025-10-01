-- ============================================================================
-- REQUÊTES SQL POUR VOTRE CONFIGURATION SUPABASE
-- Structure détectée: raw_app_meta_data + is_super_admin column
-- ============================================================================

-- 1. AFFICHER TOUS LES UTILISATEURS AVEC LEURS MÉTADONNÉES
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at,
    is_super_admin,
    raw_app_meta_data,
    raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC;

-- 2. AFFICHER UNIQUEMENT LES SUPER ADMINS (2 méthodes)
-- Méthode A: Via la colonne is_super_admin
SELECT 
    id,
    email,
    created_at,
    is_super_admin,
    raw_app_meta_data->>'platform_role' as platform_role,
    raw_app_meta_data->>'assigned_at' as assigned_at
FROM auth.users
WHERE is_super_admin = true;

-- Méthode B: Via raw_app_meta_data
SELECT 
    id,
    email,
    created_at,
    is_super_admin,
    raw_app_meta_data->>'platform_role' as platform_role
FROM auth.users
WHERE raw_app_meta_data->>'platform_role' = 'super_admin';

-- 3. VÉRIFIER SI UN UTILISATEUR SPÉCIFIQUE EST SUPER ADMIN
SELECT 
    id,
    email,
    is_super_admin,
    raw_app_meta_data->>'platform_role' as role_in_metadata,
    CASE 
        WHEN is_super_admin = true OR raw_app_meta_data->>'platform_role' = 'super_admin' 
        THEN 'OUI' 
        ELSE 'NON' 
    END as is_super_admin_final
FROM auth.users
WHERE email = 'votre-email@example.com';

-- ============================================================================
-- ASSIGNER LE RÔLE SUPER_ADMIN
-- ============================================================================

-- 4. MÉTHODE RECOMMANDÉE: Utiliser les deux colonnes pour la redondance
UPDATE auth.users 
SET 
    is_super_admin = true,
    raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
        'platform_role', 'super_admin',
        'assigned_at', NOW()::text,
        'assigned_by', 'system'
    )
WHERE email = 'votre-email@example.com';

-- 5. MÉTHODE SIMPLE: Utiliser seulement is_super_admin
UPDATE auth.users 
SET is_super_admin = true
WHERE email = 'votre-email@example.com';

-- 6. MÉTHODE COMPLÈTE: Avec métadonnées détaillées
UPDATE auth.users 
SET 
    is_super_admin = true,
    raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
        'platform_role', 'super_admin',
        'assigned_at', NOW()::text,
        'assigned_by', 'system',
        'permissions', jsonb_build_array('all'),
        'source', 'manual_assignment'
    )
WHERE email = 'votre-email@example.com';

-- ============================================================================
-- SCRIPT D'ASSIGNATION SÉCURISÉ
-- ============================================================================

DO $$
DECLARE
    user_email TEXT := 'votre-email@example.com'; -- CHANGEZ CET EMAIL
    user_id UUID;
    current_super_admin BOOLEAN;
BEGIN
    -- Vérifier si l'utilisateur existe
    SELECT id, is_super_admin INTO user_id, current_super_admin
    FROM auth.users
    WHERE email = user_email;
    
    -- Si l'utilisateur n'existe pas
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'ERREUR: Utilisateur avec email % non trouvé. Créez d''abord le compte.', user_email;
    END IF;
    
    -- Si l'utilisateur est déjà super admin
    IF current_super_admin = true THEN
        RAISE NOTICE 'INFO: L''utilisateur % est déjà super admin', user_email;
        RETURN;
    END IF;
    
    -- Assigner le rôle super_admin
    UPDATE auth.users 
    SET 
        is_super_admin = true,
        raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
            'platform_role', 'super_admin',
            'assigned_at', NOW()::text,
            'assigned_by', 'system',
            'previous_status', COALESCE(current_super_admin::text, 'false')
        )
    WHERE id = user_id;
    
    RAISE NOTICE 'SUCCÈS: Super admin assigné à % (ID: %)', user_email, user_id;
    
    -- Afficher les nouvelles informations
    SELECT 
        email, 
        is_super_admin, 
        raw_app_meta_data 
    FROM auth.users 
    WHERE id = user_id;
    
END $$;

-- ============================================================================
-- GESTION ET MAINTENANCE
-- ============================================================================

-- 7. RETIRER LE RÔLE SUPER_ADMIN
UPDATE auth.users 
SET 
    is_super_admin = false,
    raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
        'platform_role', 'user',
        'revoked_at', NOW()::text,
        'revoked_by', 'system'
    )
WHERE email = 'ancien-admin@example.com';

-- 8. COMPTER LES SUPER ADMINS
SELECT 
    COUNT(*) as total_super_admins_column,
    COUNT(*) FILTER (WHERE raw_app_meta_data->>'platform_role' = 'super_admin') as total_super_admins_metadata
FROM auth.users
WHERE is_super_admin = true;

-- 9. AUDIT COMPLET DES RÔLES
SELECT 
    id,
    email,
    created_at,
    is_super_admin,
    raw_app_meta_data->>'platform_role' as role_in_metadata,
    CASE 
        WHEN is_super_admin = true AND raw_app_meta_data->>'platform_role' = 'super_admin' THEN 'COHÉRENT'
        WHEN is_super_admin = true AND (raw_app_meta_data->>'platform_role' IS NULL OR raw_app_meta_data->>'platform_role' != 'super_admin') THEN 'INCOHÉRENT - Colonne true, metadata false'
        WHEN is_super_admin = false AND raw_app_meta_data->>'platform_role' = 'super_admin' THEN 'INCOHÉRENT - Colonne false, metadata true'
        ELSE 'NORMAL'
    END as status_coherence
FROM auth.users
ORDER BY 
    is_super_admin DESC,
    created_at DESC;

-- 10. CORRIGER LES INCOHÉRENCES (si nécessaire)
-- Mettre à jour is_super_admin basé sur raw_app_meta_data
UPDATE auth.users 
SET is_super_admin = true
WHERE raw_app_meta_data->>'platform_role' = 'super_admin' 
AND is_super_admin = false;

-- Mettre à jour raw_app_meta_data basé sur is_super_admin
UPDATE auth.users 
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
    'platform_role', 'super_admin'
)
WHERE is_super_admin = true 
AND (raw_app_meta_data->>'platform_role' IS NULL OR raw_app_meta_data->>'platform_role' != 'super_admin');

-- ============================================================================
-- REQUÊTES UTILES POUR L'APPLICATION
-- ============================================================================

-- 11. Fonction pour vérifier si un utilisateur est super admin
CREATE OR REPLACE FUNCTION is_user_super_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    result BOOLEAN;
BEGIN
    SELECT 
        COALESCE(is_super_admin, false) OR 
        COALESCE(raw_app_meta_data->>'platform_role' = 'super_admin', false)
    INTO result
    FROM auth.users 
    WHERE email = user_email;
    
    RETURN COALESCE(result, false);
END;
$$ LANGUAGE plpgsql;

-- Utilisation: SELECT is_user_super_admin('admin@example.com');

-- 12. Fonction pour lister tous les super admins
CREATE OR REPLACE FUNCTION get_all_super_admins()
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    is_super_admin BOOLEAN,
    assigned_at TEXT,
    assigned_by TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.is_super_admin,
        u.raw_app_meta_data->>'assigned_at',
        u.raw_app_meta_data->>'assigned_by'
    FROM auth.users u
    WHERE u.is_super_admin = true 
       OR u.raw_app_meta_data->>'platform_role' = 'super_admin'
    ORDER BY u.created_at;
END;
$$ LANGUAGE plpgsql;

-- Utilisation: SELECT * FROM get_all_super_admins();

-- 13. REQUÊTE SIMPLE POUR VOTRE APPLICATION
-- Cette requête est optimale pour votre structure
SELECT 
    id,
    email,
    is_super_admin,
    raw_app_meta_data->>'platform_role' as platform_role,
    raw_app_meta_data->>'assigned_at' as assigned_at
FROM auth.users
WHERE is_super_admin = true
ORDER BY created_at;

-- ============================================================================
-- BACKUP ET SÉCURITÉ
-- ============================================================================

-- 14. Créer une sauvegarde avant modifications importantes
CREATE TABLE IF NOT EXISTS super_admin_backup AS
SELECT 
    id,
    email,
    is_super_admin,
    raw_app_meta_data,
    NOW() as backup_date
FROM auth.users
WHERE is_super_admin = true OR raw_app_meta_data->>'platform_role' = 'super_admin';

-- 15. Restaurer depuis la sauvegarde (si nécessaire)
-- UPDATE auth.users 
-- SET 
--     is_super_admin = b.is_super_admin,
--     raw_app_meta_data = b.raw_app_meta_data
-- FROM super_admin_backup b
-- WHERE auth.users.id = b.id;