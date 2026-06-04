#!/usr/bin/env python3
"""Generate a weekly CEO report from startup operating CSV files."""

from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Dict, Iterable, List, Tuple


@dataclass
class TableSummary:
    name: str
    total: int
    by_status: Dict[str, int]
    due_actions: List[Dict[str, str]]


def read_csv(path: Path) -> List[Dict[str, str]]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def parse_date(value: str) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def summarize_pipeline(name: str, rows: List[Dict[str, str]], status_key: str = "status") -> TableSummary:
    by_status: Dict[str, int] = {}
    due_actions: List[Dict[str, str]] = []
    today = date.today()

    for row in rows:
        status = (row.get(status_key) or "unknown").strip().lower()
        by_status[status] = by_status.get(status, 0) + 1

        next_action = parse_date(row.get("next_action_date", ""))
        if next_action and next_action <= today and status not in {"won", "closed", "rejected", "inactive"}:
            due_actions.append(row)

    return TableSummary(name=name, total=len(rows), by_status=by_status, due_actions=due_actions)


def compute_offer_score(row: Dict[str, str]) -> float:
    weights: Tuple[Tuple[str, float], ...] = (
        ("valuation_dilution_0_10", 3.0),
        ("partner_value_0_10", 2.5),
        ("closing_certainty_0_10", 1.5),
        ("governance_terms_0_10", 1.5),
        ("recruiting_help_0_10", 1.5),
    )

    score = 0.0
    for field, weight in weights:
        raw = (row.get(field) or "0").strip()
        try:
            value = float(raw)
        except ValueError:
            value = 0.0
        value = max(0.0, min(value, 10.0))
        score += value * weight
    return round(score, 1)


def format_status(statuses: Dict[str, int]) -> str:
    if not statuses:
        return "none"
    return ", ".join(f"{k}:{v}" for k, v in sorted(statuses.items()))


def top_kpi_delta(kpi_rows: List[Dict[str, str]], field: str) -> str:
    if len(kpi_rows) < 2:
        return "n/a"
    latest = kpi_rows[-1].get(field, "")
    prev = kpi_rows[-2].get(field, "")
    return f"{latest} (prev {prev})"


def ensure_offer_scores(offers_path: Path, offer_rows: List[Dict[str, str]]) -> List[Dict[str, str]]:
    if not offer_rows:
        return []

    fieldnames = list(offer_rows[0].keys())
    changed = False

    for row in offer_rows:
        score = compute_offer_score(row)
        score_value = f"{score:.1f}"
        if (row.get("computed_score_0_100") or "") != score_value:
            row["computed_score_0_100"] = score_value
            changed = True

    if changed:
        with offers_path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(offer_rows)

    return sorted(offer_rows, key=lambda r: float(r.get("computed_score_0_100", "0") or 0), reverse=True)


def build_action_line(row: Dict[str, str], id_key: str, owner_key: str) -> str:
    label = row.get(id_key, "(no id)")
    owner = row.get(owner_key, "")
    next_action = row.get("next_action_date", "")
    return f"- {label} | owner/contact: {owner} | next action: {next_action}"


def generate_report(base_dir: Path) -> Path:
    ops = base_dir / "ops"
    reports = base_dir / "reports"
    reports.mkdir(parents=True, exist_ok=True)

    podcast_rows = read_csv(ops / "podcast_pipeline.csv")
    investor_rows = read_csv(ops / "investor_pipeline.csv")
    offer_rows = read_csv(ops / "offers_tracker.csv")
    acquirer_rows = read_csv(ops / "acquirer_pipeline.csv")
    consulting_rows = read_csv(ops / "consulting_pipeline.csv")
    kpi_rows = read_csv(ops / "weekly_kpis.csv")

    ranked_offers = ensure_offer_scores(ops / "offers_tracker.csv", offer_rows)

    summaries = [
        summarize_pipeline("Podcasts", podcast_rows),
        summarize_pipeline("Investors", investor_rows),
        summarize_pipeline("Offers", ranked_offers),
        summarize_pipeline("Acquirers", acquirer_rows),
        summarize_pipeline("Consulting", consulting_rows),
    ]

    due_items: List[str] = []
    for row in summarize_pipeline("Podcasts", podcast_rows).due_actions:
        due_items.append(build_action_line(row, "show_name", "host"))
    for row in summarize_pipeline("Investors", investor_rows).due_actions:
        due_items.append(build_action_line(row, "investor_firm", "partner"))
    for row in summarize_pipeline("Offers", ranked_offers).due_actions:
        due_items.append(build_action_line(row, "offer_id", "investor"))
    for row in summarize_pipeline("Acquirers", acquirer_rows).due_actions:
        due_items.append(build_action_line(row, "company", "contact"))
    for row in summarize_pipeline("Consulting", consulting_rows).due_actions:
        due_items.append(build_action_line(row, "account", "decision_maker"))

    report_path = reports / f"weekly_report_{date.today().isoformat()}.md"

    top_offer_lines: List[str] = []
    for row in ranked_offers[:3]:
        top_offer_lines.append(
            f"- {row.get('offer_id', '')} ({row.get('investor', '')}) score={row.get('computed_score_0_100', '0')}"
        )

    kpi_latest = kpi_rows[-1] if kpi_rows else {}

    lines = [
        f"# CEO Weekly Report - {date.today().isoformat()}",
        "",
        "## KPI Snapshot",
        f"- MRR USD: {kpi_latest.get('mrr_usd', 'n/a')}",
        f"- Paying customers: {kpi_latest.get('paying_customers', 'n/a')}",
        f"- Active workspaces: {kpi_latest.get('active_workspaces', 'n/a')}",
        f"- NRR %: {kpi_latest.get('nrr_pct', 'n/a')}",
        f"- Churn %: {kpi_latest.get('churn_pct', 'n/a')}",
        f"- Podcast booked: {kpi_latest.get('podcast_booked', 'n/a')}",
        f"- Investor meetings: {kpi_latest.get('investor_meetings', 'n/a')}",
        f"- Acquirer meetings: {kpi_latest.get('acquirer_meetings', 'n/a')}",
        f"- Consulting revenue USD: {kpi_latest.get('consulting_revenue_usd', 'n/a')}",
        f"- Runway months: {kpi_latest.get('cash_months_runway', 'n/a')}",
        "",
        "## KPI Trend",
        f"- MRR: {top_kpi_delta(kpi_rows, 'mrr_usd')}",
        f"- Paying customers: {top_kpi_delta(kpi_rows, 'paying_customers')}",
        f"- Runway months: {top_kpi_delta(kpi_rows, 'cash_months_runway')}",
        "",
        "## Pipeline Summary",
    ]

    for summary in summaries:
        lines.append(f"- {summary.name}: total={summary.total}; statuses={format_status(summary.by_status)}")

    lines.extend([
        "",
        "## Top Offers",
    ])
    lines.extend(top_offer_lines or ["- No offers yet"]) 

    lines.extend([
        "",
        "## Due Actions (Today or Overdue)",
    ])
    lines.extend(due_items or ["- No due actions"]) 

    lines.extend([
        "",
        "## CEO Top 3 Priorities This Week",
        "- Close at least 2 podcast bookings with high ICP fit.",
        "- Convert 1 investor target from intro to partner meeting with KPI pack.",
        "- Move 1 consulting deal to signed SOW to improve cash optionality.",
        "",
    ])

    report_path.write_text("\n".join(lines), encoding="utf-8")
    return report_path


def main() -> None:
    here = Path(__file__).resolve().parent
    base = here.parent
    report_path = generate_report(base)
    print(report_path)


if __name__ == "__main__":
    main()
