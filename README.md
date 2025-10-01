# 🚀 AkiliConnect

**AkiliConnect** est une plateforme moderne de gestion collaborative conçue pour connecter les équipes, gérer les organisations et optimiser les flux de travail. Construite avec Next.js 15 et Supabase, elle offre une expérience utilisateur exceptionnelle avec des fonctionnalités avancées d'administration et de collaboration.

## ✨ Fonctionnalités Principales

### 🏢 Gestion d'Organisation
- **Multi-tenant** : Support pour plusieurs organisations
- **Espaces de travail** : Création et gestion d'espaces collaboratifs
- **Gestion des membres** : Invitation, rôles et permissions
- **Administration avancée** : Tableau de bord admin complet

### 👥 Collaboration
- **Invitations** : Système d'invitation par email
- **Rôles et permissions** : Contrôle d'accès granulaire
- **Tableaux de bord** : Analytics et métriques en temps réel
- **Interface multilingue** : Support i18n intégré

### 🛡️ Sécurité & Authentication
- **Supabase Auth** : Authentification sécurisée
- **Service Role** : Administration privilégiée
- **Sessions** : Gestion avancée des sessions utilisateur
- **Confirmation email** : Vérification des comptes

## 🛠️ Stack Technique

### Frontend
- **Next.js 15** - Framework React avec App Router
- **TypeScript** - Typage statique
- **Tailwind CSS** - Framework CSS utilitaire
- **shadcn/ui** - Composants UI modernes
- **Radix UI** - Primitives d'interface accessibles

### Backend & Base de Données
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Base de données relationnelle
- **Row Level Security** - Sécurité au niveau des lignes
- **Real-time** - Mises à jour en temps réel

### Outils de Développement
- **ESLint** - Linting de code
- **Prettier** - Formatage de code
- **TypeScript** - Vérification de types
- **pnpm** - Gestionnaire de paquets rapide

## 📋 Prérequis

- **Node.js** ≥ 22.0.0
- **pnpm** ≥ 10.0.0
- **Compte Supabase** (gratuit)

## 🚀 Installation

### 1. Cloner le projet
```bash
git clone https://github.com/mahoudjro04/AkiliConnect.git
cd AkiliConnect
```

### 2. Installer les dépendances
```bash
pnpm install
```

### 3. Configuration de l'environnement

Créez un fichier `.env.local` à la racine du projet :

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Authentication
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### 4. Configuration Supabase

1. Créez un nouveau projet sur [Supabase](https://supabase.com)
2. Exécutez les migrations SQL (voir `/sql` pour les schémas)
3. Configurez l'authentification par email
4. Activez Row Level Security

### 5. Lancer le serveur de développement
```bash
pnpm dev
```

L'application sera disponible sur [http://localhost:3000](http://localhost:3000)

## 📱 Scripts Disponibles

```bash
# Développement
pnpm dev          # Serveur de développement (avec Turbopack)
pnpm dev:turbo    # Serveur de développement optimisé

# Production
pnpm build        # Build de production
pnpm start        # Serveur de production

# Qualité de code
pnpm lint         # Vérification ESLint
pnpm lint:fix     # Correction automatique ESLint
pnpm format       # Formatage avec Prettier
```

## 🏗️ Structure du Projet

```
akiliConnect/
├── src/
│   ├── app/                    # App Router Next.js
│   │   ├── api/               # Routes API
│   │   │   ├── admin/         # APIs administration
│   │   │   ├── auth/          # Authentification
│   │   │   └── invite/        # Système d'invitation
│   │   ├── dashboard/         # Tableaux de bord
│   │   │   ├── admin/         # Interface admin
│   │   │   ├── members/       # Gestion des membres
│   │   │   └── organization/  # Gestion organisation
│   │   └── [lang]/           # Support multilingue
│   ├── components/            # Composants réutilisables
│   │   ├── ui/               # Composants UI de base
│   │   └── forms/            # Composants de formulaire
│   ├── lib/                  # Utilitaires et configurations
│   ├── hooks/                # Hooks React personnalisés
│   ├── types/                # Définitions TypeScript
│   └── utils/                # Fonctions utilitaires
├── public/                   # Fichiers statiques
├── docs/                     # Documentation
└── sql/                      # Migrations de base de données
```

## 🔧 Configuration

### Supabase Schema

Le projet utilise les tables principales suivantes :
- `organizations` - Organisations/entreprises
- `workspaces` - Espaces de travail
- `workspace_members` - Membres des espaces
- `invitations` - Invitations utilisateur

### Variables d'Environnement

| Variable | Description | Requis |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role (admin) | ✅ |
| `NEXTAUTH_SECRET` | Secret pour NextAuth | ✅ |
| `NEXTAUTH_URL` | URL de base de l'application | ✅ |

## 🌍 Fonctionnalités Avancées

### Administration
- Dashboard administrateur avec statistiques
- Gestion globale des utilisateurs
- Surveillance des organisations et espaces
- Métriques en temps réel

### Multi-tenant
- Isolation des données par organisation
- Espaces de travail dédiés
- Permissions granulaires
- Facturation par organisation

### Internationalisation
- Support multilingue intégré
- Détection automatique de la langue
- URLs localisées
- Interface adaptative

## 🤝 Contribution

1. **Fork** le projet
2. Créez votre branche (`git checkout -b feature/AmazingFeature`)
3. **Commit** vos changements (`git commit -m 'Add: Amazing Feature'`)
4. **Push** vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une **Pull Request**

### Standards de Code
- Suivre les règles ESLint configurées
- Utiliser Prettier pour le formatage
- Écrire des tests pour les nouvelles fonctionnalités
- Documenter les APIs et fonctions importantes

## 📝 Licence

Ce projet est sous licence **MIT**. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 👨‍💻 Auteur

**Armand Mahoudjro**
- GitHub: [@mahoudjro04](https://github.com/mahoudjro04)
- Email: armandatakoun04@gmail.com

## 🙏 Remerciements

- [Next.js](https://nextjs.org/) pour le framework React
- [Supabase](https://supabase.com/) pour le backend
- [shadcn/ui](https://ui.shadcn.com/) pour les composants UI
- [Radix UI](https://www.radix-ui.com/) pour les primitives accessibles

---

⭐ **Star ce projet** si vous le trouvez utile !

📫 **Questions ?** N'hésitez pas à ouvrir une [issue](https://github.com/mahoudjro04/AkiliConnect/issues)
