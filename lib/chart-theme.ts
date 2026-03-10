/**
 * Centralized chart color and theme configuration.
 * Used across all Recharts components for visual consistency.
 */

export const chartColors = {
  primary: '#1B7A6E',    // brand teal
  secondary: '#E8913A',  // brand amber
  tertiary: '#5B7B9A',   // brand slate
  quaternary: '#E07A5F', // brand coral
  quinary: '#34A853',    // data good
  senary: '#8B6DAF',     // data purple
};

export const chartTheme = {
  grid: { stroke: '#E0D9CF', strokeDasharray: '3 3' },
  axis: { stroke: '#6B6560', fontSize: 12, fontFamily: 'Plus Jakarta Sans' },
  tooltip: {
    background: '#FEFDFB',
    border: '#E0D9CF',
    borderRadius: 8,
    fontFamily: 'Plus Jakarta Sans',
  },
};
