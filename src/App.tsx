import {
  Activity,
  Archive,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Building2,
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
  Pencil,
  Plus,
  Rocket,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  Trash2,
  User,
  UserPlus,
  Users,
  X
} from "lucide-react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { hasSupabaseConfig, supabase } from "./lib/supabase";

type ViewId = "today" | "missions" | "pipelines" | "dossiers" | "team" | "brief";
type MissionId = "product" | "distribution" | "capital" | "ma" | "consulting";
type Tone = "mint" | "blue" | "amber" | "coral" | "lime";
type AuthMode = "signin" | "signup";
type SyncState = "local" | "loading" | "ready" | "saving" | "error";
type CloudMode = "metadata" | "postgres";
type OrgRole = "owner" | "admin" | "member" | "viewer";
type InviteStatus = "pending" | "accepted" | "revoked" | "expired";

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

type OrganizationRow = {
  id: string;
  name: string;
  slug: string | null;
  owner_id: string;
  access_state: "active" | "suspended" | "deleted";
};

type OrganizationMemberRow = {
  organization_id: string;
  user_id: string;
  role: OrgRole;
  profiles?: {
    email?: string | null;
    display_name?: string | null;
  } | null;
};

type OrganizationInvitationRow = {
  id: string;
  organization_id: string;
  email: string;
  role: Exclude<OrgRole, "owner">;
  status: InviteStatus;
  created_at: string;
};

type AuditEventRow = {
  id: string;
  action: string;
  entity_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type WorkspaceAction = Action & {
  done?: boolean;
};

type WorkspaceOrg = {
  id: string;
  name: string;
  slug: string;
  role: OrgRole;
  accessState: "active" | "suspended" | "deleted";
};

type WorkspaceMember = {
  id: string;
  email: string;
  role: OrgRole;
};

type WorkspaceInvite = {
  id: string;
  email: string;
  role: Exclude<OrgRole, "owner">;
  status: InviteStatus;
  createdAt: string;
};

type WorkspaceAuditEvent = {
  id: string;
  action: string;
  entity: string;
  detail: string;
  createdAt: string;
};

type CloudWorkspace = {
  version: 1;
  actions: WorkspaceAction[];
  pipelines: Record<string, PipelineRow[]>;
  notes: Record<string, string>;
  organization: WorkspaceOrg;
  members: WorkspaceMember[];
  invitations: WorkspaceInvite[];
  auditEvents: WorkspaceAuditEvent[];
  updatedAt: string;
};

const views: Array<{ id: ViewId; label: string; icon: ReactNode }> = [
  { id: "today", label: "Today", icon: <CalendarDays /> },
  { id: "missions", label: "Missions", icon: <Layers3 /> },
  { id: "pipelines", label: "Pipelines", icon: <GitBranch /> },
  { id: "dossiers", label: "Dossiers", icon: <FileText /> },
  { id: "team", label: "Team", icon: <Users /> },
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
  const [organization, setOrganization] = useState<WorkspaceOrg>(() => makeDefaultOrganization());
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvite[]>([]);
  const [auditEvents, setAuditEvents] = useState<WorkspaceAuditEvent[]>([]);
  const [commandOpen, setCommandOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [authLoading, setAuthLoading] = useState(hasSupabaseConfig);
  const [authMessage, setAuthMessage] = useState("");
  const [syncState, setSyncState] = useState<SyncState>(hasSupabaseConfig ? "loading" : "local");
  const [syncError, setSyncError] = useState("");
  const [cloudMode, setCloudMode] = useState<CloudMode>("metadata");

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
      if (!nextSession) {
        setSyncState("ready");
      } else if (_event === "SIGNED_IN") {
        setSyncState("loading");
      }
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
      setSyncError("");
      try {
        let postgresWorkspace: CloudWorkspace | null = null;
        try {
          postgresWorkspace = await loadPostgresWorkspace(currentUser, db);
        } catch (error) {
          if (!isMissingPostgresWorkspace(error)) throw error;
        }

        const existing = postgresWorkspace ?? normalizeWorkspace(currentUser.user_metadata?.auos_workspace);
        const workspace = existing ?? makeInitialWorkspace();

        if (cancelled) return;

        setCloudMode(postgresWorkspace ? "postgres" : "metadata");
        setCloudActions(stripWorkspaceActions(workspace.actions));
        setDone(actionDoneMap(workspace.actions));
        setCloudPipelines(workspace.pipelines);
        setDossierNotes(workspace.notes);
        setOrganization(workspace.organization);
        setMembers(workspace.members);
        setInvitations(workspace.invitations);
        setAuditEvents(workspace.auditEvents);

        if (!postgresWorkspace && !existing) {
          const { data, error } = await db.auth.updateUser({
            data: { auos_workspace: workspace }
          });

          if (error) throw error;
          if (data.user && !cancelled) {
            setSession((current) => (current ? { ...current, user: data.user } : current));
          }
        }

        setSyncState("ready");
      } catch (error) {
        if (cancelled) return;
        console.error(error);
        const message = readableError(error);
        setSyncState("error");
        setSyncError(message);
        flash("Database not ready");
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

  function makeWorkspaceSnapshot(
    nextActions = cloudActions,
    nextDone = done,
    nextPipelines = cloudPipelines,
    nextNotes = dossierNotes,
    nextOrganization = organization,
    nextMembers = members,
    nextInvitations = invitations,
    nextAuditEvents = auditEvents
  ): CloudWorkspace {
    return {
      version: 1,
      actions: nextActions.map((action) => ({ ...action, done: Boolean(nextDone[action.id]) })),
      pipelines: nextPipelines,
      notes: nextNotes,
      organization: nextOrganization,
      members: nextMembers,
      invitations: nextInvitations,
      auditEvents: nextAuditEvents.slice(0, 50),
      updatedAt: new Date().toISOString()
    };
  }

  async function persistWorkspace(workspace: CloudWorkspace) {
    if (!supabase) return false;

    setSyncState("saving");
    setSyncError("");

    const { data, error } = await supabase.auth.updateUser({
      data: { auos_workspace: workspace }
    });

    if (error) {
      setSyncState("error");
      setSyncError(readableError(error));
      flash("Workspace not synced");
      return false;
    }

    if (data.user) {
      setSession((current) => (current ? { ...current, user: data.user } : current));
    }
    setSyncState("ready");
    setSyncError("");
    return true;
  }

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

    if (isCloud && supabase && user && cloudMode === "postgres") {
      setSyncState("saving");
      setSyncError("");
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
        setSyncError(readableError(error));
        flash("Action not saved");
        return;
      }

      const row = inserted as ActionRow;
      setCloudActions((items) => [rowToAction(row), ...items]);
      setDone((items) => ({ ...items, [row.id]: row.done }));
      setSyncState("ready");
      flash("Action saved");
    } else if (isCloud && supabase && user) {
      const cloudDraft = { ...draft, id: makeId("action") };
      const nextActions = [cloudDraft, ...cloudActions];
      const nextDone = { ...done, [cloudDraft.id]: false };

      setCloudActions(nextActions);
      setDone(nextDone);

      if (await persistWorkspace(makeWorkspaceSnapshot(nextActions, nextDone))) {
        flash("Action saved");
      }
    } else {
      setLocalActions((items) => [draft, ...items]);
      flash("Action saved locally");
    }

    form.reset();
  }

  async function toggleAction(id: string) {
    const nextValue = !done[id];
    const nextDone = { ...done, [id]: nextValue };
    setDone(nextDone);

    if (isCloud && supabase && cloudMode === "postgres") {
      setSyncState("saving");
      setSyncError("");
      const { error } = await supabase
        .from("operator_actions")
        .update({ done: nextValue })
        .eq("id", id);

      if (error) {
        setDone(done);
        setSyncState("error");
        setSyncError(readableError(error));
        flash("Action not synced");
        return;
      }

      setSyncState("ready");
    } else if (isCloud && supabase) {
      const synced = await persistWorkspace(makeWorkspaceSnapshot(cloudActions, nextDone));
      if (!synced) {
        setDone(done);
      }
    }
  }

  async function updateAction(nextAction: Action) {
    if (isCloud && supabase && cloudMode === "postgres") {
      setSyncState("saving");
      setSyncError("");
      const { error } = await supabase
        .from("operator_actions")
        .update({
          mission: nextAction.mission,
          title: nextAction.title,
          leverage: nextAction.leverage,
          due: nextAction.due
        })
        .eq("id", nextAction.id);

      if (error) {
        setSyncState("error");
        setSyncError(readableError(error));
        flash("Action not updated");
        return;
      }

      const nextActions = cloudActions.map((item) => (item.id === nextAction.id ? nextAction : item));
      setCloudActions(nextActions);
      setSyncState("ready");
      flash("Action updated");
      return;
    }

    if (isCloud && supabase) {
      const nextActions = cloudActions.map((item) => (item.id === nextAction.id ? nextAction : item));
      setCloudActions(nextActions);
      if (await persistWorkspace(makeWorkspaceSnapshot(nextActions))) {
        flash("Action updated");
      }
      return;
    }

    setLocalActions((items) => items.map((item) => (item.id === nextAction.id ? nextAction : item)));
    flash("Action updated locally");
  }

  async function deleteAction(id: string) {
    if (isCloud && supabase && cloudMode === "postgres") {
      setSyncState("saving");
      setSyncError("");
      const { error } = await supabase.from("operator_actions").delete().eq("id", id);

      if (error) {
        setSyncState("error");
        setSyncError(readableError(error));
        flash("Action not deleted");
        return;
      }

      const nextActions = cloudActions.filter((item) => item.id !== id);
      const nextDone = removeRecordKey(done, id);

      setCloudActions(nextActions);
      setDone(nextDone);
      setSyncState("ready");
      flash("Action deleted");
      return;
    }

    if (isCloud && supabase) {
      const nextActions = cloudActions.filter((item) => item.id !== id);
      const nextDone = removeRecordKey(done, id);

      setCloudActions(nextActions);
      setDone(nextDone);

      if (await persistWorkspace(makeWorkspaceSnapshot(nextActions, nextDone))) {
        flash("Action deleted");
      }
      return;
    }

    setLocalActions((items) => items.filter((item) => item.id !== id));
    setDone((items) => removeRecordKey(items, id));
    flash("Action deleted locally");
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

    if (isCloud && supabase && user && cloudMode === "postgres") {
      setSyncState("saving");
      setSyncError("");
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
        setSyncError(readableError(error));
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
    } else if (isCloud && supabase && user) {
      const cloudDraft = { ...draft, id: makeId("pipeline") };
      const nextPipelines = {
        ...cloudPipelines,
        [cloudDraft.lane]: [cloudDraft, ...(cloudPipelines[cloudDraft.lane] ?? [])]
      };

      setCloudPipelines(nextPipelines);

      if (await persistWorkspace(makeWorkspaceSnapshot(cloudActions, done, nextPipelines))) {
        flash("Pipeline saved");
      }
    } else {
      setLocalPipelines((items) => ({
        ...items,
        [draft.lane]: [draft, ...(items[draft.lane] ?? [])]
      }));
      flash("Pipeline saved locally");
    }

    form.reset();
  }

  async function updatePipelineItem(nextRow: PipelineRow) {
    if (isCloud && supabase && cloudMode === "postgres") {
      setSyncState("saving");
      setSyncError("");
      const { error } = await supabase
        .from("pipeline_items")
        .update({
          lane: nextRow.lane,
          name: nextRow.name,
          counterparty: nextRow.counterparty,
          next_step: nextRow.next,
          signal: nextRow.signal
        })
        .eq("id", nextRow.id);

      if (error) {
        setSyncState("error");
        setSyncError(readableError(error));
        flash("Pipeline item not updated");
        return;
      }

      const nextPipelines = replacePipelineRow(cloudPipelines, nextRow);
      setCloudPipelines(nextPipelines);
      setSyncState("ready");
      flash("Pipeline updated");
      return;
    }

    if (isCloud && supabase) {
      const nextPipelines = replacePipelineRow(cloudPipelines, nextRow);
      setCloudPipelines(nextPipelines);
      if (await persistWorkspace(makeWorkspaceSnapshot(cloudActions, done, nextPipelines))) {
        flash("Pipeline updated");
      }
      return;
    }

    setLocalPipelines((items) => replacePipelineRow(items, nextRow));
    flash("Pipeline updated locally");
  }

  async function deletePipelineItem(row: PipelineRow) {
    if (isCloud && supabase && cloudMode === "postgres") {
      setSyncState("saving");
      setSyncError("");
      const { error } = await supabase.from("pipeline_items").delete().eq("id", row.id);

      if (error) {
        setSyncState("error");
        setSyncError(readableError(error));
        flash("Pipeline item not deleted");
        return;
      }

      const nextPipelines = removePipelineRow(cloudPipelines, row);
      setCloudPipelines(nextPipelines);
      setSyncState("ready");
      flash("Pipeline deleted");
      return;
    }

    if (isCloud && supabase) {
      const nextPipelines = removePipelineRow(cloudPipelines, row);
      setCloudPipelines(nextPipelines);
      if (await persistWorkspace(makeWorkspaceSnapshot(cloudActions, done, nextPipelines))) {
        flash("Pipeline deleted");
      }
      return;
    }

    setLocalPipelines((items) => removePipelineRow(items, row));
    flash("Pipeline deleted locally");
  }

  async function saveDossierNote(dossierKey: string, body: string) {
    const nextNotes = { ...dossierNotes, [dossierKey]: body };
    setDossierNotes(nextNotes);

    if (isCloud && supabase && user && cloudMode === "postgres") {
      setSyncState("saving");
      setSyncError("");
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
        setSyncError(readableError(error));
        flash("Note not synced");
        return;
      }

      setSyncState("ready");
      flash("Note saved");
    } else if (isCloud && supabase && user) {
      if (await persistWorkspace(makeWorkspaceSnapshot(cloudActions, done, cloudPipelines, nextNotes))) {
        flash("Note saved");
      }
    } else {
      flash("Note saved locally");
    }
  }

  async function updateOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    if (!name) return;

    const nextOrganization = {
      ...organization,
      name,
      slug: slugify(name)
    };
    const nextAuditEvents = addAuditEvent(auditEvents, "organization.updated", "organization", name);

    setOrganization(nextOrganization);
    setAuditEvents(nextAuditEvents);

    if (isCloud && supabase && user && cloudMode === "postgres" && !organization.id.startsWith("local-")) {
      setSyncState("saving");
      setSyncError("");
      const { error } = await supabase
        .from("organizations")
        .update({ name: nextOrganization.name, slug: nextOrganization.slug })
        .eq("id", organization.id);

      if (error) {
        setSyncState("error");
        setSyncError(readableError(error));
        flash("Workspace not updated");
        return;
      }

      await recordPostgresAudit("organization.updated", "organization", nextOrganization.name);
      setSyncState("ready");
      flash("Workspace updated");
      return;
    }

    if (isCloud && supabase) {
      if (await persistWorkspace(makeWorkspaceSnapshot(cloudActions, done, cloudPipelines, dossierNotes, nextOrganization, members, invitations, nextAuditEvents))) {
        flash("Workspace updated");
      }
      return;
    }

    flash("Workspace updated locally");
  }

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim().toLowerCase();
    const role = String(data.get("role") ?? "member") as Exclude<OrgRole, "owner">;
    if (!email || !email.includes("@")) return;

    const invitation: WorkspaceInvite = {
      id: makeId("invite"),
      email,
      role: role === "admin" || role === "viewer" ? role : "member",
      status: "pending",
      createdAt: new Date().toISOString()
    };
    const nextInvitations = [invitation, ...invitations].slice(0, 100);
    const nextAuditEvents = addAuditEvent(auditEvents, "invitation.created", "invitation", email);

    setInvitations(nextInvitations);
    setAuditEvents(nextAuditEvents);

    if (isCloud && supabase && user && cloudMode === "postgres" && !organization.id.startsWith("local-")) {
      setSyncState("saving");
      setSyncError("");
      const { error } = await supabase
        .from("organization_invitations")
        .insert({
          organization_id: organization.id,
          email: invitation.email,
          role: invitation.role,
          invited_by: user.id,
          status: invitation.status
        });

      if (error) {
        setSyncState("error");
        setSyncError(readableError(error));
        flash("Invite not saved");
        return;
      }

      await recordPostgresAudit("invitation.created", "invitation", invitation.email);
      setSyncState("ready");
      flash("Invite staged");
      form.reset();
      return;
    }

    if (isCloud && supabase) {
      if (await persistWorkspace(makeWorkspaceSnapshot(cloudActions, done, cloudPipelines, dossierNotes, organization, members, nextInvitations, nextAuditEvents))) {
        flash("Invite staged");
        form.reset();
      }
      return;
    }

    flash("Invite staged locally");
    form.reset();
  }

  async function recordPostgresAudit(action: string, entity: string, detail: string) {
    if (!supabase || !user) return;
    await supabase.from("audit_events").insert({
      organization_id: organization.id.startsWith("local-") ? null : organization.id,
      actor_id: user.id,
      action,
      entity_type: entity,
      metadata: { detail }
    });
  }

  const commandItems = useMemo(() => {
    return [
      { title: "Copy weekly brief", meta: "Operator memo", icon: <Copy />, run: copyBrief },
      { title: "Today", meta: "Execution queue", icon: <CalendarDays />, run: () => setView("today") },
      { title: "Missions", meta: "Strategic axes", icon: <Layers3 />, run: () => setView("missions") },
      { title: "Pipelines", meta: "Counterparties", icon: <GitBranch />, run: () => setView("pipelines") },
      { title: "Dossiers", meta: "Living docs", icon: <FileText />, run: () => setView("dossiers") },
      { title: "Team", meta: "Workspace, roles, invitations", icon: <Users />, run: () => setView("team") },
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
        <button className="mark" aria-label="Agentic Unicorn OS" onClick={() => setView("today")}>AGU.OS</button>
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
              <span>{syncError || "Run the SQL schema in Supabase, then reload."}</span>
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
              onUpdateAction={updateAction}
              onDeleteAction={deleteAction}
            />
          )}
          {view === "missions" && (
            <MissionsView
              mission={mission}
              actions={actions}
              done={done}
              onSelectMission={setMissionId}
              onToggle={toggleAction}
              onUpdateAction={updateAction}
              onDeleteAction={deleteAction}
            />
          )}
          {view === "pipelines" && (
            <PipelinesView
              active={pipeline}
              rows={pipelineRows}
              onActive={setPipeline}
              onAdd={addPipelineItem}
              onUpdate={updatePipelineItem}
              onDelete={deletePipelineItem}
            />
          )}
          {view === "dossiers" && (
            <DossiersView
              active={dossier}
              note={dossierNotes[dossier.id] ?? ""}
              onActive={setDossierId}
              onSaveNote={saveDossierNote}
            />
          )}
          {view === "team" && (
            <TeamView
              organization={organization}
              members={members}
              invitations={invitations}
              auditEvents={auditEvents}
              mode={cloudMode}
              onUpdateOrganization={updateOrganization}
              onInviteMember={inviteMember}
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
        <div className="auth-mark">AGU.OS</div>
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
          <span>Actions, pipelines and notes are saved to the authenticated workspace.</span>
        </div>
        <div>
          <ShieldCheck />
          <strong>User scoped</strong>
          <span>Each workspace is attached to the signed-in Supabase user.</span>
        </div>
      </aside>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="auth-screen">
      <section className="auth-card compact-auth">
        <div className="auth-mark">AGU.OS</div>
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
  onAddAction,
  onUpdateAction,
  onDeleteAction
}: {
  mission: Mission;
  actions: Action[];
  done: Record<string, boolean>;
  onToggle: (id: string) => void;
  onSelectMission: (id: MissionId) => void;
  onAddAction: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateAction: (action: Action) => void;
  onDeleteAction: (id: string) => void;
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
              <ActionCard
                key={action.id}
                action={action}
                done={Boolean(done[action.id])}
                mission={itemMission}
                onToggle={onToggle}
                onUpdate={onUpdateAction}
                onDelete={onDeleteAction}
              />
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
  onToggle,
  onUpdateAction,
  onDeleteAction
}: {
  mission: Mission;
  actions: Action[];
  done: Record<string, boolean>;
  onSelectMission: (id: MissionId) => void;
  onToggle: (id: string) => void;
  onUpdateAction: (action: Action) => void;
  onDeleteAction: (id: string) => void;
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
                <ActionCard
                  key={action.id}
                  action={action}
                  done={Boolean(done[action.id])}
                  mission={mission}
                  onToggle={onToggle}
                  onUpdate={onUpdateAction}
                  onDelete={onDeleteAction}
                  compact
                />
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
  onAdd,
  onUpdate,
  onDelete
}: {
  active: string;
  rows: Record<string, PipelineRow[]>;
  onActive: (value: string) => void;
  onAdd: (event: FormEvent<HTMLFormElement>) => void;
  onUpdate: (row: PipelineRow) => void;
  onDelete: (row: PipelineRow) => void;
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
          <PipelineRowCard key={row.id} row={row} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </section>
    </div>
  );
}

function ActionCard({
  action,
  done,
  mission,
  onToggle,
  onUpdate,
  onDelete,
  compact = false
}: {
  action: Action;
  done: boolean;
  mission: Mission;
  onToggle: (id: string) => void;
  onUpdate: (action: Action) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextMission = String(data.get("mission") ?? action.mission) as MissionId;
    const title = String(data.get("title") ?? "").trim();
    const leverage = String(data.get("leverage") ?? "").trim();
    const due = String(data.get("due") ?? "").trim() || "Today";
    if (!title) return;

    onUpdate({
      ...action,
      mission: missions.some((item) => item.id === nextMission) ? nextMission : action.mission,
      title,
      leverage,
      due
    });
    setEditing(false);
  }

  return (
    <article className={done ? "action done" : "action"}>
      <button className="check" onClick={() => onToggle(action.id)} aria-label="Toggle action">
        <Check />
      </button>
      {editing ? (
        <form className="edit-card" onSubmit={submit}>
          <input name="title" defaultValue={action.title} maxLength={160} />
          <textarea name="leverage" defaultValue={action.leverage} rows={3} />
          <div className="edit-grid">
            <select name="mission" defaultValue={action.mission}>
              {missions.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
            <input name="due" defaultValue={action.due} maxLength={40} />
          </div>
          <div className="edit-actions">
            <button type="submit">
              <Save />
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <div className="action-main">
          <div className="action-heading">
            <div className="action-title">{action.title}</div>
            <div className="action-tools">
              <button className="mini-icon" onClick={() => setEditing(true)} aria-label="Edit action" title="Edit action">
                <Pencil />
              </button>
              <button className="mini-icon danger" onClick={() => onDelete(action.id)} aria-label="Delete action" title="Delete action">
                <Trash2 />
              </button>
            </div>
          </div>
          <p>{action.leverage}</p>
          {!compact && (
            <div className="chips">
              <span className={`chip ${mission.tone}`}>{mission.label}</span>
              <span className="chip neutral">{action.due}</span>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function PipelineRowCard({
  row,
  onUpdate,
  onDelete
}: {
  row: PipelineRow;
  onUpdate: (row: PipelineRow) => void;
  onDelete: (row: PipelineRow) => void;
}) {
  const [editing, setEditing] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    if (!name) return;

    onUpdate({
      ...row,
      lane: String(data.get("lane") ?? row.lane),
      name,
      counterparty: String(data.get("counterparty") ?? "").trim(),
      next: String(data.get("next") ?? "").trim(),
      signal: String(data.get("signal") ?? "").trim()
    });
    setEditing(false);
  }

  if (editing) {
    return (
      <form className="pipeline-row editing" onSubmit={submit}>
        <div className="pipeline-edit-stack">
          <input name="name" defaultValue={row.name} maxLength={120} />
          <input name="counterparty" defaultValue={row.counterparty} maxLength={120} />
        </div>
        <input name="next" defaultValue={row.next} maxLength={220} />
        <div className="pipeline-edit-stack">
          <select name="lane" defaultValue={row.lane}>
            {Object.keys(pipelineSeeds).map((lane) => (
              <option key={lane} value={lane}>{lane}</option>
            ))}
          </select>
          <input name="signal" defaultValue={row.signal} maxLength={40} />
        </div>
        <div className="row-tools">
          <button className="mini-icon solid" type="submit" aria-label="Save pipeline item" title="Save">
            <Save />
          </button>
          <button className="mini-icon" type="button" onClick={() => setEditing(false)} aria-label="Cancel edit" title="Cancel">
            <X />
          </button>
        </div>
      </form>
    );
  }

  return (
    <article className="pipeline-row">
      <div>
        <strong>{row.name}</strong>
        <span>{row.counterparty}</span>
      </div>
      <p>{row.next}</p>
      <span className="score">{row.signal}</span>
      <div className="row-tools">
        <button className="mini-icon" onClick={() => setEditing(true)} aria-label="Edit pipeline item" title="Edit">
          <Pencil />
        </button>
        <button className="mini-icon danger" onClick={() => onDelete(row)} aria-label="Delete pipeline item" title="Delete">
          <Trash2 />
        </button>
      </div>
    </article>
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

function TeamView({
  organization,
  members,
  invitations,
  auditEvents,
  mode,
  onUpdateOrganization,
  onInviteMember
}: {
  organization: WorkspaceOrg;
  members: WorkspaceMember[];
  invitations: WorkspaceInvite[];
  auditEvents: WorkspaceAuditEvent[];
  mode: CloudMode;
  onUpdateOrganization: (event: FormEvent<HTMLFormElement>) => void;
  onInviteMember: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="team-view">
      <section className="team-hero">
        <div>
          <div className="section-label">
            <Building2 />
            <span>Workspace</span>
          </div>
          <h2>{organization.name}</h2>
          <p>{organization.slug}.agentic-unicorn-os</p>
        </div>
        <div className="team-status">
          <span>{mode === "postgres" ? "Postgres/RLS" : "Auth fallback"}</span>
          <strong>{organization.accessState}</strong>
        </div>
      </section>

      <section className="team-grid">
        <article className="team-panel">
          <PanelHeader icon={<Building2 />} label="Organization" meta={organization.role} />
          <form className="team-form" onSubmit={onUpdateOrganization}>
            <label>
              <span>Name</span>
              <input name="name" defaultValue={organization.name} maxLength={120} />
            </label>
            <button type="submit">
              <Save />
              Save
            </button>
          </form>
        </article>

        <article className="team-panel">
          <PanelHeader icon={<UserPlus />} label="Invite" meta="No billing" />
          <form className="team-form" onSubmit={onInviteMember}>
            <label>
              <span>Email</span>
              <input name="email" type="email" placeholder="operator@company.com" />
            </label>
            <label>
              <span>Role</span>
              <select name="role" defaultValue="member">
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </label>
            <button type="submit">
              <UserPlus />
              Stage invite
            </button>
          </form>
        </article>

        <article className="team-panel wide">
          <PanelHeader icon={<Users />} label="Members" meta={`${members.length} active`} />
          <div className="team-list">
            {members.map((member) => (
              <div className="team-row" key={member.id}>
                <span className="team-avatar">{member.email.slice(0, 2).toUpperCase()}</span>
                <div>
                  <strong>{member.email}</strong>
                  <small>{member.role}</small>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="team-panel">
          <PanelHeader icon={<UserPlus />} label="Invitations" meta={`${invitations.length} staged`} />
          <div className="team-list">
            {invitations.length === 0 && <p className="empty-state">No invitation staged.</p>}
            {invitations.map((invite) => (
              <div className="team-row" key={invite.id}>
                <span className="team-avatar">{invite.email.slice(0, 2).toUpperCase()}</span>
                <div>
                  <strong>{invite.email}</strong>
                  <small>{invite.role} / {invite.status}</small>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="team-panel">
          <PanelHeader icon={<Activity />} label="Audit" meta={`${auditEvents.length} events`} />
          <div className="audit-list">
            {auditEvents.length === 0 && <p className="empty-state">No audit event yet.</p>}
            {auditEvents.map((event) => (
              <div className="audit-row" key={event.id}>
                <strong>{event.action}</strong>
                <span>{event.detail}</span>
                <small>{new Date(event.createdAt).toLocaleString()}</small>
              </div>
            ))}
          </div>
        </article>
      </section>
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

async function loadPostgresWorkspace(
  currentUser: SupabaseUser,
  db: NonNullable<typeof supabase>
): Promise<CloudWorkspace | null> {
  let { data: actionData, error: actionError } = await db
    .from("operator_actions")
    .select("id, mission, title, leverage, due, done")
    .order("created_at", { ascending: true });

  if (actionError) {
    if (isMissingPostgresWorkspace(actionError)) return null;
    throw actionError;
  }

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

  if (pipelineError) {
    if (isMissingPostgresWorkspace(pipelineError)) return null;
    throw pipelineError;
  }

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

  if (noteError) {
    if (isMissingPostgresWorkspace(noteError)) return null;
    throw noteError;
  }

  const collaboration = await loadPostgresCollaboration(currentUser, db);

  return {
    version: 1,
    actions: actionRows.map((row) => ({ ...rowToAction(row), done: row.done })),
    pipelines: groupPipelineRows(pipelineItems),
    notes: Object.fromEntries(((noteData ?? []) as DossierNoteRow[]).map((note) => [note.dossier_id, note.body])),
    organization: collaboration.organization,
    members: collaboration.members,
    invitations: collaboration.invitations,
    auditEvents: collaboration.auditEvents,
    updatedAt: new Date().toISOString()
  };
}

async function loadPostgresCollaboration(
  currentUser: SupabaseUser,
  db: NonNullable<typeof supabase>
) {
  const fallback = makeDefaultCollaboration(currentUser.email ?? undefined);

  const organizations = await db
    .from("organizations")
    .select("id, name, slug, owner_id, access_state")
    .order("created_at", { ascending: true })
    .limit(1);

  if (organizations.error) {
    if (isMissingPostgresWorkspace(organizations.error)) return fallback;
    throw organizations.error;
  }

  let organizationRow = ((organizations.data ?? []) as OrganizationRow[])[0];
  if (!organizationRow) {
    const created = await db
      .from("organizations")
      .insert({
        name: fallback.organization.name,
        slug: fallback.organization.slug,
        owner_id: currentUser.id
      })
      .select("id, name, slug, owner_id, access_state")
      .single();

    if (created.error) throw created.error;
    organizationRow = created.data as OrganizationRow;
  }

  const membersResult = await db
    .from("organization_members")
    .select("organization_id, user_id, role")
    .eq("organization_id", organizationRow.id)
    .order("created_at", { ascending: true });

  if (membersResult.error) throw membersResult.error;

  const invitationsResult = await db
    .from("organization_invitations")
    .select("id, organization_id, email, role, status, created_at")
    .eq("organization_id", organizationRow.id)
    .order("created_at", { ascending: false });

  if (invitationsResult.error) throw invitationsResult.error;

  const auditResult = await db
    .from("audit_events")
    .select("id, action, entity_type, metadata, created_at")
    .eq("organization_id", organizationRow.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (auditResult.error) throw auditResult.error;

  return {
    organization: organizationFromRow(organizationRow, currentUser.id),
    members: ((membersResult.data ?? []) as OrganizationMemberRow[]).map((member) => ({
      id: member.user_id,
      email: member.user_id === currentUser.id ? currentUser.email ?? "operator" : "workspace member",
      role: member.role
    })),
    invitations: ((invitationsResult.data ?? []) as OrganizationInvitationRow[]).map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      createdAt: invite.created_at
    })),
    auditEvents: ((auditResult.data ?? []) as AuditEventRow[]).map((event) => ({
      id: event.id,
      action: event.action,
      entity: event.entity_type,
      detail: String(event.metadata?.detail ?? event.entity_type),
      createdAt: event.created_at
    }))
  };
}

function makeInitialWorkspace(): CloudWorkspace {
  const collaboration = makeDefaultCollaboration();
  return {
    version: 1,
    actions: seedActions.map((action) => ({ ...action, done: false })),
    pipelines: makeDefaultPipelines(),
    notes: {},
    organization: collaboration.organization,
    members: collaboration.members,
    invitations: collaboration.invitations,
    auditEvents: collaboration.auditEvents,
    updatedAt: new Date().toISOString()
  };
}

function normalizeWorkspace(value: unknown): CloudWorkspace | null {
  if (!value || typeof value !== "object") return null;
  const workspace = value as Partial<CloudWorkspace>;
  const initial = makeInitialWorkspace();

  return {
    version: 1,
    actions: normalizeWorkspaceActions(workspace.actions, initial.actions),
    pipelines: normalizePipelines(workspace.pipelines, initial.pipelines),
    notes: normalizeNotes(workspace.notes),
    organization: normalizeOrganization(workspace.organization, initial.organization),
    members: normalizeMembers(workspace.members, initial.members),
    invitations: normalizeInvitations(workspace.invitations),
    auditEvents: normalizeAuditEvents(workspace.auditEvents),
    updatedAt: typeof workspace.updatedAt === "string" ? workspace.updatedAt : new Date().toISOString()
  };
}

function normalizeWorkspaceActions(value: unknown, fallback: WorkspaceAction[]) {
  if (!Array.isArray(value)) return fallback;

  const actions = value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Partial<WorkspaceAction>;
    const mission = isMissionId(row.mission) ? row.mission : "product";
    const title = typeof row.title === "string" ? row.title.trim() : "";
    if (!title) return [];

    return [{
      id: typeof row.id === "string" && row.id ? row.id : makeId("action"),
      mission,
      title: title.slice(0, 160),
      leverage: typeof row.leverage === "string" ? row.leverage : "",
      due: typeof row.due === "string" && row.due ? row.due : "Today",
      done: Boolean(row.done)
    }];
  });

  return actions.length > 0 ? actions : fallback;
}

function normalizePipelines(value: unknown, fallback: Record<string, PipelineRow[]>) {
  if (!value || typeof value !== "object") return fallback;
  const next = Object.fromEntries(Object.keys(pipelineSeeds).map((lane) => [lane, []])) as Record<string, PipelineRow[]>;

  Object.entries(value as Record<string, unknown>).forEach(([lane, rows]) => {
    if (!Array.isArray(rows)) return;
    next[lane] = rows.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Partial<PipelineRow>;
      const name = typeof row.name === "string" ? row.name.trim() : "";
      if (!name) return [];

      return [{
        id: typeof row.id === "string" && row.id ? row.id : makeId("pipeline"),
        lane: typeof row.lane === "string" && row.lane ? row.lane : lane,
        name: name.slice(0, 120),
        counterparty: typeof row.counterparty === "string" ? row.counterparty : "",
        next: typeof row.next === "string" ? row.next : "",
        signal: typeof row.signal === "string" ? row.signal : ""
      }];
    });
  });

  return next;
}

function normalizeNotes(value: unknown) {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
}

function makeDefaultOrganization(email = "operator"): WorkspaceOrg {
  return {
    id: "local-default-org",
    name: "AGU.OS Workspace",
    slug: "agu-os-workspace",
    role: "owner",
    accessState: "active"
  };
}

function makeDefaultCollaboration(email = "operator") {
  return {
    organization: makeDefaultOrganization(email),
    members: [{
      id: "local-owner",
      email,
      role: "owner" as OrgRole
    }],
    invitations: [] as WorkspaceInvite[],
    auditEvents: [] as WorkspaceAuditEvent[]
  };
}

function organizationFromRow(row: OrganizationRow, userId: string): WorkspaceOrg {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug ?? slugify(row.name),
    role: row.owner_id === userId ? "owner" : "member",
    accessState: row.access_state
  };
}

function normalizeOrganization(value: unknown, fallback: WorkspaceOrg): WorkspaceOrg {
  if (!value || typeof value !== "object") return fallback;
  const organization = value as Partial<WorkspaceOrg>;
  const name = typeof organization.name === "string" && organization.name.trim()
    ? organization.name.trim().slice(0, 120)
    : fallback.name;

  return {
    id: typeof organization.id === "string" && organization.id ? organization.id : fallback.id,
    name,
    slug: typeof organization.slug === "string" && organization.slug ? organization.slug : slugify(name),
    role: isOrgRole(organization.role) ? organization.role : fallback.role,
    accessState: organization.accessState === "suspended" || organization.accessState === "deleted" ? organization.accessState : "active"
  };
}

function normalizeMembers(value: unknown, fallback: WorkspaceMember[]) {
  if (!Array.isArray(value)) return fallback;
  const members = value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const member = item as Partial<WorkspaceMember>;
    const email = typeof member.email === "string" && member.email.includes("@") ? member.email : "";
    if (!email) return [];
    return [{
      id: typeof member.id === "string" && member.id ? member.id : makeId("member"),
      email,
      role: isOrgRole(member.role) ? member.role : "member"
    }];
  });
  return members.length > 0 ? members : fallback;
}

function normalizeInvitations(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const invite = item as Partial<WorkspaceInvite>;
    const email = typeof invite.email === "string" && invite.email.includes("@") ? invite.email : "";
    if (!email) return [];
    const role: Exclude<OrgRole, "owner"> = invite.role === "admin" || invite.role === "viewer" ? invite.role : "member";
    return [{
      id: typeof invite.id === "string" && invite.id ? invite.id : makeId("invite"),
      email,
      role,
      status: isInviteStatus(invite.status) ? invite.status : "pending",
      createdAt: typeof invite.createdAt === "string" ? invite.createdAt : new Date().toISOString()
    }];
  });
}

function normalizeAuditEvents(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const event = item as Partial<WorkspaceAuditEvent>;
    const action = typeof event.action === "string" && event.action ? event.action : "";
    if (!action) return [];
    return [{
      id: typeof event.id === "string" && event.id ? event.id : makeId("audit"),
      action,
      entity: typeof event.entity === "string" && event.entity ? event.entity : "workspace",
      detail: typeof event.detail === "string" ? event.detail : "",
      createdAt: typeof event.createdAt === "string" ? event.createdAt : new Date().toISOString()
    }];
  }).slice(0, 50);
}

function addAuditEvent(events: WorkspaceAuditEvent[], action: string, entity: string, detail: string) {
  return [{
    id: makeId("audit"),
    action,
    entity,
    detail,
    createdAt: new Date().toISOString()
  }, ...events].slice(0, 50);
}

function stripWorkspaceActions(actions: WorkspaceAction[]): Action[] {
  return actions.map(({ done: _done, ...action }) => action);
}

function actionDoneMap(actions: WorkspaceAction[]) {
  return Object.fromEntries(actions.map((action) => [action.id, Boolean(action.done)]));
}

function isMissionId(value: unknown): value is MissionId {
  return typeof value === "string" && missions.some((mission) => mission.id === value);
}

function isOrgRole(value: unknown): value is OrgRole {
  return value === "owner" || value === "admin" || value === "member" || value === "viewer";
}

function isInviteStatus(value: unknown): value is InviteStatus {
  return value === "pending" || value === "accepted" || value === "revoked" || value === "expired";
}

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "agu-os-workspace";
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

function removeRecordKey<T>(record: Record<string, T>, key: string) {
  const next = { ...record };
  delete next[key];
  return next;
}

function replacePipelineRow(rows: Record<string, PipelineRow[]>, nextRow: PipelineRow) {
  const next = Object.fromEntries(
    Object.entries(rows).map(([lane, items]) => [
      lane,
      items.filter((item) => item.id !== nextRow.id)
    ])
  ) as Record<string, PipelineRow[]>;

  next[nextRow.lane] = [nextRow, ...(next[nextRow.lane] ?? [])];
  return next;
}

function removePipelineRow(rows: Record<string, PipelineRow[]>, target: PipelineRow) {
  return Object.fromEntries(
    Object.entries(rows).map(([lane, items]) => [
      lane,
      items.filter((item) => item.id !== target.id)
    ])
  ) as Record<string, PipelineRow[]>;
}

function readableError(error: unknown) {
  if (!error) return "Database action failed.";
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Database action failed.");
  }
  return "Database action failed.";
}

function isMissingPostgresWorkspace(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown };
  const code = String(candidate.code ?? "");
  const message = String(candidate.message ?? "").toLowerCase();
  return code === "42P01" || message.includes("does not exist") || message.includes("schema cache");
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
