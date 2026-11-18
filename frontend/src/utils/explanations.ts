export interface MetricExplanation {
  shortName: string;
  fullName: string;
  simpleDescription: string;
  technicalDescription: string;
  formula?: string;
  threshold: number;
  thresholdDescription: string;
  whyItMatters: string;
}

export const METRIC_EXPLANATIONS: Record<string, MetricExplanation> = {
  UGT: {
    shortName: "UGT",
    fullName: "Unclear Ground Truth",
    simpleDescription: "Checks whether the dataset's attack labels and underlying evidence are sufficiently clear.",
    technicalDescription: "Evaluates the fraction of attack traffic targeting unassigned or ghost port ranges that are non-responsive in realistic network deployments.",
    formula: "UGT = Σ 1[port ∈ GhostPorts] / N_attack",
    threshold: 0.1,
    thresholdDescription: "≥ 0.10 indicates suspicious protocol leakage",
    whyItMatters: "If a benchmark attack only targets non-standard or ghost ports, models learn to classify attacks by port number rather than malicious behavior.",
  },
  WL: {
    shortName: "WL",
    fullName: "Wrong Labels / Repetition Artifacts",
    simpleDescription: "Looks for suspicious, repetitive, or potentially incorrect packet length patterns.",
    technicalDescription: "Measures 4-gram window length repetition and periodicity anomalies across consecutive flow records.",
    formula: "WL = max_gram_freq(WindowLengths, k=4)",
    threshold: 0.3,
    thresholdDescription: "≥ 0.30 indicates artificial periodicity",
    whyItMatters: "Synthetic traffic generators often produce identical repeated byte patterns that never occur in real network traffic.",
  },
  HDF: {
    shortName: "HDF",
    fullName: "Highly Dependent Features",
    simpleDescription: "Checks whether features are strongly related in ways that make the model's task artificially easy.",
    technicalDescription: "Calculates the Gini concentration of single-feature classification importances across Random Forest estimators.",
    formula: "HDF = Gini(FeatureImportances)",
    threshold: 0.6,
    thresholdDescription: "≥ 0.60 indicates extreme single-feature dominance",
    whyItMatters: "When a single feature carries over 60% of predictive power, the model has likely found an experimental shortcut.",
  },
  PDD: {
    shortName: "PDD",
    fullName: "Poor Data Diversity",
    simpleDescription: "Looks for a lack of variation in network traffic characteristics.",
    technicalDescription: "Cluster distance disparity between benign and attack partitions in normalized KMeans flow space.",
    formula: "PDD = ||μ_attack - μ_benign||_2 / σ_pooled",
    threshold: 0.2,
    thresholdDescription: "≥ 0.20 indicates severe cluster disparity",
    whyItMatters: "Low diversity means test attacks look virtually identical to training attacks, inflating reported laboratory accuracy.",
  },
  TC: {
    shortName: "TC",
    fullName: "Traffic Collapse",
    simpleDescription: "Checks for unrealistic burst patterns in traffic composition or collection timing.",
    technicalDescription: "Quantifies burst clustering within anomalous inter-arrival temporal windows.",
    formula: "TC = Kurtosis(InterArrivalTimes)",
    threshold: 0.4,
    thresholdDescription: "≥ 0.40 indicates temporal burst artifact",
    whyItMatters: "In lab simulations, attacks are often launched in sudden massive bursts, creating trivial time-based shortcuts.",
  },
  SFI: {
    shortName: "SFI",
    fullName: "Shortcut Fragility Index",
    simpleDescription: "Measures how sensitive a model is to changes in selected features compared with a null reference.",
    technicalDescription: "Empirical recall degradation when permuting the top candidate feature relative to a 100-draw Monte Carlo null distribution.",
    formula: "SFI = (Recall_baseline - Recall_perturbed) - E[ΔRecall_null]",
    threshold: 0.2,
    thresholdDescription: "Flagged if excess fragility exceeds null mean + 2σ",
    whyItMatters: "Reveals whether a 99% F1-score is genuine or will collapse when an attacker simply randomizes trivial attributes.",
  },
  GGI: {
    shortName: "GGI",
    fullName: "Generalisation Gap Index",
    simpleDescription: "Summarises the performance difference between supported evaluation conditions and unseen attack variations.",
    technicalDescription: "Recall drop when evaluating the model on held-out attack subtypes vs random stratified splits.",
    formula: "GGI = Recall_random - Recall_grouped",
    threshold: 0.15,
    thresholdDescription: "≥ 0.15 indicates poor generalization to novel attack variations",
    whyItMatters: "A high GGI proves the model overfitted to specific lab conditions and cannot detect new variations of the same attack.",
  },
  RSM: {
    shortName: "RSM",
    fullName: "Remediation Safety Monitor",
    simpleDescription: "Checks whether a proposed dataset modification is safe enough to apply without breaking evaluation integrity.",
    technicalDescription: "Automated governance monitor enforcing non-negotiable safety guardrails (G1 Class Floor, G2 Feature Floor, G3 Test Immutability).",
    formula: "Decision ∈ { PASS, WARN, BLOCK }",
    threshold: 0,
    thresholdDescription: "BLOCK halts execution; WARN requires explicit researcher acknowledgment",
    whyItMatters: "Prevents accidental erasure of attack classes, test set leakage, or destructive dataset mutilation during remediation.",
  },
};
