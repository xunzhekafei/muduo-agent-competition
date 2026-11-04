/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // 荧光绿主色调
        neon: {
          50:  '#f2fbe4',
          100: '#e5f7c9',
          200: '#d2f2a2',
          300: '#bfed7a',
          400: '#b2e95e',
          500: '#C7F36B',  // 主荧光绿
          600: '#B8EC52',  // hover
          700: '#9fd438',
          800: '#7fb028',
          900: '#5f8a1a',
        },
        // 浅蓝卡片
        sky: {
          50:  '#f0f5ff',
          100: '#e1ecff',
          200: '#CFE1FF',  // 浅蓝卡片
          300: '#a3c6ff',
          400: '#7aaaff',
          500: '#5a8ff0',
        },
        // 浅紫卡片
        lilac: {
          50:  '#f8f6ff',
          100: '#f0ecff',
          200: '#DDD2FF',  // 浅紫卡片
          300: '#c4b5f5',
          400: '#a895e8',
          500: '#8b74d9',
        },
        // 浅绿卡片
        mint: {
          50:  '#f2fbf7',
          100: '#e4f7ee',
          200: '#BFEFD4',  // 浅绿卡片
          300: '#8ae0b0',
          400: '#5cc98b',
          500: '#3aad6b',
        },
        // 背景和表面
        surface: {
          page:   '#FFFFFF',
          card:   '#FFFFFF',
          hover:  '#FAFAFA',
          raised: '#FAFAFA',
          sunken: '#F4F4F4',
          sidebar:'#F9F9F9',
        },
        // 品牌主色（墨绿，替代荧光绿）
        brand: {
          50:  '#EAF6F2',
          100: '#DDF0EA',
          200: '#BFE5D9',
          500: '#10A37F',
          600: '#0D8B6C',
          700: '#0B7A5E',
        },
        // 分割线
        line: {
          DEFAULT: 'rgba(0,0,0,0.08)',
          strong:  'rgba(0,0,0,0.14)',
        },
        // 文字层级
        ink: {
          primary:   '#1F1F1F',
          secondary: '#7B7B7B',
          tertiary:  '#A0A0A0',
          disabled:  '#D0D0D0',
          // 数值键，供新原语使用
          900: '#1F1F1F',
          700: '#4B4B4B',
          600: '#6B7280',
          500: '#7B7B7B',
          400: '#9CA3AF',
          300: '#B0B0B0',
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"PingFang SC"', '"Noto Sans SC"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        'card':       '0 1px 3px rgba(0,0,0,0.03)',
        'card-hover': '0 8px 30px rgba(0,0,0,0.04)',
        'float':      '0 4px 16px rgba(0,0,0,0.05)',
        'sidebar':    '1px 0 0 rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [],
}
