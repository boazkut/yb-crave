/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        coal: { DEFAULT: '#1C1A17', 2: '#262320', 3: '#33302B', line: '#45403A' },
        paper: { DEFAULT: '#F4EAD5', dim: '#CFC4AD' },
        cola: '#E5212B',
        lime: '#B5F23A',
        snack: '#FF7A1A',
        choco: '#D9A23B',
        cocoa: '#5B3418',
        pen: '#5B7CFF',
        bubble: '#FF4FA3',
        ice: '#8FE3FF',
      },
      fontFamily: {
        display: ['"Secular One"', '"Rubik Variable"', 'sans-serif'],
        body: ['"Rubik Variable"', 'Rubik', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        hard: '4px 4px 0 0 var(--tw-shadow-color)',
        'hard-sm': '2px 2px 0 0 var(--tw-shadow-color)',
        'hard-lg': '6px 6px 0 0 var(--tw-shadow-color)',
      },
      keyframes: {
        marquee: { from: { transform: 'translateX(-50%)' }, to: { transform: 'translateX(0)' } },
        rise: {
          '0%': { transform: 'translateY(0) scale(.6)', opacity: 0 },
          '10%': { opacity: 0.9 },
          '100%': { transform: 'translateY(-110vh) scale(1.1)', opacity: 0 },
        },
        wobble: { '0%,100%': { transform: 'rotate(-3deg)' }, '50%': { transform: 'rotate(3deg)' } },
        blink: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.35 } },
      },
      animation: {
        marquee: 'marquee var(--marquee-speed, 30s) linear infinite',
        rise: 'rise var(--rise-dur, 7s) linear infinite',
        wobble: 'wobble 2.4s ease-in-out infinite',
        blink: 'blink 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
