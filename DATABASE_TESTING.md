# Guide de Test avec Base de Données Réelle

## 🗄️ Configuration PostgreSQL

### 1. Installer PostgreSQL

**macOS (avec Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Téléchargez depuis https://www.postgresql.org/download/windows/

### 2. Créer la Base de Données

```bash
# Se connecter à PostgreSQL
psql postgres

# Créer la base de données
CREATE DATABASE querio_test;

# Créer un utilisateur (optionnel)
CREATE USER querio_user WITH PASSWORD 'querio_password';
GRANT ALL PRIVILEGES ON DATABASE querio_test TO querio_user;

# Quitter
\q
```

### 3. Variables d'Environnement

Créez un fichier `.env` dans le dossier racine :

```bash
# Copiez .env.example vers .env
cp .env.example .env
```

Modifiez `.env` avec vos paramètres :
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=querio_test
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_SSL=false
```

## 🚀 Exécuter les Tests

### 1. Test Simple (sans DB)
```bash
pnpm example:simple
```

### 2. Test avec Mock
```bash
pnpm example
```

### 3. Test avec Base de Données Réelle
```bash
pnpm example:db
```

### 4. Test Usage Complet
```bash
pnpm example:usage
```

## 📊 Ce que fait le Test DB

Le test `real-db-test.ts` :

1. **Se connecte à PostgreSQL** avec les paramètres configurés
2. **Crée les tables** automatiquement :
   - `users` (id, name, email, age, is_active, created_at)
   - `accounts` (id, name, user_id, balance, is_active, created_at)
3. **Insère des données de test** automatiquement
4. **Teste toutes les fonctionnalités** :
   - Requêtes de base (`getMany`, `getOne`, `count`)
   - Sélection typée (`select` avec inférence de types)
   - Conditions `where` avec opérateurs
   - Tri et pagination
   - Requêtes chaînées

## ✅ Vérifications de Types

Le test démontre l'inférence de types parfaite :

```typescript
// Type inféré : UserType[]
const allUsers = await User.getMany();

// Type inféré : { id: string; name: string; email: string }[]
const userDetails = await User.select({
  id: true,
  name: true,
  email: true
}).getMany();

// Type inféré : string[]
const userNames = await User.pluck('name');

// Conditions where typées
const activeUsers = await User.where({ isActive: true }).getMany();
const adults = await User.where({ age: { gte: 18 } }).getMany();
```

## 🐛 Dépannage

### Erreur de Connexion
```
Database connection: ❌ Failed
```
- Vérifiez que PostgreSQL est démarré
- Vérifiez les paramètres dans `.env`
- Testez la connexion : `psql -h localhost -U postgres -d querio_test`

### Erreur de Permissions
```
FATAL: role "querio_user" does not exist
```
- Créez l'utilisateur avec les commandes SQL ci-dessus
- Ou utilisez l'utilisateur `postgres` par défaut

### Base de Données Inexistante
```
FATAL: database "querio_test" does not exist
```
- Créez la base avec : `createdb querio_test`
- Ou avec psql : `CREATE DATABASE querio_test;`

## 📈 Résultats Attendus

Quand tout fonctionne, vous devriez voir :

```
🚀 Querio ORM - Real Database Test
===================================

Database connection: ✅ Connected
🏗️ Creating tables...
✅ Tables created successfully
🌱 Seeding data...
✅ Data seeded successfully

📝 Example 1: Basic Queries with Type Inference
-----------------------------------------------
Total users: 4
User details (4 records): [...]
User names: John Doe, Jane Smith, Bob Wilson, Alice Brown

📝 Example 2: Where Conditions
------------------------------
Active users: 3
Found John: John Doe
Adult users (age >= 18): 3

📝 Example 3: Chained Conditions
--------------------------------
Active adults: 3

📝 Example 4: Ordering and Limiting
-----------------------------------
Sorted users (top 3): [...]

📝 Example 5: Account Queries
-----------------------------
Total accounts: 3
High balance accounts: 2

📝 Example 6: Count Queries
---------------------------
Total users: 4, Active: 3

🎉 All tests completed successfully!
✅ Type inference is working perfectly!
✅ Where conditions are properly typed!
✅ Select queries return correct types!
```
