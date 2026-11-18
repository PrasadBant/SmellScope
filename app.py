"""SmellScope Streamlit Fallback Application.

Preserved as an operational fallback interface during the React 2.0 migration.
Uses smellscope.api facade conforming to Shared Contract v1.0.
"""

from __future__ import annotations

import os
from pathlib import Path
import streamlit as st

from smellscope.api import (
    apply_remediation,
    check_rsm,
    generate_offline_html_report,
    get_default_config,
    list_sample_datasets,
    load_dataset,
    make_locked_split,
    new_training_view,
    propose_remediation,
    rebenchmark,
    rollback,
    run_audit,
)

st.set_page_config(
    page_title="SmellScope — Legacy Streamlit Fallback",
    page_icon="🛡️",
    layout="wide",
)

st.title("SmellScope (Legacy Fallback)")
st.caption("Scientific Benchmark Dataset Auditor (NOT an active network intrusion detection system)")

st.warning("⚠️ You are viewing the Streamlit fallback interface. SmellScope 2.0 has migrated to React + FastAPI. Run `npm run dev` in `frontend/` to access the modern workstation.")

# Sidebar navigation
menu = st.sidebar.radio(
    "Navigation",
    ["Overview", "Dataset Ingestion", "Smell Matrix", "Shortcut Diagnostics", "Remediation Lab", "Reports"],
)

cfg = get_default_config()

if "dataset" not in st.session_state:
    st.session_state["dataset"] = None
if "run_result" not in st.session_state:
    st.session_state["run_result"] = None
if "active_view" not in st.session_state:
    st.session_state["active_view"] = None
if "view_history" not in st.session_state:
    st.session_state["view_history"] = []
if "change_log" not in st.session_state:
    st.session_state["change_log"] = []
if "rebenchmark_result" not in st.session_state:
    st.session_state["rebenchmark_result"] = None

if menu == "Overview":
    st.header("Overview Command Center")
    st.markdown("""
    **SmellScope** audits Network Intrusion Detection System (NIDS) benchmark datasets to investigate:
    - Statistical artifacts (UGT, WL, HDF, PDD, TC)
    - Shortcut dependencies (Null-calibrated SFI)
    - Generalization gaps (GGI)
    - Remediation safety (RSM)
    """)
    if st.session_state["run_result"]:
        rr = st.session_state["run_result"]
        st.success(f"Active Run: {rr['run_id']} | Classes: {len(rr['classes'])} | Runtime: {rr['runtime']['total_seconds']}s")
    else:
        st.info("No active audit run. Proceed to 'Dataset Ingestion' to load a benchmark dataset.")

elif menu == "Dataset Ingestion":
    st.header("Dataset Ingestion & Locked Split")
    sample_options = list_sample_datasets()
    avail = [s for s in sample_options if s.get("available")]
    sample_names = [s["name"] for s in avail]

    if avail:
        selected_name = st.selectbox("Select Benchmark Sample", sample_names)
        selected_meta = next(s for s in avail if s["name"] == selected_name)

        if st.button("Load Dataset"):
            with st.spinner("Loading and validating dataset..."):
                ds = load_dataset(
                    path_or_sample_id=selected_meta["id"],
                    label_col=selected_meta["label_col"],
                    benign_label=selected_meta["benign_label"],
                    cfg=cfg,
                )
                split = make_locked_split(ds, cfg)
                st.session_state["dataset"] = ds
                st.session_state["split"] = split
                st.session_state["active_view"] = new_training_view(ds, split)
                st.session_state["view_history"] = [st.session_state["active_view"]]
                st.success(f"Loaded {len(ds['df'])} rows. Locked split hash: {split['split_hash'][:12]}...")

    if st.session_state.get("dataset"):
        ds = st.session_state["dataset"]
        st.subheader("Data Summary")
        st.write(ds["meta"])
        st.dataframe(ds["df"].head(10))

        if st.button("Run Multi-Class Audit", type="primary"):
            progress_bar = st.progress(0)
            status_text = st.empty()

            def pcb(curr, total, cls_name):
                progress_bar.progress(curr / total)
                status_text.text(f"Auditing class {curr}/{total}: {cls_name}")

            with st.spinner("Running scientific audit..."):
                res = run_audit(ds, cfg=cfg, progress_cb=pcb)
                st.session_state["run_result"] = res
                st.success(f"Audit completed in {res['runtime']['total_seconds']} seconds!")

elif menu == "Smell Matrix":
    st.header("Cross-Class Smell Matrix")
    if not st.session_state.get("run_result"):
        st.info("No audit results available. Run an audit in Dataset Ingestion.")
    else:
        rr = st.session_state["run_result"]
        rows = []
        for c in rr["classes"]:
            rows.append({
                "Class": c["class"],
                "N": c["n"],
                "UGT": c["paper"]["UGT"],
                "WL": c["paper"]["WL"],
                "HDF": c["paper"]["HDF"],
                "PDD": c["paper"]["PDD"],
                "TC": c["paper"]["TC"],
                "SFI": c["sfi"]["sfi_top"],
                "Flag": c["sfi"]["flag"],
                "GGI Gap": c["ggi"]["gap"],
            })
        st.dataframe(rows)

elif menu == "Shortcut Diagnostics":
    st.header("Shortcut Diagnostic Lab")
    if not st.session_state.get("run_result"):
        st.info("No audit results available. Run an audit first.")
    else:
        rr = st.session_state["run_result"]
        class_names = [c["class"] for c in rr["classes"]]
        selected_cls = st.selectbox("Select Class", class_names)
        cls_data = next(c for c in rr["classes"] if c["class"] == selected_cls)

        st.subheader(f"Diagnostics for {selected_cls}")
        st.json(cls_data["sfi"])

elif menu == "Remediation Lab":
    st.header("Remediation Lab & RSM")
    if not st.session_state.get("dataset") or not st.session_state.get("run_result"):
        st.info("Load dataset and run audit first.")
    else:
        ds = st.session_state["dataset"]
        split = st.session_state["split"]
        view = st.session_state["active_view"]
        st.write(f"Current View: `{view['view_id']}` | Included Rows: `{view['n_included']}`")

        action_type = st.selectbox("Action", ["R1 Feature Ablation", "R2 Candidate Flow Quarantine"])
        if action_type.startswith("R1"):
            all_cols = [c for c in ds["df"].columns if c not in (ds["label_col"], "__row_id")]
            feats = st.multiselect("Select Features to Ablate", all_cols)
            options = {"action": "R1", "params": {"features": feats}}
        else:
            options = {"action": "R2", "params": {"rule": "quarantine_ephemeral_ports"}}

        if st.button("Generate Preview"):
            prev = propose_remediation(ds, split, view, options, cfg)
            rsm = check_rsm(prev, cfg.get("rsm", {}).get("policy"))
            st.session_state["preview"] = prev
            st.session_state["rsm"] = rsm
            st.json(rsm)

        if st.session_state.get("preview"):
            prev = st.session_state["preview"]
            rsm = st.session_state["rsm"]
            st.write(f"RSM Status: **{rsm['status']}**")
            ack = st.checkbox("Acknowledge Warnings") if rsm["status"] == "WARN" else False

            if rsm["status"] != "BLOCK":
                if st.button("Apply Remediation"):
                    appr = {"approved": True, "warning_ack": ack, "approved_at": "now"}
                    nv, log = apply_remediation(ds, split, view, prev, appr, cfg)
                    st.session_state["active_view"] = nv
                    st.session_state["view_history"].append(nv)
                    st.session_state["change_log"].append(log)
                    st.success(f"Applied! Advanced to {nv['view_id']}")

elif menu == "Reports":
    st.header("Offline HTML Reports")
    if not st.session_state.get("run_result"):
        st.info("Run an audit first to generate reports.")
    else:
        rr = st.session_state["run_result"]
        if st.button("Generate Offline HTML Report"):
            rpath = generate_offline_html_report(
                run_result=rr,
                rebenchmark_result=st.session_state.get("rebenchmark_result"),
                change_log=st.session_state.get("change_log"),
            )
            st.success(f"Report generated at: {rpath}")
