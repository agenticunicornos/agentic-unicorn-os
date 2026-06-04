# Agentic Unicorn OS

Espace d'execution pour lancer, financer, et optionnellement vendre une startup agentique open source, puis convertir la credibilite en activite de consulting premium.

## Stack produit

- React + TypeScript pour l'interface operator.
- Vite pour le build rapide et le deploiement statique.
- Lucide React pour les icones produit.
- LocalStorage pour l'etat local de la premiere version.
- Cible suivante: Next.js, Postgres/Supabase, auth, workers de rapport et integrations agents.

## App locale

Installer et lancer:

```bash
npm install
npm run dev
```

Puis ouvrir `http://127.0.0.1:8000/`.

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
