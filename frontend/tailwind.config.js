/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        obapay: {
          navy: '#0B1F3A',
          teal: '#0FB5AE',
          gold: '#F2A93B',
        },
      },
    },
  },
  plugins: [],
};
