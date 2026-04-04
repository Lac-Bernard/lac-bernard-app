# Utiliser l’administration des adhésions (français)

*Association du lac Bernard — pour les bénévoles ayant le rôle **administrateur***

Ce guide décrit la **console d’administration des adhésions** sur le site : consultation des membres, paiements en attente, enregistrement des paiements, exportations et tâches automatiques quotidiennes. Ce n’**est pas** **TinaCMS** (`/admin` sur le site), qui sert à modifier les nouvelles et les pages générales.

---

## À qui s’adresse ce guide

Il faut un **rôle administrateur** sur votre compte de connexion. Si vous ouvrez l’URL d’administration sans ce rôle, le site vous renvoie vers la **page du compte membre**. Un autre administrateur peut vous accorder l’accès (voir **Accorder le rôle admin** dans la fiche membre).

**URL d’administration (français) :** `/fr/membership/admin`  
**URL d’administration (anglais) :** `/en/membership/admin`

Connectez-vous **comme les membres** (Google ou lien magique par courriel), puis ouvrez l’adresse d’administration ou ajoutez-la à vos favoris.

[Screenshot : En-tête de la page Administration et barre d’onglets]

---

## 1. Présentation de la console

Les **onglets** en haut :

| Onglet | Rôle |
|--------|------|
| **Aperçu** | Sommaire et activité récente |
| **Paiements en attente** | Adhésions en attente de paiement |
| **Nouveaux membres** | Profils à réviser |
| **Membres** | Répertoire consultable et exports |
| **Journal d’audit** | Historique des actions admin |

Le bouton **Ajouter un membre** sert aux arrivées sur place ou aux personnes pas encore au dossier (`/fr/membership/admin/members/new`).

---

## 2. Aperçu

L’onglet **Aperçu** donne une vue rapide :

- Comptes tels qu’**adhésions en attente**, **adhésions actives** pour l’année en cours, **nouveaux membres**  
- Listes récentes (p. ex. profils vérifiés récemment, adhésions actives récentes)  

Passez à l’onglet voulu pour agir.

[Screenshot : Onglet Aperçu avec les indicateurs]

---

## 3. Paiements en attente

Le tableau **Paiements en attente** liste les personnes qui ont démarré une adhésion mais n’ont **pas** terminé le paiement (ou dont le paiement n’est pas encore enregistré).

**Colonnes** typiques : nom, courriel, année, **type** d’adhésion (Générale / Associée), **statut**, **cotisation prévue**.

**Actions :**

- **Enregistrer le paiement** — lorsque la personne a payé par virement, chèque, comptant, etc.  
- **Retirer l’adhésion en attente** — supprime l’enregistrement en attente. La personne devra **choisir de nouveau son type d’adhésion** à la prochaine connexion. Confirmez avant de supprimer.

[Screenshot : Tableau des paiements en attente avec actions]

---

## 4. Nouveaux membres

**Nouveaux membres** liste les profils au **statut du dossier** **Nouveau** (création par le membre, pas encore révisé). Utilisez la pagination en bas pour parcourir la liste.

Ouvrez une ligne pour afficher la **fiche membre**, vérifiez les renseignements et passez le **Statut du membre** à **Vérifié** lorsque c’est approprié.

[Screenshot : Onglet Nouveaux membres]

---

## 5. Membres (répertoire)

L’onglet **Membres** sert à chercher et filtrer le répertoire.

**Filtres :**

- **Recherche**  
- **Tri** — p. ex. **Plus récents** ou **Nom de famille A–Z**  
- **Afficher** — **Tous**, **Avec antécédents d’adhésion**, **Actifs pour [année]**, **Non renouvelés pour [année]**  
- **Année d’adhésion** — année visée par les filtres actifs / non renouvelés  
- **Type d’adhésion** — **Tous les types**, **Générale seulement**, **Associée seulement**  
- **Statut du dossier** — **Vérifiés (défaut)**, **Nouveau**, **Désactivé**, **Tous**  

Cliquez sur **Appliquer** après avoir modifié les filtres.

**Exports (mêmes filtres que le tableau) :**

- **Copier la liste de courriels** — copie une liste séparée par des virgules. L’indication à l’écran s’applique : courriel principal non vide seulement ; courriel secondaire possible avec noms. **Obtenez le consentement avant un envoi de masse.**  
- **Exporter CSV** — télécharge un classeur UTF-8 pour la même vue filtrée.

Cliquez sur **Ouvrir** pour la **fiche complète** (profil, adhésions, paiements).

[Screenshot : Onglet Membres — filtres et boutons d’export]

[Screenshot : Tableau Membres avec liens Ouvrir]

---

## 6. Journal d’audit

Le **Journal d’audit** indique **qui a fait quoi** et **quand** (actions des administrateurs). Il sert à la responsabilisation et au dépannage. S’il est vide, aucune action enregistrée pour l’instant.

[Screenshot : Journal d’audit]

---

## 7. Fiche membre

**URL :** `/fr/membership/admin/members/[id]` (identifiant interne).

**Profil**

- Modifier noms, téléphones, courriels, **adresse au lac**, adresse postale, **option courriel**, **notes internes**, **identifiant de compte lié** si nécessaire.  
- **Statut du membre :**  
  - **Nouveau — pas encore révisé** — profil créé par le membre, en attente de révision  
  - **Vérifié — OK pour le répertoire et les envois** — prêt pour le répertoire et les communications habituelles  
  - **Désactivé — exclu du répertoire par défaut et des exports** — inactif / ne pas contacter dans les listes par défaut  
- **Enregistrer** pour appliquer les changements.  
- **Accorder le rôle admin** — donne à cette personne l’accès admin dans l’application. Il faut un **compte de connexion lié** (identifiant utilisateur). Une **déconnexion puis reconnexion** peut être nécessaire pour voir les pages d’administration.

**Adhésions et paiements**

- Choisir l’**année d’adhésion** à consulter ou à modifier.  
- Voir la **cotisation de base**, les montants **adhésion** vs **don**, le **solde dû** et l’historique des paiements.  
- **Paiement manuel** — montant, **mode** (Virement, Chèque, Comptant, Inconnu, ou Carte (Stripe) si saisi manuellement), **date**, **référence** facultative (détails du virement, nº de chèque, etc.), **notes** facultatives.  
- **Retirer** un paiement seulement pour corriger une erreur : le système **recalcule** l’adhésion à partir des paiements restants. **Action irréversible.**  
- **Ajouter une adhésion** — autre année civile : **en attente de paiement** ou **enregistrer le paiement maintenant**, selon les mêmes règles qu’à **Ajouter un membre** (p. ex. une seule générale par adresse au lac et par année).

[Screenshot : Fiche membre — formulaire de profil et Enregistrer / Accorder le rôle admin]

[Screenshot : Fiche membre — adhésions et paiements]

---

## 8. Ajouter un membre

**URL :** `/fr/membership/admin/members/new`

Pour une personne **pas encore** dans la base.

1. Remplir le **profil** (nom, coordonnées, adresse au lac si adhésion générale, etc.).  
2. Facultatif : **ajouter une adhésion** pour l’année civile en cours :  
   - **En attente de paiement** — paiement plus tard en ligne ou manuellement.  
   - **Enregistrer le paiement maintenant** — saisir le paiement tout de suite.  

**Messages d’erreur courants :**

- L’adhésion générale exige d’abord le **numéro civique et la rue au lac** sur le profil.  
- **Un autre membre** à la même adresse au lac a peut-être déjà une **générale** pour cette année.  
- **Adhésion déjà existante** pour cette année.

[Screenshot : Formulaire Ajouter un membre]

---

## 9. Tâches automatiques quotidiennes (« cron »)

Le site est hébergé sur **Vercel**, qui exécute **deux tâches automatiques** chaque jour. **Vous ne les lancez pas** ; elles suivent un horaire. Seuls les serveurs de l’association (avec un secret) peuvent déclencher ces adresses — pas le public.

**Les heures sont en UTC** ; l’heure locale au Québec / Ontario **varie** avec l’heure avancée. À titre indicatif, le courriel quotidien est réglé vers **10:00 UTC** (souvent environ **5 h à 6 h** à Toronto selon la saison — voir la note dans `.env.example` du projet).

### Courriel quotidien de sommaire des adhésions

- **Quand :** chaque jour à **10:00 UTC** (voir `vercel.json`).  
- **Quoi :** appelle `/api/cron/membership-admin-daily-summary`.  
- **Résultat :** envoie **un courriel en texte brut** à la ou les adresses configurées sur l’hébergement (voir `MEMBERSHIP_ADMIN_SUMMARY_TO` dans `.env.example`; souvent **membership@lacbernard.ca** ou une liste).  
- **Contenu :**  
  - Nombre d’**adhésions en attente** (toutes années)  
  - Nombre de **nouveaux membres** en attente de vérification  
  - Nombre d’**adhésions activées** le **jour civil précédent** (fuseau **America/Toronto** pour la notion de « jour précédent » et la date du rapport)  
  - Liens directs vers les consoles d’administration **anglais** et **français**  

### Synchronisation Google Sheets

- **Quand :** chaque jour à **12:00 UTC** (voir `vercel.json`).  
- **Quoi :** appelle `/api/cron/sync-google-sheets`.  
- **Résultat :** met à jour le classeur **Google Sheets** de l’association (configuré sur l’hébergement) avec les feuilles **Members**, **Memberships** et **Payments**, selon la **base de données en direct**.  

La **base du site reste la source officielle** ; la feuille est un miroir pratique pour celles et ceux qui travaillent dans Sheets et pour une visibilité de type sauvegarde.

---

## Liste de captures d’écran (pour votre document Google)

1. Page d’administration — **tous les onglets** visibles  
2. Onglet **Aperçu**  
3. **Paiements en attente** — avec actions  
4. Onglet **Nouveaux membres**  
5. Onglet **Membres** — filtres + **Copier la liste de courriels** / **Exporter CSV**  
6. **Journal d’audit**  
7. Fiche membre — **Profil**  
8. Fiche membre — **Adhésions et paiements**  
9. Page **Ajouter un membre**  
10. *(Facultatif)* Exemple de **courriel quotidien** (anonymiser si besoin)  
11. *(Facultatif)* Feuilles **Google Sheets** (données masquées)  

---

*Référence technique : `src/components/members/AdminMembershipView.astro`, `AdminMemberDetailView.astro`, `vercel.json`, `src/pages/api/cron/`.*
