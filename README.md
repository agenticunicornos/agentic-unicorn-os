# Agentic Unicorn OS

Espace d'execution pour lancer, financer, et optionnellement vendre une startup agentique open source, puis convertir la credibilite en activite de consulting premium.

## Live app

Production: [agentic-unicorn-os.netlify.app](https://agentic-unicorn-os.netlify.app)

## Stack produit

- React + TypeScript pour l'interface operator.
- Supabase Auth pour les comptes utilisateurs.
- Supabase Postgres + RLS comme backend scalable quand le schema est applique.
- Organisations, roles, invitations et audit logs prepares dans le schema Supabase.
- Supabase user metadata comme fallback de continuite tant que la migration SQL n'est pas appliquee.
- Vite pour le build rapide.
- Lucide React pour les icones produit.
- Netlify pour la production.
- Netlify Functions pour l'agent LLM agnostique.
- LocalStorage uniquement comme fallback local si Supabase n'est pas configure.

## Backend Supabase

La production utilise Supabase Auth. L'app tente d'abord le stockage Postgres/RLS, puis bascule sur un fallback Auth metadata si le schema SQL n'est pas encore applique.

Le schema SQL optionnel est dans `supabase/schema.sql` pour une evolution Postgres/RLS plus avancee:

- `operator_actions`: actions utilisateur, statut done, mission liee.
- `pipeline_items`: pipelines Podcasts, Investors, Offers, Acquirers, Consulting.
- `dossier_notes`: notes personnelles par dossier.
- `profiles`: profil lie a `auth.users`.
- `organizations`, `organization_members`, `organization_invitations`: multi-tenant sans billing.
- `audit_events`: trace des actions produit importantes.

## Securite

La posture securite du projet est documentee dans [`SECURITY.md`](SECURITY.md).

## Production scalable

La roadmap pour passer du MVP au produit SaaS mondial est dans [`docs/PRODUCTION_ROADMAP.md`](docs/PRODUCTION_ROADMAP.md).

La surface produit inclut maintenant une vue `Team` pour gerer workspace, membres, invitations et audit log sans couche Stripe.

## Agent agnostique

La vue `Agent` fonctionne en deux modes:

- sans cle LLM: reponse locale deterministe basee sur les actions, pipelines et notes;
- avec LLM: appel serveur authentifie depuis Netlify Functions.

Providers supportes via variables Netlify:

- `LLM_PROVIDER=local`: aucun appel externe.
- `LLM_PROVIDER=openai` avec `OPENAI_API_KEY` ou `LLM_API_KEY`.
- `LLM_PROVIDER=openrouter` avec `OPENROUTER_API_KEY` ou `LLM_API_KEY`.
- `LLM_PROVIDER=custom` avec `LLM_BASE_URL`, `LLM_MODEL`, optionnellement `LLM_API_KEY` pour API compatible `/v1/chat/completions`.
- `LLM_PROVIDER=ollama` avec `LLM_BASE_URL` pointant vers une instance Ollama reachable par Netlify.

Aucune cle LLM ne doit etre exposee dans le frontend.

## App locale

Installer et lancer:

```bash
npm install
npm run dev
```

Copier `.env.example` vers `.env.local`, renseigner Supabase, puis ouvrir `http://127.0.0.1:8000/`.

Verifier avant publication:

```bash
npm run verify
```

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
