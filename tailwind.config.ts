import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['var(--font-sans)', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Menlo', 'monospace'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "card-elevated": "hsl(var(--card-elevated))",
        "chart-1": "hsl(var(--chart-1))",
        "chart-2": "hsl(var(--chart-2))",
        "chart-3": "hsl(var(--chart-3))",
        "chart-4": "hsl(var(--chart-4))",
        "chart-5": "hsl(var(--chart-5))",
        brand: {
          teal: {
            DEFAULT: '#1B7A6E',
            light: '#2A9D8F',
            dark: '#15655A',
          },
          amber: {
            DEFAULT: '#E8913A',
            light: '#F0A85C',
            dark: '#D07A2A',
          },
          sand: {
            DEFAULT: '#FBF7F0',
            dark: '#F5F1EB',
          },
          navy: {
            DEFAULT: '#1A2B3D',
            light: '#2A3D52',
          },
          coral: '#E07A5F',
          slate: '#5B7B9A',
        },
        data: {
          good: '#34A853',
          warning: '#E8913A',
          attention: '#E07A5F',
          neutral: '#5B7B9A',
          purple: '#8B6DAF',
        },
        warm: {
          charcoal: '#2D2A26',
          gray: '#6B6560',
          border: '#E0D9CF',
          cloud: '#F5F1EB',
          white: '#FEFDFB',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      boxShadow: {
        glow: '0 0 20px -5px hsl(var(--primary) / 0.2)',
        'glow-sm': '0 0 10px -3px hsl(var(--primary) / 0.15)',
        'warm-sm': '0 1px 3px rgba(45,42,38,0.08)',
        'warm-md': '0 4px 12px rgba(45,42,38,0.08)',
        'warm-lg': '0 8px 24px rgba(45,42,38,0.1)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s ease-in-out infinite',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
