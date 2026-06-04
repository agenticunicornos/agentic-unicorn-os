import {
  Archive,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Cloud,
  Command,
  Copy,
  Database,
  FileText,
  Flame,
  GitBranch,
  Handshake,
  Layers3,
  LineChart,
  Lock,
  LogOut,
  Plus,
  Rocket,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  User,
  X
} from "lucide-react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { hasSupabaseConfig, supabase } from "./lib/supabase";

type ViewId = "today" | "missions" | "pipelines" | "dossiers" | "brief";
type MissionId = "product" | "distribution" | "capital" | "ma" | "consulting";
type Tone = "mint" | "blue" | "amber" | "coral" | "lime";
type AuthMode = "signin" | "signup";
type SyncState = "local" | "loading" | "ready" | "saving" | "error";

type Mission = {
  id: MissionId;
  label: string;
  orbit: string;
  tone: Tone;
  mandate: string;
  proof: string;
  risk: string;
  moves: string[];
};

type Action = {
  id: string;
  mission: MissionId;
  title: string;
  leverage: string;
  due: string;
};

type PipelineRow = {
  id: string;
  lane: string;
  name: string;
  counterparty: string;
  next: string;
  signal: string;
};

type PipelineSeed = Omit<PipelineRow, "id" | "lane">;

type Dossier = {
  id: string;
  title: string;
  source: string;
  sections: Array<{ title: string; lines: string[] }>;
};

type ActionRow = {
  id: string;
  mission: MissionId;
  title: string;
  leverage: string;
  due: string;
  done: boolean;
};

type PipelineItemRow = {
  id: string;
  lane: string;
  name: string;
  counterparty: string;
  next_step: string;
  signal: string;
};

type DossierNoteRow = {
  dossier_id: string;
  body: string;
};

const views: Array<{ id: ViewId; label: string; icon: ReactNode }> = [
  { id: "today", label: "Today", icon: <CalendarDays /> },
  { id: "missions", label: "Missions", icon: <Layers3 /> },
  { id: "pipelines", label: "Pipelines", icon: <GitBranch /> },
  { id: "dossiers", label: "Dossiers", icon: <FileText /> },
  { id: "brief", label: "Brief", icon: <BookOpen /> }
];

const missions: Mission[] = [
  {
    id: "product",
    label: "Product",
    orbit: "M0-M3",
    tone: "mint",
    mandate: "Ship the first usable operating layer, then convert it into an open source product with measurable reliability.",
    proof: "Three agent templates, evaluation loop, auditable runs, active design partners.",
    risk: "Confusing a strategic memo with a product people can operate.",
    moves: ["Define reliability score", "Ship support / sales / finance templates", "Turn every run into a trace"]
  },
  {
    id: "distribution",
    label: "Distribution",
    orbit: "Weekly",
    tone: "blue",
    mandate: "Make podcasts, technical content and case studies create qualified demand instead of noise.",
    proof: "25 targeted podcast asks each week, one product CTA, five clips per episode.",
    risk: "Publishing without a measurable acquisition loop.",
    moves: ["Send podcast batch", "Write three sharp episode angles", "Attach every appearance to a demo path"]
  },
  {
    id: "capital",
    label: "Capital",
    orbit: "Seed/A",
    tone: "amber",
    mandate: "Run fundraising as a controlled window with competing options and a clear scorecard.",
    proof: "Investor pipeline, KPI pack, data room lite, term sheets scored out of 100.",
    risk: "Letting fundraising become permanent context drag.",
    moves: ["Book ten warm intros", "Prepare 12-week KPI pack", "Score every offer before negotiation"]
  },
  {
    id: "ma",
    label: "M&A",
    orbit: "Option",
    tone: "coral",
    mandate: "Prepare strategic acquisition paths before needing them.",
    proof: "Tiered acquirer list, synergy memo, clean metrics, walk-away conditions.",
    risk: "Negotiating from dependency or accepting an uncontrollable earn-out.",
    moves: ["Map two to four strategic buyers", "Write a one-page synergy memo", "Open discreet corp dev conversations"]
  },
  {
    id: "consulting",
    label: "Consulting",
    orbit: "Cash",
    tone: "lime",
    mandate: "Convert agentic execution expertise into premium cash without derailing the core product.",
    proof: "Two-week audit, six-week build sprint, recurring advisory, executive sponsor required.",
    risk: "Taking delivery-heavy work without a real buyer and signed business KPI.",
    moves: ["Qualify sponsor and budget", "Send SOW", "Keep client count deliberately low"]
  }
];

const seedActions: Action[] = [
  {
    id: "seed-product-shell",
    mission: "product",
    title: "Replace the static preview with the real product shell",
    leverage: "Makes Agentic Unicorn OS operable, not just readable.",
    due: "Today"
  },
  {
    id: "seed-podcast-targets",
    mission: "distribution",
    title: "Prepare the first 25 podcast targets",
    leverage: "Turns founder credibility into qualified inbound.",
    due: "Today"
  },
  {
    id: "seed-kpi-pack",
    mission: "capital",
    title: "Package 12-week metrics for investor intros",
    leverage: "Creates a cleaner fundraising window.",
    due: "This week"
  },
  {
    id: "seed-acquirer-conversations",
    mission: "ma",
    title: "Start three discreet acquirer conversations",
    leverage: "Builds strategic optionality before pressure.",
    due: "This week"
  },
  {
    id: "seed-consulting-prospects",
    mission: "consulting",
    title: "Qualify five premium consulting prospects",
    leverage: "Adds cash and field signal without diluting the product.",
    due: "Today"
  }
];

const pipelineSeeds: Record<string, PipelineSeed[]> = {
  Podcasts: [
    { name: "Podcast IA #1", counterparty: "Host A", next: "Personalize with a production reliability case", signal: "fit 5" },
    { name: "Podcast IA #2", counterparty: "Host B", next: "Send three practical talking points", signal: "fit 4" },
    { name: "Podcast IA #3", counterparty: "Host C", next: "Pitch OSS distribution as GTM moat", signal: "fit 4" }
  ],
  Investors: [
    { name: "Fund A", counterparty: "Partner 1", next: "Send update and KPI pack", signal: "$1.5M" },
    { name: "Fund B", counterparty: "Partner 2", next: "Book 30 minute partner meeting", signal: "$3M" },
    { name: "Fund C", counterparty: "Partner 3", next: "Share case study and data room lite", signal: "$1M" }
  ],
  Offers: [
    { name: "TS-002", counterparty: "Fund B", next: "Negotiate liquidation preference and reporting cadence", signal: "81.0" },
    { name: "TS-001", counterparty: "Fund A", next: "Adjust pro-rata and information rights", signal: "75.5" }
  ],
  Acquirers: [
    { name: "Strategic Co A", counterparty: "VP Corp Dev", next: "Run product and synergy intro", signal: "fit 5" },
    { name: "Strategic Co B", counterparty: "Head of AI", next: "Offer a private technical workshop", signal: "fit 4" },
    { name: "Strategic Co C", counterparty: "GM Platform", next: "Share metric story and enterprise roadmap", signal: "fit 4" }
  ],
  Consulting: [
    { name: "Enterprise A", counterparty: "COO", next: "Confirm executive sponsor and budget", signal: "$95k" },
    { name: "Enterprise B", counterparty: "CTO", next: "Propose 90-day advisory frame", signal: "$18k/mo" },
    { name: "Enterprise C", counterparty: "Head of Ops", next: "Send SOW and delivery calendar", signal: "$140k" }
  ]
};

const dossiers: Dossier[] = [
  {
    id: "masterplan",
    title: "CEO Masterplan",
    source: "00-CEO-MASTERPLAN.md",
    sections: [
      { title: "End state", lines: ["Build an agentic open source company with credible path to $1B valuation, strategic acquisition option and premium consulting ramp."] },
      { title: "Non-negotiables", lines: ["Revenue focus", "Systematic distribution", "Pipeline discipline", "Defensible reliability and security moat"] },
      { title: "Gates", lines: ["M0-M3: $50k ARR run-rate", "M4-M9: $1M ARR run-rate", "M10-M18: at least two real strategic options"] }
    ]
  },
  {
    id: "positioning",
    title: "Positioning",
    source: "01-positionnement.md",
    sections: [
      { title: "Thesis", lines: ["Open source layer for deploying reliable agents in production: orchestration, security, evaluation and observability."] },
      { title: "ICP", lines: ["Ops, support, sales and finance teams with high automation demand and low tolerance for incorrect output."] },
      { title: "Promise", lines: ["Launch useful agents in less than seven days with measurable reliability."] }
    ]
  },
  {
    id: "ninety",
    title: "90-day plan",
    source: "02-plan-90-jours.md",
    sections: [
      { title: "Days 1-30", lines: ["Publish OSS repo", "Ship three agent templates", "Secure ten design partners"] },
      { title: "Days 31-60", lines: ["Launch paid cloud path", "Publish four case studies", "Install content and podcast loop"] },
      { title: "Days 61-90", lines: ["Structure investor pipeline", "Open data room", "Strengthen enterprise roadmap"] }
    ]
  },
  {
    id: "fundraising",
    title: "Fundraising",
    source: "04-fundraising.md",
    sections: [
      { title: "Investor story", lines: ["Measurable open source adoption", "Proven commercial traction", "Fast execution machine"] },
      { title: "Offer score", lines: ["Valuation and dilution: 30", "Partner value: 25", "Closing certainty: 15", "Governance: 15", "Recruiting and enterprise access: 15"] }
    ]
  },
  {
    id: "consulting",
    title: "Consulting",
    source: "06-consulting-offer.md",
    sections: [
      { title: "Positioning", lines: ["Move enterprises from AI experiments to production agents with measurable ROI."] },
      { title: "Packaging", lines: ["Audit: $20k-$40k", "Build sprint: $60k-$120k", "Advisory: $10k-$25k monthly"] }
    ]
  }
];

const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const value = localStorage.getItem(key);
      return value ? (JSON.parse(value) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

function makeDefaultPipelines(): Record<string, PipelineRow[]> {
  return Object.fromEntries(
    Object.entries(pipelineSeeds).map(([lane, rows]) => [
      lane,
      rows.map((row, index) => ({
        ...row,
        id: `seed-${lane.toLowerCase()}-${index}`,
        lane
      }))
    ])
  );
}

export function App() {
  const [view, setView] = useState<ViewId>(() => storage.get("auos:view", "today"));
  const [missionId, setMissionId] = useState<MissionId>(() => storage.get("auos:mission", "product"));
  const [pipeline, setPipeline] = useState(() => storage.get("auos:pipeline", "Podcasts"));
  const [dossierId, setDossierId] = useState(() => storage.get("auos:dossier", "masterplan"));
  const [done, setDone] = useState<Record<string, boolean>>(() => storage.get("auos:done", {}));
  const [localActions, setLocalActions] = useState<Action[]>(() => storage.get("auos:actions", []));
  const [cloudActions, setCloudActions] = useState<Action[]>([]);
  const [localPipelines, setLocalPipelines] = useState<Record<string, PipelineRow[]>>(() => storage.get("auos:pipelineRows", makeDefaultPipelines()));
  const [cloudPipelines, setCloudPipelines] = useState<Record<string, PipelineRow[]>>(makeDefaultPipelines);
  const [dossierNotes, setDossierNotes] = useState<Record<string, string>>(() => storage.get("auos:dossierNotes", {}));
  const [commandOpen, setCommandOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [authLoading, setAuthLoading] = useState(hasSupabaseConfig);
  const [authMessage, setAuthMessage] = useState("");
  const [syncState, setSyncState] = useState<SyncState>(hasSupabaseConfig ? "loading" : "local");

  const user = session?.user ?? null;
  const isCloud = Boolean(user && supabase);
  const mission = missions.find((item) => item.id === missionId) ?? missions[0];
  const dossier = dossiers.find((item) => item.id === dossierId) ?? dossiers[0];
  const actions = isCloud ? cloudActions : [...seedActions, ...localActions];
  const pipelineRows = isCloud ? cloudPipelines : localPipelines;

  useEffect(() => storage.set("auos:view", view), [view]);
  useEffect(() => storage.set("auos:mission", missionId), [missionId]);
  useEffect(() => storage.set("auos:pipeline", pipeline), [pipeline]);
  useEffect(() => storage.set("auos:dossier", dossierId), [dossierId]);
  useEffect(() => {
    if (!isCloud) storage.set("auos:done", done);
  }, [done, isCloud]);
  useEffect(() => {
    if (!isCloud) storage.set("auos:actions", localActions);
  }, [localActions, isCloud]);
  useEffect(() => {
    if (!isCloud) storage.set("auos:pipelineRows", localPipelines);
  }, [localPipelines, isCloud]);
  useEffect(() => {
    if (!isCloud) storage.set("auos:dossierNotes", dossierNotes);
  }, [dossierNotes, isCloud]);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      setSyncState("local");
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthLoading(false);
      setSyncState(data.session ? "loading" : "ready");
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthMessage("");
      setSyncState(nextSession ? "loading" : "ready");
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client || !user) return;

    let cancelled = false;

    async function loadWorkspace(currentUser: SupabaseUser, db: NonNullable<typeof supabase>) {
      setSyncState("loading");
      try {
        let { data: actionData, error: actionError } = await db
          .from("operator_actions")
          .select("id, mission, title, leverage, due, done")
          .order("created_at", { ascending: true });

        if (actionError) throw actionError;

        let actionRows = (actionData ?? []) as ActionRow[];
        if (actionRows.length === 0) {
          const inserts = seedActions.map((action) => ({
            user_id: currentUser.id,
            seed_key: action.id,
            mission: action.mission,
            title: action.title,
            leverage: action.leverage,
            due: action.due,
            done: false
          }));

          const seeded = await db
            .from("operator_actions")
            .insert(inserts)
            .select("id, mission, title, leverage, due, done")
            .order("created_at", { ascending: true });

          if (seeded.error) throw seeded.error;
          actionRows = (seeded.data ?? []) as ActionRow[];
        }

        let { data: pipelineData, error: pipelineError } = await db
          .from("pipeline_items")
          .select("id, lane, name, counterparty, next_step, signal")
          .order("created_at", { ascending: true });

        if (pipelineError) throw pipelineError;

        let pipelineItems = (pipelineData ?? []) as PipelineItemRow[];
        if (pipelineItems.length === 0) {
          const inserts = Object.entries(pipelineSeeds).flatMap(([lane, rows]) =>
            rows.map((row) => ({
              user_id: currentUser.id,
              lane,
              name: row.name,
              counterparty: row.counterparty,
              next_step: row.next,
              signal: row.signal
            }))
          );

          const seeded = await db
            .from("pipeline_items")
            .insert(inserts)
            .select("id, lane, name, counterparty, next_step, signal")
            .order("created_at", { ascending: true });

          if (seeded.error) throw seeded.error;
          pipelineItems = (seeded.data ?? []) as PipelineItemRow[];
        }

        const { data: noteData, error: noteError } = await db
          .from("dossier_notes")
          .select("dossier_id, body");

        if (noteError) throw noteError;

        if (cancelled) return;

        setCloudActions(actionRows.map(rowToAction));
        setDone(Object.fromEntries(actionRows.map((row) => [row.id, row.done])));
        setCloudPipelines(groupPipelineRows(pipelineItems));
        setDossierNotes(Object.fromEntries(((noteData ?? []) as DossierNoteRow[]).map((note) => [note.dossier_id, note.body])));
        setSyncState("ready");
      } catch (error) {
        if (cancelled) return;
        console.error(error);
        setSyncState("error");
        flash("Supabase schema missing");
      }
    }

    loadWorkspace(user, client);

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === "Escape") {
        setCommandOpen(false);
      }
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, []);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  function copyBrief() {
    navigator.clipboard
      ?.writeText(weeklyBrief())
      .then(() => flash("Brief copied"))
      .catch(() => flash("Clipboard unavailable"));
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    if (!email || !password) return;

    setAuthLoading(true);
    setAuthMessage("");

    const result =
      authMode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin }
          })
        : await supabase.auth.signInWithPassword({ email, password });

    setAuthLoading(false);

    if (result.error) {
      setAuthMessage(result.error.message);
      return;
    }

    if (authMode === "signup" && !result.data.session) {
      setAuthMessage("Account created. Check the email confirmation if Supabase requires it.");
      return;
    }

    flash(authMode === "signup" ? "Account ready" : "Signed in");
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setCloudActions([]);
    setDone(storage.get("auos:done", {}));
    setSyncState("ready");
  }

  async function addAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    if (!title) return;

    const draft: Action = {
      id: `local-${Date.now()}`,
      mission: missionId,
      title,
      leverage: "Manual operator action.",
      due: "Today"
    };

    if (isCloud && supabase && user) {
      setSyncState("saving");
      const { data: inserted, error } = await supabase
        .from("operator_actions")
        .insert({
          user_id: user.id,
          mission: draft.mission,
          title: draft.title,
          leverage: draft.leverage,
          due: draft.due,
          done: false
        })
        .select("id, mission, title, leverage, due, done")
        .single();

      if (error || !inserted) {
        setSyncState("error");
        flash("Action not saved");
        return;
      }

      const row = inserted as ActionRow;
      setCloudActions((items) => [rowToAction(row), ...items]);
      setDone((items) => ({ ...items, [row.id]: row.done }));
      setSyncState("ready");
      flash("Action saved");
    } else {
      setLocalActions((items) => [draft, ...items]);
      flash("Action saved locally");
    }

    form.reset();
  }

  async function toggleAction(id: string) {
    const nextValue = !done[id];
    setDone((items) => ({ ...items, [id]: nextValue }));

    if (isCloud && supabase) {
      setSyncState("saving");
      const { error } = await supabase
        .from("operator_actions")
        .update({ done: nextValue })
        .eq("id", id);

      if (error) {
        setDone((items) => ({ ...items, [id]: !nextValue }));
        setSyncState("error");
        flash("Action not synced");
        return;
      }

      setSyncState("ready");
    }
  }

  async function addPipelineItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const counterparty = String(data.get("counterparty") ?? "").trim();
    const next = String(data.get("next") ?? "").trim();
    const signal = String(data.get("signal") ?? "").trim();
    if (!name) return;

    const draft: PipelineRow = {
      id: `local-pipeline-${Date.now()}`,
      lane: pipeline,
      name,
      counterparty,
      next,
      signal
    };

    if (isCloud && supabase && user) {
      setSyncState("saving");
      const { data: inserted, error } = await supabase
        .from("pipeline_items")
        .insert({
          user_id: user.id,
          lane: pipeline,
          name,
          counterparty,
          next_step: next,
          signal
        })
        .select("id, lane, name, counterparty, next_step, signal")
        .single();

      if (error || !inserted) {
        setSyncState("error");
        flash("Pipeline item not saved");
        return;
      }

      const row = pipelineRowFromDb(inserted as PipelineItemRow);
      setCloudPipelines((items) => ({
        ...items,
        [row.lane]: [row, ...(items[row.lane] ?? [])]
      }));
      setSyncState("ready");
      flash("Pipeline saved");
    } else {
      setLocalPipelines((items) => ({
        ...items,
        [draft.lane]: [draft, ...(items[draft.lane] ?? [])]
      }));
      flash("Pipeline saved locally");
    }

    form.reset();
  }

  async function saveDossierNote(dossierKey: string, body: string) {
    setDossierNotes((items) => ({ ...items, [dossierKey]: body }));

    if (isCloud && supabase && user) {
      setSyncState("saving");
      const { error } = await supabase
        .from("dossier_notes")
        .upsert(
          {
            user_id: user.id,
            dossier_id: dossierKey,
            body
          },
          { onConflict: "user_id,dossier_id" }
        );

      if (error) {
        setSyncState("error");
        flash("Note not synced");
        return;
      }

      setSyncState("ready");
      flash("Note saved");
    } else {
      flash("Note saved locally");
    }
  }

  const commandItems = useMemo(() => {
    return [
      { title: "Copy weekly brief", meta: "Operator memo", icon: <Copy />, run: copyBrief },
      { title: "Today", meta: "Execution queue", icon: <CalendarDays />, run: () => setView("today") },
      { title: "Missions", meta: "Strategic axes", icon: <Layers3 />, run: () => setView("missions") },
      { title: "Pipelines", meta: "Counterparties", icon: <GitBranch />, run: () => setView("pipelines") },
      { title: "Dossiers", meta: "Living docs", icon: <FileText />, run: () => setView("dossiers") },
      ...missions.map((item) => ({
        title: item.label,
        meta: item.mandate,
        icon: <Target />,
        run: () => {
          setMissionId(item.id);
          setView("missions");
        }
      }))
    ];
  }, []);

  const filteredCommands = commandItems.filter((item) =>
    `${item.title} ${item.meta}`.toLowerCase().includes(query.toLowerCase())
  );

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (hasSupabaseConfig && !user) {
    return (
      <AuthScreen
        mode={authMode}
        onMode={setAuthMode}
        onSubmit={handleAuth}
        loading={authLoading}
        message={authMessage}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className="rail">
        <button className="mark" aria-label="Agentic Unicorn OS" onClick={() => setView("today")}>AU</button>
        <nav className="rail-nav" aria-label="Primary">
          {views.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "rail-item active" : "rail-item"}
              onClick={() => setView(item.id)}
              title={item.label}
              aria-label={item.label}
            >
              {item.icon}
            </button>
          ))}
        </nav>
        <button className="rail-item" onClick={() => setCommandOpen(true)} title="Command" aria-label="Command">
          <Command />
        </button>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="kicker">Agentic Unicorn OS</p>
            <h1>{viewTitle(view)}</h1>
          </div>
          <div className="top-actions">
            <SyncPill state={syncState} cloud={isCloud} />
            {user && (
              <button className="profile-button" onClick={signOut} title={user.email ?? "Account"}>
                <User />
                <span>{user.email}</span>
                <LogOut />
              </button>
            )}
            <button className="command-button" onClick={() => setCommandOpen(true)}>
              <Search />
              <span>Command</span>
              <kbd>K</kbd>
            </button>
            <button className="icon-button" onClick={copyBrief} aria-label="Copy brief" title="Copy brief">
              <Copy />
            </button>
          </div>
        </header>

        <section className="content">
          {!hasSupabaseConfig && (
            <div className="setup-strip">
              <Database />
              <span>Supabase env vars missing. Running local mode.</span>
            </div>
          )}
          {syncState === "error" && (
            <div className="setup-strip error">
              <ShieldCheck />
              <span>Run the SQL schema in Supabase, then reload.</span>
            </div>
          )}
          {view === "today" && (
            <TodayView
              mission={mission}
              actions={actions}
              done={done}
              onToggle={toggleAction}
              onSelectMission={(id) => {
                setMissionId(id);
                setView("missions");
              }}
              onAddAction={addAction}
            />
          )}
          {view === "missions" && (
            <MissionsView mission={mission} actions={actions} done={done} onSelectMission={setMissionId} onToggle={toggleAction} />
          )}
          {view === "pipelines" && <PipelinesView active={pipeline} rows={pipelineRows} onActive={setPipeline} onAdd={addPipelineItem} />}
          {view === "dossiers" && (
            <DossiersView
              active={dossier}
              note={dossierNotes[dossier.id] ?? ""}
              onActive={setDossierId}
              onSaveNote={saveDossierNote}
            />
          )}
          {view === "brief" && <BriefView onCopy={copyBrief} />}
        </section>
      </main>

      {commandOpen && (
        <div className="command-overlay" onClick={() => setCommandOpen(false)}>
          <div className="palette" onClick={(event) => event.stopPropagation()}>
            <div className="palette-input">
              <Search />
              <input value={query} onChange={(event) => setQuery(event.target.value)} autoFocus placeholder="Command" />
              <button className="ghost-icon" onClick={() => setCommandOpen(false)} aria-label="Close">
                <X />
              </button>
            </div>
            <div className="palette-list">
              {filteredCommands.map((item) => (
                <button
                  key={`${item.title}-${item.meta}`}
                  className="palette-row"
                  onClick={() => {
                    item.run();
                    setCommandOpen(false);
                    setQuery("");
                  }}
                >
                  <span className="palette-icon">{item.icon}</span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.meta}</small>
                  </span>
                  <ChevronRight />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={toast ? "toast visible" : "toast"}>{toast}</div>
    </div>
  );
}

function AuthScreen({
  mode,
  onMode,
  onSubmit,
  loading,
  message
}: {
  mode: AuthMode;
  onMode: (mode: AuthMode) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  message: string;
}) {
  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="auth-mark">AU</div>
        <div>
          <p className="kicker">Agentic Unicorn OS</p>
          <h1>{mode === "signin" ? "Sign in" : "Create account"}</h1>
        </div>
        <div className="auth-switch">
          <button className={mode === "signin" ? "active" : ""} onClick={() => onMode("signin")} type="button">Sign in</button>
          <button className={mode === "signup" ? "active" : ""} onClick={() => onMode("signup")} type="button">Create</button>
        </div>
        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            <span>Password</span>
            <input name="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={6} required />
          </label>
          <button type="submit" disabled={loading}>
            <Lock />
            {loading ? "Working" : mode === "signin" ? "Enter workspace" : "Create workspace"}
          </button>
        </form>
        {message && <p className="auth-message">{message}</p>}
      </section>
      <aside className="auth-proof">
        <div>
          <Cloud />
          <strong>Cloud workspace</strong>
          <span>Every user gets isolated records.</span>
        </div>
        <div>
          <Database />
          <strong>Supabase backend</strong>
          <span>Actions, pipelines and notes are saved in Postgres.</span>
        </div>
        <div>
          <ShieldCheck />
          <strong>RLS enabled</strong>
          <span>User data is scoped by auth uid.</span>
        </div>
      </aside>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="auth-screen">
      <section className="auth-card compact-auth">
        <div className="auth-mark">AU</div>
        <p className="kicker">Agentic Unicorn OS</p>
        <h1>Loading workspace</h1>
      </section>
    </main>
  );
}

function SyncPill({ state, cloud }: { state: SyncState; cloud: boolean }) {
  const label = cloud ? stateLabel(state) : "Local";
  return (
    <span className={`sync-pill ${state}`}>
      {cloud ? <Cloud /> : <Database />}
      {label}
    </span>
  );
}

function TodayView({
  mission,
  actions,
  done,
  onToggle,
  onSelectMission,
  onAddAction
}: {
  mission: Mission;
  actions: Action[];
  done: Record<string, boolean>;
  onToggle: (id: string) => void;
  onSelectMission: (id: MissionId) => void;
  onAddAction: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="today-grid">
      <section className="brief-panel">
        <div className="section-label">
          <Sparkles />
          <span>Founder pulse</span>
        </div>
        <h2>Move the company through proof, not presentation.</h2>
        <p>
          The product exists when the founder can decide, execute and prove progress from one surface.
        </p>
        <div className="pulse-stack">
          <Pulse icon={<Rocket />} label="Build" value="Product shell first" />
          <Pulse icon={<Flame />} label="Signal" value="Distribution tied to CTA" />
          <Pulse icon={<ShieldCheck />} label="Options" value="Capital, M&A, cash" />
        </div>
      </section>

      <section className="queue-panel">
        <PanelHeader icon={<ClipboardList />} label="Execution queue" meta={`${actions.length} moves`} />
        <div className="action-list">
          {actions.map((action) => {
            const itemMission = missions.find((item) => item.id === action.mission)!;
            return (
              <article className={done[action.id] ? "action done" : "action"} key={action.id}>
                <button className="check" onClick={() => onToggle(action.id)} aria-label="Toggle action">
                  <Check />
                </button>
                <div>
                  <div className="action-title">{action.title}</div>
                  <p>{action.leverage}</p>
                  <div className="chips">
                    <span className={`chip ${itemMission.tone}`}>{itemMission.label}</span>
                    <span className="chip neutral">{action.due}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <form className="quick-add" onSubmit={onAddAction}>
          <input name="title" maxLength={130} placeholder="Add operator move" />
          <button type="submit">
            <Plus />
          </button>
        </form>
      </section>

      <section className="missions-panel">
        <PanelHeader icon={<CircleDot />} label="Mission stack" meta={mission.orbit} />
        <div className="mission-stack">
          {missions.map((item) => (
            <button
              key={item.id}
              className={item.id === mission.id ? `mission-card active ${item.tone}` : `mission-card ${item.tone}`}
              onClick={() => onSelectMission(item.id)}
            >
              <span>{item.label}</span>
              <strong>{item.orbit}</strong>
              <small>{item.mandate}</small>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function MissionsView({
  mission,
  actions,
  done,
  onSelectMission,
  onToggle
}: {
  mission: Mission;
  actions: Action[];
  done: Record<string, boolean>;
  onSelectMission: (id: MissionId) => void;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="split-view">
      <aside className="left-list">
        {missions.map((item) => (
          <button key={item.id} className={item.id === mission.id ? "list-row active" : "list-row"} onClick={() => onSelectMission(item.id)}>
            <span className={`status-dot ${item.tone}`} />
            <span>
              <strong>{item.label}</strong>
              <small>{item.orbit}</small>
            </span>
          </button>
        ))}
      </aside>
      <section className="mission-detail">
        <div className={`mission-hero ${mission.tone}`}>
          <span>{mission.orbit}</span>
          <h2>{mission.label}</h2>
          <p>{mission.mandate}</p>
        </div>
        <div className="intel-grid">
          <Intel title="Proof" copy={mission.proof} icon={<Target />} />
          <Intel title="Risk" copy={mission.risk} icon={<ShieldCheck />} />
          <div className="intel">
            <Timer />
            <h3>Next moves</h3>
            <ul>
              {mission.moves.map((move) => (
                <li key={move}>{move}</li>
              ))}
            </ul>
          </div>
        </div>
        <section className="queue-panel compact">
          <PanelHeader icon={<ClipboardList />} label="Linked moves" meta={mission.label} />
          <div className="action-list">
            {actions
              .filter((action) => action.mission === mission.id)
              .map((action) => (
                <article className={done[action.id] ? "action done" : "action"} key={action.id}>
                  <button className="check" onClick={() => onToggle(action.id)} aria-label="Toggle action">
                    <Check />
                  </button>
                  <div>
                    <div className="action-title">{action.title}</div>
                    <p>{action.leverage}</p>
                  </div>
                </article>
              ))}
          </div>
        </section>
      </section>
    </div>
  );
}

function PipelinesView({
  active,
  rows,
  onActive,
  onAdd
}: {
  active: string;
  rows: Record<string, PipelineRow[]>;
  onActive: (value: string) => void;
  onAdd: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const activeRows = rows[active] ?? [];
  return (
    <div className="pipeline-view">
      <div className="tabs">
        {Object.keys(pipelineSeeds).map((item) => (
          <button key={item} className={item === active ? "tab active" : "tab"} onClick={() => onActive(item)}>
            {item}
          </button>
        ))}
      </div>
      <form className="pipeline-add" onSubmit={onAdd}>
        <input name="name" placeholder="Name" maxLength={120} />
        <input name="counterparty" placeholder="Counterparty" maxLength={120} />
        <input name="next" placeholder="Next step" maxLength={220} />
        <input name="signal" placeholder="Signal" maxLength={40} />
        <button type="submit">
          <Plus />
        </button>
      </form>
      <section className="pipeline-table">
        {activeRows.map((row) => (
          <article className="pipeline-row" key={row.id}>
            <div>
              <strong>{row.name}</strong>
              <span>{row.counterparty}</span>
            </div>
            <p>{row.next}</p>
            <span className="score">{row.signal}</span>
            <ArrowRight />
          </article>
        ))}
      </section>
    </div>
  );
}

function DossiersView({
  active,
  note,
  onActive,
  onSaveNote
}: {
  active: Dossier;
  note: string;
  onActive: (value: string) => void;
  onSaveNote: (dossierId: string, body: string) => void;
}) {
  const [draft, setDraft] = useState(note);

  useEffect(() => {
    setDraft(note);
  }, [active.id, note]);

  return (
    <div className="split-view">
      <aside className="left-list">
        {dossiers.map((item) => (
          <button key={item.id} className={item.id === active.id ? "list-row active" : "list-row"} onClick={() => onActive(item.id)}>
            <Archive />
            <span>
              <strong>{item.title}</strong>
              <small>{item.source}</small>
            </span>
          </button>
        ))}
      </aside>
      <article className="doc-surface">
        <span>{active.source}</span>
        <h2>{active.title}</h2>
        {active.sections.map((section) => (
          <section key={section.title}>
            <h3>{section.title}</h3>
            <ul>
              {section.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        ))}
        <form
          className="dossier-note"
          onSubmit={(event) => {
            event.preventDefault();
            onSaveNote(active.id, draft);
          }}
        >
          <label htmlFor="dossier-note">Operator note</label>
          <textarea id="dossier-note" value={draft} onChange={(event) => setDraft(event.target.value)} rows={7} />
          <button type="submit">
            <Save />
            Save note
          </button>
        </form>
      </article>
    </div>
  );
}

function BriefView({ onCopy }: { onCopy: () => void }) {
  return (
    <div className="brief-view">
      <article className="memo-page">
        <div className="memo-top">
          <span>Weekly operator memo</span>
          <button onClick={onCopy}>
            <Copy />
            Copy
          </button>
        </div>
        <h2>Do not publish the concept. Productize the operating system.</h2>
        <p>
          Agentic Unicorn OS has one job: compress founder strategy into executable moves across product,
          distribution, capital, M&A and premium consulting.
        </p>
        <ul>
          <li>Build the app shell as the first proof of taste and execution.</li>
          <li>Keep every action tied to revenue, distribution or strategic optionality.</li>
          <li>Prepare the public repo only after the product surface feels real.</li>
        </ul>
      </article>
      <aside className="brief-side">
        {missions.map((mission) => (
          <div className="brief-line" key={mission.id}>
            <span className={`status-dot ${mission.tone}`} />
            <div>
              <strong>{mission.label}</strong>
              <small>{mission.moves[0]}</small>
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}

function PanelHeader({ icon, label, meta }: { icon: ReactNode; label: string; meta: string }) {
  return (
    <div className="panel-header">
      <div>
        {icon}
        <span>{label}</span>
      </div>
      <small>{meta}</small>
    </div>
  );
}

function Pulse({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="pulse">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Intel({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) {
  return (
    <div className="intel">
      {icon}
      <h3>{title}</h3>
      <p>{copy}</p>
    </div>
  );
}

function rowToAction(row: ActionRow): Action {
  return {
    id: row.id,
    mission: row.mission,
    title: row.title,
    leverage: row.leverage,
    due: row.due
  };
}

function pipelineRowFromDb(row: PipelineItemRow): PipelineRow {
  return {
    id: row.id,
    lane: row.lane,
    name: row.name,
    counterparty: row.counterparty,
    next: row.next_step,
    signal: row.signal
  };
}

function groupPipelineRows(rows: PipelineItemRow[]): Record<string, PipelineRow[]> {
  const grouped = makeDefaultPipelines();
  Object.keys(grouped).forEach((lane) => {
    grouped[lane] = [];
  });

  rows.forEach((row) => {
    const item = pipelineRowFromDb(row);
    grouped[item.lane] = [...(grouped[item.lane] ?? []), item];
  });

  return grouped;
}

function stateLabel(state: SyncState) {
  if (state === "loading") return "Loading";
  if (state === "saving") return "Saving";
  if (state === "error") return "Check DB";
  return "Cloud";
}

function viewTitle(view: ViewId) {
  return views.find((item) => item.id === view)?.label ?? "Today";
}

function weeklyBrief() {
  return `Agentic Unicorn OS - Weekly Brief

Focus: productize the operating system, not the concept.

Moves:
1. Ship the real app shell.
2. Tie distribution to product CTA.
3. Keep capital, M&A and consulting as live options.

Risk: generic software taste. The interface must feel like a founder command surface.`;
}
