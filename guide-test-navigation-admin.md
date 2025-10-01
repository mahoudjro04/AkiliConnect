# 🔐 Guide de Test : Navigation Admin & Super Admin

## ✅ **Résumé des améliorations apportées**

Votre application AkiliConnect a maintenant un **système complet de navigation pour les admins** avec les améliorations suivantes :

### **1. Détection automatique des rôles**
- ✅ **Super Admin** : Via `app_metadata.platform_role = "super_admin"` OU `is_super_admin = true`
- ✅ **Admin Organisation** : Via rôles workspace `owner` ou `admin`
- ✅ Remplacement de la détection hardcodée par email

### **2. Navigation dynamique dans la sidebar**
- ✅ Section **"Administration"** pour les super admins avec :
  - Dashboard Admin (`/admin`)
  - Organizations (`/admin/organizations`)
  - Users (`/admin/users`)
  - Workspaces (`/admin/workspaces`)
  - System Settings (`/admin/settings`)

- ✅ Section **"Organization"** pour les admins d'organisation avec :
  - Settings (`/organization/settings`)
  - Workspaces (`/organization/workspaces`)

### **3. Boutons d'accès rapide dans le menu utilisateur**
- ✅ **Super Admin** : Bouton "Admin Dashboard" avec badge "SA" rouge
- ✅ **Admin Org** : Bouton "Organisation" avec badge "A" bleu

## 🧪 **Comment tester**

### **Étape 1 : Assigner un super admin**
```sql
-- Dans Supabase SQL Editor, remplacez l'email par le vôtre
UPDATE auth.users 
SET 
    is_super_admin = true,
    raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
        'platform_role', 'super_admin',
        'assigned_at', NOW()::text,
        'assigned_by', 'system'
    )
WHERE email = 'VOTRE-EMAIL@example.com';
```

### **Étape 2 : Vérifications visuelles**

#### **2.1 Sidebar (Navigation gauche)**
- ✅ Connectez-vous avec votre compte super admin
- ✅ Vérifiez la présence de la section **"Administration"**
- ✅ Cliquez sur "Dashboard" pour accéder au dashboard admin

#### **2.2 Menu utilisateur (coin supérieur droit)**
- ✅ Cliquez sur votre avatar
- ✅ Vérifiez la présence du bouton **"Admin Dashboard"** avec badge rouge "SA"
- ✅ Cliquez dessus pour naviguer vers `/admin`

#### **2.3 Test admin d'organisation**
```sql
-- Créer un admin d'organisation (remplacez les IDs)
INSERT INTO workspace_members (user_id, workspace_id, role)
VALUES ('USER_ID', 'WORKSPACE_ID', 'admin');
```
- ✅ Connectez-vous avec ce compte
- ✅ Vérifiez la section "Organization" dans la sidebar
- ✅ Vérifiez le bouton "Organisation" dans le menu utilisateur

### **Étape 3 : Tests fonctionnels**

#### **3.1 Accès aux routes protégées**
- ✅ `/admin` - Dashboard super admin
- ✅ `/admin/organizations` - Gestion organisations
- ✅ `/admin/users` - Gestion utilisateurs
- ✅ `/organization/settings` - Paramètres organisation

#### **3.2 Restrictions d'accès**
- ✅ Utilisateur normal ne voit PAS les sections admin
- ✅ Admin org ne voit PAS la section super admin
- ✅ Tentative d'accès direct à `/admin` sans droits = erreur 403

## 🔍 **Vérification des permissions**

### **Hook `useUserPermissions`**
```typescript
const { 
  isSuperAdmin,      // true si super admin
  isOrgAdmin,        // true si admin organisation
  isWorkspaceAdmin,  // true si admin workspace
  canAccessAdminDashboard,  // true si peut accéder au dashboard admin
  platformRole,      // "super_admin" | null
  workspaceRole      // "owner" | "admin" | "member" | null
} = useUserPermissions()
```

### **Fonction de vérification**
```typescript
import { isSuperAdministrator } from "@/data/dynamic-navigations"

// Vérification côté composant
const isSuper = isSuperAdministrator(user)
```

## 🚨 **Dépannage**

### **Problème : Pas de section admin visible**
1. Vérifiez que l'utilisateur a bien le rôle super admin :
```sql
SELECT 
    email, 
    is_super_admin, 
    raw_app_meta_data->>'platform_role' 
FROM auth.users 
WHERE email = 'votre-email@example.com';
```

2. Actualisez la page ou reconnectez-vous

### **Problème : Erreur 403 sur `/admin`**
- Vérifiez les permissions via l'API :
```bash
curl -X GET http://localhost:3000/api/admin/check-access \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **Problème : Navigation ne s'affiche pas**
1. Vérifiez la console browser pour des erreurs JavaScript
2. Vérifiez que le hook `useUserPermissions` retourne les bonnes valeurs

## 📋 **Checklist finale**

- [ ] Super admin peut voir section "Administration" dans sidebar
- [ ] Super admin peut voir bouton "Admin Dashboard" dans menu utilisateur
- [ ] Admin organisation peut voir section "Organization" dans sidebar
- [ ] Admin organisation peut voir bouton "Organisation" dans menu utilisateur
- [ ] Utilisateur normal ne voit aucune section admin
- [ ] Navigation vers `/admin` fonctionne pour super admin
- [ ] Navigation vers `/organization/settings` fonctionne pour admin org
- [ ] Restrictions d'accès appliquées correctement

## 🎯 **Routes disponibles**

### **Super Admin**
- `/admin` - Dashboard principal
- `/admin/organizations` - Gestion organisations
- `/admin/users` - Gestion utilisateurs  
- `/admin/workspaces` - Gestion workspaces
- `/admin/settings` - Paramètres système

### **Admin Organisation**
- `/organization/settings` - Paramètres organisation
- `/organization/workspaces` - Workspaces de l'organisation

Votre système de navigation admin est maintenant **pleinement fonctionnel** ! 🚀