/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Flare brand colors
        flare: {
          coral: '#E62058',
          pink: '#FF6B9D',
          purple: '#8B5CF6',
          dark: '#0F0F1A',
          darker: '#080810',
        },
        // Status colors
        status: {
          open: '#22C55E',
          progress: '#3B82F6',
          submitted: '#F59E0B',
          accepted: '#8B5CF6',
          completed: '#10B981',
          disputed: '#EF4444',
          cancelled: '#6B7280',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'flare-gradient': 'linear-gradient(135deg, #E62058 0%, #8B5CF6 100%)',
      },
    },
  },
  plugins: [],
};
