/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          app: '#080A0E',      // Main application background
          main: '#080A0E',     // Backward compatibility
          sidebar: '#0A0C10',  // Sidebar background
          workspace: '#0D1016',// Workspace canvas
          card: '#11151D',     // Primary card surface
          elevated: '#171C25', // Elevated card surface
          hover: '#1C2330',    // Interactive hover surface
        },
        border: {
          subtle: '#1B202A',   // Subtle divider
          DEFAULT: '#252C38',  // Standard card and panel border
          active: '#3B82F6',   // Focus / active state
          highlight: '#38BDF8',// Hover highlight
        },
        txt: {
          primary: '#F5F7FA',   // High-contrast clean white
          secondary: '#C4CBD6', // Subtle silver-gray
          muted: '#8993A3',     // Muted technical label
          disabled: '#626C7C',  // Inactive / disabled text
        },
        accent: {
          primary: '#3B82F6',   // Restrained electric blue (actions)
          secondary: '#38BDF8', // Cyan highlight (telemetry, badges)
          cyan: '#38BDF8',      // Backward compatibility
        },
        status: {
          success: '#22C55E',  // Verified / Clean / Safe
          warning: '#F59E0B',  // Caution / RSM Warn
          block: '#EF4444',    // Critical / RSM Block / Flagged
        },
        evidence: {
          published: '#38BDF8', // Published literature
          synthetic: '#A78BFA', // Synthetic / planted shortcut
          cached: '#FB923C',    // Historical cached run
          measured: '#22C55E',   // Real empirical measurement
          target: '#3B82F6',     // Target attack class
          mock: '#8993A3',       // Simulated placeholder
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'panel': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
        'elevated': '0 8px 30px -4px rgba(0, 0, 0, 0.65)',
        'blue-glow': '0 0 15px -3px rgba(59, 130, 246, 0.3)',
      },
      borderRadius: {
        'card': '10px',
        'subtle': '6px',
      },
    },
  },
  plugins: [],
}
