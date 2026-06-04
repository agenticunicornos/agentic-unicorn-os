# Agentic Unicorn OS

Espace d'execution pour lancer, financer, et optionnellement vendre une startup agentique open source, puis convertir la credibilite en activite de consulting premium.

## Live app

Production: [agentic-unicorn-os.netlify.app](https://agentic-unicorn-os.netlify.app)

## Stack produit

- React + TypeScript pour l'interface operator.
- Supabase Auth pour les comptes utilisateurs et le workspace cloud par utilisateur.
- Supabase user metadata pour persister actions, pipelines et notes sans bloquer l'app sur une migration SQL.
- Vite pour le build rapide.
- Lucide React pour les icones produit.
- Netlify pour la production.
- LocalStorage uniquement comme fallback local si Supabase n'est pas configure.

## Backend Supabase

La production utilise Supabase Auth et attache le workspace a l'utilisateur connecte.

Le schema SQL optionnel est dans `supabase/schema.sql` pour une evolution Postgres/RLS plus avancee:

- `operator_actions`: actions utilisateur, statut done, mission liee.
- `pipeline_items`: pipelines Podcasts, Investors, Offers, Acquirers, Consulting.
- `dossier_notes`: notes personnelles par dossier.
- `profiles`: profil lie a `auth.users`.

## Securite

La posture securite du projet est documentee dans [`SECURITY.md`](SECURITY.md).

## App locale

Installer et lancer:

```bash
npm install
npm run dev
```

Copier `.env.example` vers `.env.local`, renseigner Supabase, puis ouvrir `http://127.0.0.1:8000/`.

## Architecture du kit
- `00-CEO-MASTERPLAN.md`: trajectoire 18 mois, gates et métriques de direction.
- `01-positionnement.md`: thèse produit, ICP, wedge, moat.
- `02-plan-90-jours.md`: plan opérationnel de traction.
- `03-podcast-pr.md`: stratégie média et scripts.
- `04-fundraising.md`: pipeline investisseurs et gestion d'offres.
- `05-ma-playbook.md`: logique de préparation rachat.
- `06-consulting-offer.md`: offre consulting premium.
- `EXECUTE_NOW.md`: checklist immédiate.
- `ops/*.csv`: pipelines vivants à maintenir.
- `playbooks/*.md`: procédures d'exécution détaillées.
- `tools/ceo_os.py`: générateur de rapport hebdomadaire.
- `reports/`: rapports produits automatiquement.

## Exécution
```bash
./tools/run_weekly_report.sh
```

Le script met à jour le score des offres investisseurs et génère un rapport exécutif daté dans `reports/`.

## Discipline
- Update des pipelines: quotidien.
- Revue KPI: hebdomadaire.
- Revue stratégique: mensuelle.
