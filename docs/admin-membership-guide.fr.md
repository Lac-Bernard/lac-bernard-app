# Guide d’administration des adhésions

*[English version: admin-membership-guide.md](admin-membership-guide.md)*

Ce guide s’adresse aux **bénévoles et au personnel** de l’association qui gèrent les adhésions : le **tableau de bord administrateur** sur le site, le **courriel quotidien de synthèse** et la **feuille Google** qui liste les membres. Aucune compétence technique n’est requise.

Pour les **membres** qui gèrent eux-mêmes leur connexion, leur profil et leurs paiements en ligne, voir plutôt **[member-membership-guide.fr.md](member-membership-guide.fr.md)**. Le présent document porte uniquement sur **l’administration**.

---

## Ce n’est pas la même chose que modifier le site web

Les **pages et nouvelles** du site se modifient avec **TinaCMS** à `/admin` lorsque vous travaillez sur le site public. C’est un rôle distinct de celui d’**administrateur des adhésions**.

Ce guide couvre **les membres et les paiements** seulement : la console **Adhésion → Administration** après votre connexion.

---

## Connexion et accès administrateur

1. Ouvrez l’espace adhésion en **anglais** ou en **français** (les mêmes outils, interface dans la langue choisie) :
   - Administration en anglais : [https://lacbernard.ca/en/membership/admin](https://lacbernard.ca/en/membership/admin) (remplacez le domaine si vous utilisez un site de mise à l’essai)
   - Administration en français : le même chemin avec `/fr/membership/admin`
2. Connectez-vous comme les membres : **lien magique** (lien par courriel, sans mot de passe). *(La page peut aussi proposer Google selon la configuration.)*
3. Si vous n’êtes pas administrateur, vous êtes renvoyé vers la page **compte** habituelle. **L’accès admin ne s’active pas tout seul**: la personne qui tient la base de données (par exemple votre contact TI ou site web) doit vous l’accorder sur votre compte dans **Supabase**. Ensuite, les pages d’administration fonctionnent pour vous.

**Liens directs vers un onglet** (signet facultatif) :

- Aperçu : `?tab=overview`
- Paiements en attente : `?tab=pending`
- Nouveaux membres : `?tab=newMembers`
- Membres : `?tab=members`
- Journal d’audit : `?tab=auditLog`

Exemple : `/fr/membership/admin?tab=pending`

---

## À quoi sert le tableau de bord

En bref : **voir l’activité**, les **paiements en attente** et le **répertoire des membres** ; **ouvrir un membre** pour tout l’historique, **enregistrer des paiements manuels** et **accorder le rôle administrateur** à une autre personne qui doit aider.

---

## Onglet Aperçu

L’onglet **Aperçu** donne une vue d’ensemble :

- **Compteurs** (vous pouvez cliquer pour aller au bon endroit) :
  - **Adhésions en attente**: toutes les années, tout ce qui attend encore un paiement ou une finalisation.
  - **Adhésions actives**: pour l’**année civile d’adhésion en cours** (l’année que l’association utilise pour les cotisations).
  - **Nouveaux membres**: profils qui attendent encore votre révision (voir l’onglet **Nouveaux membres**).
- **Membres récents**: profils **vérifiés** récemment.
- **Adhésions actives récentes**: adhésions devenues **actives** récemment.

Utilisez cet onglet pour un coup d’œil du matin avant de parcourir les listes.

---

## Onglet Paiements en attente

Cette liste regroupe toutes les personnes dont l’adhésion est encore **en attente** pour une année donnée (nom, courriel, année, type d’adhésion, statut, cotisation prévue, actions).

Les membres passent à **en attente** depuis leur page **compte** après avoir choisi un type d’adhésion et soit lancé **Payer par carte de crédit** (la ligne en attente est créée lorsqu’ils poursuivent vers le paiement), soit choisi **Autre mode de paiement** (l’adhésion en attente est créée tout de suite pour afficher les instructions hors ligne, y compris comment indiquer un don facultatif). Les tâches d’administration ci-dessous ne changent pas.

### Enregistrer un paiement manuel

Lorsqu’une personne paie **en dehors du paiement par carte en ligne** (par exemple **virement**, **chèque** ou **comptant**) :

1. Cliquez sur **Enregistrer le paiement** pour cette ligne.
2. Saisissez le **montant**, le **mode**, la **date du paiement**, une **référence** facultative (détails du virement, numéro de chèque, etc.) et des **notes** facultatives.
3. Enregistrez.

Si le montant est **supérieur à la cotisation de base**, le formulaire peut indiquer ce qui compte pour l’**adhésion** par rapport à un **don**: suivez l’aperçu à l’écran.

Les paiements par **carte (Stripe)** en ligne sont en principe créés automatiquement lorsque le paiement est complété ; vous utilisez surtout cette fenêtre pour les paiements hors ligne.

### Retirer une adhésion en attente

**Retirer l’adhésion en attente** supprime cette demande en attente. La personne devra peut-être **choisir de nouveau son type d’adhésion** à sa prochaine connexion. Confirmez seulement si vous voulez vraiment retirer cette ligne.

---

## Onglet Nouveaux membres

Vous y voyez les personnes dont le profil est encore **Nouveau** (en attente de vérification). Utilisez **Précédent** / **Suivant** si la liste est longue.

**Déroulement typique :** ouvrez la personne (**Ouvrir**), vérifiez les renseignements, puis lorsque tout est correct réglez le **statut du membre** sur **Vérifié** sur la page du membre (voir ci-dessous). Jusque-là, elle reste dans cette liste.

---

## Onglet Membres (répertoire)

C’est votre répertoire consultable.

### Filtres et recherche

- **Recherche**: par nom ou courriel.
- **Tri**: par exemple plus récents d’abord ou nom de famille A–Z.
- **Afficher**: tout le monde, seulement les personnes avec des antécédents d’adhésion, **actifs pour [année]**, ou **non renouvelés pour [année]**.
- **Année d’adhésion**: l’année à laquelle s’appliquent ces filtres.
- **Type**: Votant, Associée ou tous.
- **Statut du dossier**: Vérifiés, Nouveau, Désactivé ou tous.

Cliquez sur **Appliquer** pour actualiser le tableau.

### Copier la liste de courriels

**Copier la liste de courriels** utilise les **mêmes filtres que le tableau**. Elle inclut les **courriels principaux non vides** ; si un **courriel secondaire** est indiqué, il est inclus aussi, avec le nom de chaque personne sur son adresse. **Obtenez le consentement avant un envoi de masse.**

Si la copie automatique est bloquée, le site peut afficher du texte à copier manuellement.

### Exporter CSV

**Exporter CSV** télécharge une feuille de calcul (**UTF-8**) selon les **mêmes filtres que le tableau**: utile pour les dossiers ou la publipostage hors site.

### Ouvrir un membre

**Ouvrir** mène à la **page détail** de cette personne (section suivante).

---

## Ajouter un membre

Utilisez **Ajouter un membre** (en haut de la page d’administration) lorsqu’une personne s’inscrit **en dehors** du parcours en ligne habituel (sur place, par téléphone, etc.).

Chemins :

- Anglais : `/en/membership/admin/members/new`
- Français : `/fr/membership/admin/members/new`

Vous pouvez saisir les renseignements du **profil**, l’**adresse au lac**, un **contact secondaire** facultatif, et éventuellement créer une **adhésion pour l’année civile en cours** soit comme :

- **En attente de paiement**: la personne doit encore payer ; apparaît sous **Paiements en attente**, ou  
- **Enregistrer le paiement maintenant (comptant, virement, etc.)**: si vous saisissez tout de suite un paiement hors ligne.

Soumettez pour créer le membre.

---

## Page détail d’un membre

Depuis le répertoire, **Ouvrir** une ligne pour voir le dossier complet.

### Profil et statut

- Modifiez **nom**, **courriels**, **téléphones**, **adresse au lac**, **abonnement aux courriels** et **notes internes** (réservées aux admins ; les membres ne voient pas ces notes).
- **Statut du membre** :
  - **Nouveau**: encore à vérifier (apparaît sous **Nouveaux membres**).
  - **Vérifié**: profil normal et actif.
  - **Désactivé**: exclure l’accès selon vos règles.

Enregistrez avec **Enregistrer**.

### Accorder le rôle admin

**Accorder le rôle admin** donne à cette personne l’accès au même tableau de bord administrateur. Cela ne fonctionne que si elle a déjà un **compte de connexion lié** (inscription avec lien magique ou équivalent). En cas de succès, elle devra peut-être **se déconnecter et se reconnecter** avant de voir les pages d’administration.

### Adhésions et paiements

- Choisissez l’**année d’adhésion** à consulter.
- Vous voyez les **adhésions** de cette personne et les **paiements** pour l’année sélectionnée.
- **Enregistrer le paiement**: même principe que sous **Paiements en attente** (paiements manuels / hors ligne).
- **Retirer** sur un paiement le supprime après confirmation ; le **statut d’adhésion est recalculé** selon ce qui reste. Action irréversible.
- Les paiements par **carte (Stripe)** apparaissent à titre de référence ; les débits courants par carte sont créés par le site, pas saisis ici.
- **Ajouter une adhésion**: pour une autre année ou une autre situation si nécessaire (par exemple une nouvelle saison).

---

## Onglet Journal d’audit

Le **Journal d’audit** est un tableau historique en lecture seule : **quand** l’action a eu lieu, **quel administrateur** (par courriel), **quelle action**, **quel enregistrement**, et des **détails** supplémentaires.

On y trouve notamment :

- Création d’un membre  
- Mise à jour du profil  
- Ajout d’une adhésion depuis l’admin  
- Enregistrement d’un paiement **manuel**  
- Annulation d’une adhésion **en attente**  
- Suppression d’un paiement  
- Octroi du rôle **admin**  

Utile pour répondre à « qui a modifié ceci ? » sans deviner.

---

## Synchronisation avec Google Sheets

L’association peut tenir une **feuille Google** **remplie automatiquement** à partir des mêmes données que le site.

### Contenu

- Trois onglets : **Members**, **Memberships** et **Payments** (noms techniques côté feuille).
- La feuille est **actualisée selon un horaire** (en général une fois par jour sur le serveur). Ce n’est **pas** un miroir instantané.
- Dans l’onglet **Memberships**, la colonne **tier** reprend les valeurs de la base : **`voting`** ou **`associate`**. Si des formules, filtres ou tableaux croisés utilisaient l’ancienne valeur **`general`**, remplacez-la par **`voting`**.

### Utilisation

- Considérez la **base de données du site** comme **source de vérité**. **Les changements faits seulement dans la feuille ne reviennent pas** dans les dossiers d’adhésion.
- Servez-vous de la feuille pour les **rapports**, **dossiers de conseil**, **publipostage** ou un tableau familier.
- Une personne ayant accès au **partage Google** doit partager la feuille avec le **compte de service** de l’association (courriel indiqué dans le **README** du projet, section *Google service account*) :  
  `lac-bernard-website-access@lac-bernard-app.iam.gserviceaccount.com`  
  pour que les mises à jour automatiques fonctionnent.

Si les lignes semblent anciennes, attendez la prochaine mise à jour quotidienne ou demandez à votre contact technique si la synchro est activée.

---

## Courriel quotidien de synthèse

Certaines personnes admin reçoivent chaque jour un **courriel automatique** avec des chiffres clés. **L’heure d’envoi exacte** dépend de l’hébergement (souvent **le matin, heure de l’Est**) ; les **dates dans le courriel** utilisent **Toronto (heure de l’Est)** pour délimiter la « journée ».

**Les destinataires** sont configurés sur le serveur (votre contact technique gère la liste).

### Signification des chiffres

- **Adhésions en attente (toutes années)**: nombre d’adhésions encore **en attente** (paiement ou finalisation), toutes années confondues.
- **Nouveaux membres en attente de vérification**: nombre de **profils** encore au statut **Nouveau**.
- **Adhésions activées le jour civil précédent (Toronto)**: nombre d’adhésions passées **actives** **hier** selon la date à Toronto (selon l’horodatage d’activation).

Le courriel contient aussi des **liens** pour ouvrir la console d’administration en **anglais** et en **français**.

Servez-vous-en comme **rappel** pour ouvrir le tableau de bord ; l’**Aperçu** et les onglets affichent toujours le détail à jour.

---

## Parcours rapide : du courriel au paiement enregistré

1. Lisez le courriel quotidien (ou ouvrez l’**Aperçu**).  
2. Si **Adhésions en attente** n’est pas zéro, allez à **Paiements en attente**.  
3. **Ouvrez** une ligne ou travaillez depuis la liste.  
4. **Enregistrez le paiement** lorsque l’argent est reçu, ou **retirez l’adhésion en attente** seulement si vous voulez vraiment annuler cette demande.  
5. Pour les nouvelles personnes, utilisez **Nouveaux membres**, ouvrez le profil et passez le statut à **Vérifié** lorsque c’est approprié.

---

## Besoin d’aide ?

- **Problème d’accès** (impossible d’ouvrir l’admin du tout) : contactez la personne qui gère **Supabase** / les comptes du site.  
- **Feuille qui ne se met pas à jour** ou **courriel qui n’arrive pas**: contactez l’**hébergement web** ou votre contact technique (synchro et courriel utilisent des réglages serveur que vous n’avez pas à modifier vous-même).
