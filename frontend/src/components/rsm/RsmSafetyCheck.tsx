import React from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Lock, ShieldCheck, XCircle } from "lucide-react";
import { cn } from "@/utils/cn";

/**
 * Dataset Safety Check (RSM) — presentation only.
 *
 * Every number, threshold and decision shown here comes from the backend `rsm_report`
 * (thresholds originate from config/default.yaml `rsm.policy`). Nothing is recalculated or
 * hardcoded in the browser, and the backend re-runs RSM when a plan is applied, so hiding or
 * enabling a button here can never authorise a repair on its own.
 */

export type RsmStatus = "PASS" | "WARN" | "BLOCK";

export interface RsmIssue {
  code: string;
  class?: string | null;
  cluster?: string;
  title?: string;
  message: string;
  explanation?: string;
  evidence?: Record<string, any>;
}

export interface RsmChecks {
  total_rows?: { original_rows: number; remaining_rows: number; threshold_block: number; status: string };
  classes: { class: string; original_rows: number; remaining_rows: number; removed_rows: number; retention: number; status: string }[];
  clusters: {
    class: string;
    cluster_id: string;
    original_rows: number;
    remaining_rows: number;
    retention: number;
    evaluated: boolean;
    status: string;
    reason?: string | null;
  }[];
  features: {
    original_count?: number | null;
    planned_removals: number;
    remaining_count?: number | null;
    names: string[];
    threshold_warn: number;
    triggered: boolean;
    status: string;
  };
}

export interface RsmReportV2 {
  status: RsmStatus;
  warnings: RsmIssue[];
  blocks: RsmIssue[];
  policy: Record<string, number>;
  requires_acknowledgement?: boolean;
  summary?: string;
  checks?: RsmChecks;
}

export interface TestIntegrity {
  status: "VERIFIED" | "FAILED";
  original_fingerprint: string;
  current_fingerprint: string;
  test_record_count: number;
  test_rows_touched?: number;
  verification_outcome: string;
}

/** The only place the UI decides whether an Apply button may be enabled (backend still re-checks). */
export function canApplyPlan(report: RsmReportV2 | undefined | null, acknowledged: boolean, integrity?: TestIntegrity | null): boolean {
  if (!report || !report.status) return false; // no report => never permissive
  if (integrity && integrity.status !== "VERIFIED") return false;
  if (report.status === "BLOCK") return false;
  if (report.status === "WARN") return acknowledged;
  return report.status === "PASS";
}

const pct = (x: number) => {
  const t = (x * 100).toFixed(1);
  return `${t.endsWith(".0") ? t.slice(0, -2) : t}%`;
};

const STATUS_STYLE: Record<string, { box: string; text: string; badge: string; label: string }> = {
  PASS: {
    box: "border-emerald-500/50 bg-emerald-500/10",
    text: "text-emerald-300",
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    label: "PASS",
  },
  WARN: {
    box: "border-amber-500/50 bg-amber-500/10",
    text: "text-amber-300",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    label: "WARN",
  },
  BLOCK: {
    box: "border-red-500/50 bg-red-500/10",
    text: "text-red-300",
    badge: "bg-red-500/20 text-red-300 border-red-500/40",
    label: "BLOCK",
  },
  NOT_EVALUATED: {
    box: "border-border bg-bg-elevated/40",
    text: "text-txt-muted",
    badge: "bg-slate-500/20 text-slate-300 border-slate-500/40",
    label: "NOT EVALUATED",
  },
};

const DECISION_COPY: Record<RsmStatus, { badge: string; headline: string; body: string }> = {
  PASS: {
    badge: "PASS — Safe to proceed",
    headline: "Your selected improvements meet the configured safety thresholds.",
    body: "No class, cluster or feature limit was exceeded. You still confirm before anything is applied.",
  },
  WARN: {
    badge: "WARN — Review before applying",
    headline: "Your selected improvements may remove a significant amount of training data.",
    body: "Review the affected classes and clusters below before continuing. You must acknowledge the warnings to apply.",
  },
  BLOCK: {
    badge: "BLOCK — Repair cannot be applied",
    headline: "One or more critical safety limits have been violated. SmellScope will not apply this repair plan.",
    body: "The backend will reject this plan. Adjust your selection and generate a new preview.",
  },
};

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const s = STATUS_STYLE[status] || STATUS_STYLE.NOT_EVALUATED;
  const icon = status === "PASS" ? "✓" : status === "WARN" ? "⚠" : status === "BLOCK" ? "✕" : "–";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold", s.badge)}>
      <span aria-hidden>{icon}</span>
      {s.label}
    </span>
  );
};

/** Retention bar with a text label; marker positions come from the policy values passed in. */
const RetentionBar: React.FC<{ value: number; warn?: number; block?: number; status: string; label: string }> = ({ value, warn, block, status, label }) => {
  const width = Math.max(0, Math.min(100, value * 100));
  const color = status === "BLOCK" ? "bg-red-400" : status === "WARN" ? "bg-amber-400" : status === "NOT_EVALUATED" ? "bg-slate-400" : "bg-emerald-400";
  return (
    <div className="space-y-1">
      <div
        className="relative h-2 w-full rounded-full bg-bg-main"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(width)}
        aria-label={label}
      >
        <div className={cn("h-2 rounded-full", color)} style={{ width: `${width}%` }} />
        {block !== undefined && <span className="absolute top-[-2px] h-3 w-px bg-red-300/80" style={{ left: `${block * 100}%` }} title={`Block below ${pct(block)}`} />}
        {warn !== undefined && <span className="absolute top-[-2px] h-3 w-px bg-amber-300/80" style={{ left: `${warn * 100}%` }} title={`Warn below ${pct(warn)}`} />}
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; hint?: string; children: React.ReactNode; testId?: string }> = ({ title, hint, children, testId }) => (
  <section className="rounded-xl border border-border bg-bg-elevated/50 p-4 space-y-3" data-testid={testId}>
    <div>
      <h4 className="text-sm font-bold text-txt-primary">{title}</h4>
      {hint && <p className="text-xs text-txt-muted mt-0.5">{hint}</p>}
    </div>
    {children}
  </section>
);

interface Props {
  report: RsmReportV2 | undefined | null;
  testIntegrity?: TestIntegrity | null;
  acknowledged: boolean;
  onAcknowledgedChange: (value: boolean) => void;
  /** Hide the beginner introduction (e.g. when already shown elsewhere). */
  compactIntro?: boolean;
}

export const RsmSafetyCheck: React.FC<Props> = ({ report, testIntegrity, acknowledged, onAcknowledgedChange, compactIntro }) => {
  if (!report || !report.status) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4" role="alert" data-testid="rsm-missing">
        <p className="text-sm font-bold text-red-300">Safety check unavailable</p>
        <p className="text-xs text-txt-muted mt-1">
          The backend did not return a safety result for this plan, so it cannot be applied. Generate the preview again.
        </p>
      </div>
    );
  }

  const status = report.status;
  const copy = DECISION_COPY[status];
  const style = STATUS_STYLE[status];
  const policy = report.policy || {};
  const checks = report.checks;
  const issues = [...report.blocks.map((b) => ({ ...b, level: "BLOCK" as const })), ...report.warnings.map((w) => ({ ...w, level: "WARN" as const }))];
  const evaluatedClusters = (checks?.clusters || []).filter((c) => c.evaluated);
  const skippedClusters = (checks?.clusters || []).filter((c) => !c.evaluated);
  const integrityFailed = !!testIntegrity && testIntegrity.status !== "VERIFIED";

  return (
    <div className="space-y-4" data-testid="rsm-safety-check" data-rsm-status={status}>
      {/* 1. Plain-language introduction */}
      <div className="rounded-xl border border-border bg-bg-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-accent-secondary" aria-hidden />
          <h3 className="text-sm font-bold text-txt-primary">Dataset Safety Check</h3>
        </div>
        {!compactIntro && (
          <>
            <p className="text-xs text-txt-secondary leading-relaxed">
              Before applying your selected improvements, SmellScope checks whether they remove too much important training data or
              reduce the diversity of attack patterns. This protects your dataset from excessive cleaning.
            </p>
            <div>
              <p className="text-xs font-semibold text-txt-primary">Why is this important?</p>
              <p className="text-xs text-txt-muted leading-relaxed">
                Removing too many records from a rare attack class may make it harder for a machine-learning model to learn that attack.
                RSM checks this risk before your improvements are applied.
              </p>
            </div>
          </>
        )}
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-semibold text-accent-secondary">
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden />
            How does RSM work?
          </summary>
          <div className="mt-2 space-y-2 text-xs text-txt-muted" data-testid="rsm-how-it-works">
            <p>
              RSM compares the training rows before and after your plan. Retention = remaining rows ÷ original rows. The limits below are
              loaded from the SmellScope configuration (<code className="font-mono">rsm.policy</code>) and are the same ones the backend enforces.
            </p>
            <table className="w-full text-left">
              <thead>
                <tr className="text-txt-primary">
                  <th className="py-1 pr-2 font-semibold">Check</th>
                  <th className="py-1 pr-2 font-semibold">WARN</th>
                  <th className="py-1 font-semibold">BLOCK</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-1 pr-2">Class training-row retention</td>
                  <td className="pr-2">below {pct(policy.min_class_retention_warn ?? 0)}</td>
                  <td>below {pct(policy.min_class_retention_block ?? 0)}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-2">Cluster retention (clusters with more than 5 rows)</td>
                  <td className="pr-2">below {pct(policy.min_cluster_retention_warn ?? 0)}</td>
                  <td>below {pct(policy.min_cluster_retention_block ?? 0)}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-2">Features removed in one plan</td>
                  <td className="pr-2">more than {policy.max_ablation_features_warn}</td>
                  <td>no limit (never blocks)</td>
                </tr>
                <tr>
                  <td className="py-1 pr-2">Remaining training rows (safety floor)</td>
                  <td className="pr-2">—</td>
                  <td>fewer than {policy.min_total_train_rows_block}</td>
                </tr>
              </tbody>
            </table>
            <p>A BLOCK always takes precedence over a WARN. The locked test set is protected separately and is never part of these calculations.</p>
          </div>
        </details>
      </div>

      {/* 2. The decision — central focus */}
      <div className={cn("rounded-xl border-2 p-4 space-y-2", style.box)} data-testid="rsm-decision" role="status">
        <div className="flex flex-wrap items-center gap-3">
          {status === "PASS" ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-400" aria-hidden />
          ) : status === "WARN" ? (
            <AlertTriangle className="h-6 w-6 text-amber-400" aria-hidden />
          ) : (
            <XCircle className="h-6 w-6 text-red-400" aria-hidden />
          )}
          <span className={cn("rounded-full border px-3 py-1 text-sm font-bold", style.badge)}>{copy.badge}</span>
        </div>
        <p className={cn("text-sm font-semibold", style.text)}>{copy.headline}</p>
        <p className="text-xs text-txt-muted">{copy.body}</p>
      </div>

      {/* 3. Exactly why — one card per warning/block */}
      {issues.length > 0 && (
        <div className="space-y-3" data-testid="rsm-issues">
          {issues.map((issue, i) => {
            const st = STATUS_STYLE[issue.level];
            const ev = issue.evidence || {};
            const isRetention = ev.retention !== undefined;
            return (
              <div key={`${issue.code}-${i}`} className={cn("rounded-xl border p-4 space-y-2", st.box)} data-testid="rsm-issue">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={issue.level} />
                  <h4 className="text-sm font-bold text-txt-primary">{issue.title || issue.message}</h4>
                </div>
                <p className="text-xs text-txt-secondary leading-relaxed">{issue.explanation || issue.message}</p>
                {isRetention && (
                  <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                    {[
                      ["Original records", ev.original_rows],
                      ["Records remaining", ev.remaining_rows],
                      ["Removed or quarantined", ev.removed_rows],
                      ["Retention", pct(ev.retention)],
                      ["Warning threshold", `below ${pct(ev.threshold_warn)}`],
                      ["Block threshold", `below ${pct(ev.threshold_block)}`],
                    ].map(([k, v]) => (
                      <div key={String(k)} className="rounded-lg bg-bg-main/60 px-3 py-2">
                        <dt className="text-txt-muted">{k}</dt>
                        <dd className="font-mono font-bold text-txt-primary">{typeof v === "number" ? v.toLocaleString() : v}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {issue.code === "RSM_WARN_EXCESSIVE_ABLATION" && (
                  <p className="text-xs text-txt-muted">
                    Features planned for removal ({ev.planned_removals}): <span className="font-mono text-txt-secondary">{(ev.features || []).join(", ")}</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* BLOCK guidance — no bypass exists */}
      {status === "BLOCK" && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-4" data-testid="rsm-block-guidance">
          <p className="text-sm font-bold text-red-300">What you can do</p>
          <ul className="mt-1 list-disc pl-5 text-xs text-txt-secondary space-y-0.5">
            <li>Remove the risky operation from the repair plan.</li>
            <li>Select fewer improvements.</li>
            <li>Generate a new preview after changing your selection.</li>
            <li>Review the affected training records before trying again.</li>
          </ul>
          <p className="mt-2 text-xs text-txt-muted">There is no override for a blocked plan: SmellScope will not apply it.</p>
        </div>
      )}

      {/* 4. Visual safety summary */}
      {checks && (
        <div className="grid gap-4 lg:grid-cols-1">
          <Section
            title="Attack Class Protection"
            hint="How much of each class's training data would remain after your plan."
            testId="rsm-class-protection"
          >
            <div className="space-y-3">
              {checks.classes.map((c) => (
                <div
                  key={c.class}
                  className={cn("rounded-lg border p-3 space-y-2", c.status === "PASS" ? "border-border" : STATUS_STYLE[c.status]?.box)}
                  data-testid="rsm-class-row"
                  data-class={c.class}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-txt-primary font-mono">{c.class}</span>
                    <StatusPill status={c.status} />
                  </div>
                  <RetentionBar
                    value={c.retention}
                    warn={policy.min_class_retention_warn}
                    block={policy.min_class_retention_block}
                    status={c.status}
                    label={`${c.class} training data retained`}
                  />
                  <p className="text-xs text-txt-muted">
                    <span className="font-mono text-txt-secondary">{c.remaining_rows.toLocaleString()}</span> of{" "}
                    <span className="font-mono text-txt-secondary">{c.original_rows.toLocaleString()}</span> training rows remain ·{" "}
                    <strong className="text-txt-primary">{pct(c.retention)} retained</strong>
                    {c.removed_rows > 0 && <> · {c.removed_rows.toLocaleString()} removed or quarantined</>}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          <Section
            title="Cluster Protection"
            hint="Clusters are groups of similar records within an attack class. They show whether an attack pattern would disappear."
            testId="rsm-cluster-protection"
          >
            {checks.clusters.length === 0 ? (
              <p className="text-xs text-txt-muted">No attack-class clusters were available for this dataset, so no cluster check was needed.</p>
            ) : (
              <>
                <p className="text-xs text-txt-muted">
                  {evaluatedClusters.length} cluster(s) evaluated
                  {skippedClusters.length > 0 && <> · {skippedClusters.length} small cluster(s) listed but not evaluated (5 or fewer rows)</>}.
                </p>
                <details>
                  <summary className="cursor-pointer text-xs font-semibold text-accent-secondary">Show cluster details</summary>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-left text-xs" data-testid="rsm-cluster-table">
                      <thead className="text-txt-muted">
                        <tr>
                          <th className="py-1 pr-3">Class</th>
                          <th className="pr-3">Cluster</th>
                          <th className="pr-3 text-right">Original</th>
                          <th className="pr-3 text-right">Retained</th>
                          <th className="pr-3 text-right">Retention</th>
                          <th>Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {checks.clusters.map((c) => (
                          <tr key={`${c.class}-${c.cluster_id}`} className="border-t border-border/60">
                            <td className="py-1 pr-3 font-mono">{c.class}</td>
                            <td className="pr-3 font-mono">{c.cluster_id}</td>
                            <td className="pr-3 text-right font-mono">{c.original_rows}</td>
                            <td className="pr-3 text-right font-mono">{c.remaining_rows}</td>
                            <td className="pr-3 text-right font-mono">{pct(c.retention)}</td>
                            <td title={c.reason || undefined}>
                              <StatusPill status={c.status} />
                              {!c.evaluated && <span className="ml-1 text-txt-muted">{c.reason}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </>
            )}
          </Section>

          <Section title="Feature Protection" hint="Features your plan would exclude from training." testId="rsm-feature-protection">
            <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              {[
                ["Original features", checks.features.original_count ?? "—"],
                ["Planned removals", checks.features.planned_removals],
                ["Remaining features", checks.features.remaining_count ?? "—"],
                ["Removal warning", checks.features.triggered ? `Triggered (more than ${checks.features.threshold_warn})` : `Not triggered (limit ${checks.features.threshold_warn})`],
              ].map(([k, v]) => (
                <div key={String(k)} className="rounded-lg bg-bg-main/60 px-3 py-2">
                  <dt className="text-txt-muted">{k}</dt>
                  <dd className="font-mono font-bold text-txt-primary">{v}</dd>
                </div>
              ))}
            </dl>
            {checks.features.names.length > 0 ? (
              <p className="text-xs text-txt-muted">
                Proposed excluded features: <span className="font-mono text-txt-secondary">{checks.features.names.join(", ")}</span>
              </p>
            ) : (
              <p className="text-xs text-txt-muted">This plan does not remove any features.</p>
            )}
          </Section>
        </div>
      )}

      {/* 5. Locked test set — separate from RSM thresholds */}
      {testIntegrity && (
        <Section title="Locked Test Set Protection" testId="rsm-test-protection">
          <div className={cn("flex items-start gap-3 rounded-lg border p-3", integrityFailed ? "border-red-500/50 bg-red-500/10" : "border-emerald-500/40 bg-emerald-500/5")}>
            <Lock className={cn("h-4 w-4 mt-0.5", integrityFailed ? "text-red-400" : "text-emerald-400")} aria-hidden />
            <div className="space-y-1 text-xs">
              <p className={cn("font-semibold", integrityFailed ? "text-red-300" : "text-emerald-300")}>
                Test-set integrity: {testIntegrity.status}
              </p>
              <p className="text-txt-secondary">Your final evaluation records are protected from dataset improvements.</p>
              <p className="text-txt-muted">{testIntegrity.verification_outcome}</p>
              <p className="font-mono text-txt-muted">
                {testIntegrity.test_record_count.toLocaleString()} test records · original {testIntegrity.original_fingerprint.slice(0, 12)}… · current{" "}
                {testIntegrity.current_fingerprint.slice(0, 12)}…
              </p>
              {integrityFailed && (
                <p className="font-semibold text-red-300">Application is prevented regardless of the RSM decision.</p>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* 6. Explicit acknowledgement (never pre-ticked, never skipped) */}
      {status === "WARN" && (
        <label className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 cursor-pointer" data-testid="rsm-ack">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => onAcknowledgedChange(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-amber-400"
          />
          <span className="text-xs text-amber-200 leading-relaxed">
            I have reviewed the safety warnings and understand the possible impact on my training dataset.
          </span>
        </label>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------------------------------ */
/* Post-application safety record                                                              */
/* ------------------------------------------------------------------------------------------ */

export interface RsmRecordData {
  preview_id?: string;
  transformation_id?: string | null;
  dataset_version?: string | null;
  preview_decision: RsmStatus;
  apply_decision: RsmStatus;
  acknowledgement_required: boolean;
  acknowledged: boolean;
  class_retention_expected?: RsmChecks["classes"];
  class_retention_actual?: Record<string, { before: number; after: number; retention: number }> | null;
  cluster_retention?: RsmChecks["clusters"];
  features_removed?: Partial<RsmChecks["features"]>;
  test_integrity?: TestIntegrity;
  outcome: "APPLIED" | "NO_CHANGE";
  message: string;
  recorded_at: string;
}

export const RsmSafetyRecord: React.FC<{ record: RsmRecordData }> = ({ record }) => {
  const applied = record.outcome === "APPLIED";
  const evaluated = (record.cluster_retention || []).filter((c) => c.evaluated).length;
  return (
    <section
      className={cn("rounded-xl border p-4 space-y-3", applied ? "border-emerald-500/40 bg-emerald-500/5" : "border-slate-500/40 bg-slate-500/5")}
      data-testid="rsm-safety-record"
      data-outcome={record.outcome}
    >
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-accent-secondary" aria-hidden />
        <h3 className="text-sm font-bold text-txt-primary">RSM Safety Record</h3>
      </div>
      <p className="text-sm text-txt-primary" data-testid="rsm-record-message">{record.message}</p>
      <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        {[
          ["Decision at preview", record.preview_decision],
          ["Backend decision at apply", record.apply_decision],
          ["Acknowledgement required", record.acknowledgement_required ? "Yes" : "No"],
          ["Acknowledged", record.acknowledgement_required ? (record.acknowledged ? "Yes" : "No") : "Not needed"],
          ["Features removed", record.features_removed?.planned_removals ?? 0],
          ["Clusters evaluated", evaluated],
          ["Locked test set", record.test_integrity?.status ?? "—"],
          ["Preview ID", record.preview_id ?? "—"],
          ["Transformation ID", record.transformation_id ?? "none (no change)"],
          ["Dataset version", record.dataset_version ?? "no new version"],
          ["Recorded", new Date(record.recorded_at).toLocaleString()],
        ].map(([k, v]) => (
          <div key={String(k)} className="rounded-lg bg-bg-main/60 px-3 py-2">
            <dt className="text-txt-muted">{k}</dt>
            <dd className="font-mono font-bold text-txt-primary break-all">{String(v)}</dd>
          </div>
        ))}
      </dl>
      {record.class_retention_actual && (
        <div>
          <p className="text-xs font-semibold text-txt-primary mb-1">Class retention in the corrected dataset (measured)</p>
          <ul className="space-y-1 text-xs text-txt-muted">
            {Object.entries(record.class_retention_actual).map(([cls, v]) => (
              <li key={cls}>
                <span className="font-mono text-txt-secondary">{cls}</span>: {v.after.toLocaleString()} of {v.before.toLocaleString()} training rows ·{" "}
                <strong className="text-txt-primary">{pct(v.retention)}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};
