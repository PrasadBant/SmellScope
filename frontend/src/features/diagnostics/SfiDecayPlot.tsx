import React from "react";
import Plotly from "plotly.js-dist-min";
// @ts-ignore
import createPlotlyComponent from "react-plotly.js/factory.js";

const Plot = createPlotlyComponent(Plotly);

interface SfiDecayPlotProps {
  deltas: number[];
  recallTop: (number | null)[];
  recallNullMean: (number | null)[];
  topFeatureName: string;
}

export const SfiDecayPlot: React.FC<SfiDecayPlotProps> = ({
  deltas,
  recallTop,
  recallNullMean,
  topFeatureName,
}) => {
  const cleanTop = recallTop.map((v) => (v !== null ? v : 0));
  const cleanNull = recallNullMean.map((v) => (v !== null ? v : 0));

  return (
    <div className="w-full h-80 rounded-xl overflow-hidden border border-border bg-bg-card p-3 shadow-inner">
      <Plot
        data={[
          {
            x: deltas,
            y: cleanTop,
            type: "scatter",
            mode: "lines+markers",
            name: `Candidate (${topFeatureName})`,
            line: { color: "#38BDF8", width: 2.5 },
            marker: { color: "#38BDF8", size: 6 },
          },
          {
            x: deltas,
            y: cleanNull,
            type: "scatter",
            mode: "lines",
            name: "Monte Carlo Null Mean",
            line: { color: "#FB923C", width: 2, dash: "dash" },
          },
        ]}
        layout={{
          autosize: true,
          margin: { l: 45, r: 25, t: 30, b: 40 },
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          font: { color: "#8993A3", size: 11, family: "Inter, monospace" },
          xaxis: {
            title: { text: "Perturbation Delta (δ)", font: { color: "#C4CBD6", size: 11 } },
            gridcolor: "#252C38",
            zerolinecolor: "#252C38",
            tickvals: [0, 0.25, 0.5, 0.75, 1.0],
            ticktext: ["0.0 (Clean)", "0.25", "0.50", "0.75", "1.0 (Full)"],
            tickfont: { color: "#8993A3" },
          },
          yaxis: {
            title: { text: "Recall Response", font: { color: "#C4CBD6", size: 11 } },
            range: [-0.05, 1.05],
            gridcolor: "#252C38",
            zerolinecolor: "#252C38",
            tickfont: { color: "#8993A3" },
          },
          legend: {
            orientation: "h",
            y: 1.15,
            x: 0.05,
            font: { color: "#F5F7FA", size: 11 },
          },
          hovermode: "x unified",
        }}
        useResizeHandler
        style={{ width: "100%", height: "100%" }}
        config={{
          displayModeBar: true,
          displaylogo: false,
          modeBarButtonsToRemove: ["lasso2d", "select2d"],
          responsive: true,
        }}
      />
    </div>
  );
};
