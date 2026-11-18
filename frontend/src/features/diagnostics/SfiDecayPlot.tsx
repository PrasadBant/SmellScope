import React from "react";
import Plotly from "plotly.js-dist-min";
import createPlotlyComponent from "react-plotly.js/factory";

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
    <div className="w-full h-72 rounded-xl overflow-hidden border border-border/80 bg-bg-elevated/40 p-2">
      <Plot
        data={[
          {
            x: deltas,
            y: cleanTop,
            type: "scatter",
            mode: "lines+markers",
            name: `Top Feature (${topFeatureName})`,
            line: { color: "#38BDF8", width: 2.5 },
            marker: { color: "#38BDF8", size: 6 },
          },
          {
            x: deltas,
            y: cleanNull,
            type: "scatter",
            mode: "lines",
            name: "Monte Carlo Null Mean",
            line: { color: "#94A3B8", width: 2, dash: "dash" },
          },
        ]}
        layout={{
          autosize: true,
          margin: { l: 45, r: 20, t: 30, b: 40 },
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          font: { color: "#94A3B8", size: 11 },
          xaxis: {
            title: { text: "Perturbation Delta (δ)" },
            gridcolor: "#1E293B",
            zerolinecolor: "#334155",
            tickvals: [0, 0.25, 0.5, 0.75, 1.0],
            ticktext: ["0.0 (Clean)", "0.25", "0.50", "0.75", "1.0 (Full)"],
          },
          yaxis: {
            title: { text: "Recall Response" },
            range: [-0.05, 1.05],
            gridcolor: "#1E293B",
            zerolinecolor: "#334155",
          },
          legend: {
            orientation: "h",
            y: 1.15,
            x: 0.1,
            font: { color: "#CBD5E1", size: 11 },
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
