# IGAF L2

Application mobile-first pour aider les étudiants de L2 LMD IGAF à consulter leurs examens de rachat, suivre leur progression, vérifier leur coupon et télécharger les supports de cours et anciens examens.

## Ouvrir le projet dans Cursor

1. Décompressez le dossier ZIP.
2. Ouvrez le dossier `IGAF-L2` dans Cursor.
3. Ouvrez le terminal de Cursor.
4. Exécutez `npm install`.
5. Exécutez `npm run dev`.
6. Ouvrez l’adresse locale affichée dans le terminal.

## Préparer Supabase

Le projet est déjà configuré avec l’URL et la clé publique fournies dans `.env.local`.

1. Ouvrez votre projet Supabase.
2. Allez dans **SQL Editor**.
3. Copiez et exécutez tout le contenu de `supabase/schema.sql`.
4. Allez dans **Authentication > Users**.
5. Créez le compte administrateur : adresse `igaf@l2.com` et le mot de passe choisi pour ce compte.
6. Ouvrez `/admin` dans l’application et connectez-vous avec ce compte.

Le script crée la table `resources`, le bucket `igaf-library` et les règles de sécurité. La lecture des documents est publique. L’ajout, la modification et la suppression sont réservés à l’administrateur authentifié `igaf@l2.com`.

N’utilisez jamais la clé `service_role` ni un mot de passe PostgreSQL dans l’application.

## Ajouter les PDF et anciens examens

Depuis `/admin`, choisissez le cours, le type de document et le fichier. Le fichier est envoyé dans Supabase Storage et apparaît immédiatement dans la bibliothèque de l’étudiant concerné.

## Commandes

- `npm run dev` : développement local
- `npm run build` : compilation de production
- `npm run lint` : vérification du code

## Confidentialité

La liste contient des informations académiques nominatives. Ne rendez le site public qu’avec l’autorisation appropriée de la promotion ou de l’établissement.
