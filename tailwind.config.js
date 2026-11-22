/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        page: '#FAF9F6',
        ink: '#141414',
        muted: '#6B6B6B',
        line: '#EAEAEA',
        tile: '#F4F4F2',
        danger: '#D92D20',
      },
      fontFamily: {
        sans: ['"Heebo Variable"', 'Heebo', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
