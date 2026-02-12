# Stock Portfolio Manager - Working Implementation

A modern stock portfolio management application built with React, TypeScript, Supabase, Marketstack API, and DeepSeek AI.

## ✨ Features

- 📈 **EOD Stock Quotes** - Get end-of-day prices for Hong Kong, China, and US stocks
- 🤖 **AI Stock Assistant** - Chat with DeepSeek AI for stock market insights
- 🔒 **Secure Authentication** - Email/password and Google OAuth via Supabase
- 💾 **Smart Caching** - Reduces API calls and improves performance
- 🎨 **Modern UI** - Beautiful Material-UI design
- 🌐 **Multi-Market Support** - HK, CN, US stock markets

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier)
- Marketstack API key (provided)
- DeepSeek API key

### Step 1: Setup Supabase

1. Go to https://supabase.com and create a new project
2. Go to SQL Editor and run the schema from `IMPLEMENTATION_GUIDE.md`
3. Copy your project URL and anon key

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_MARKETSTACK_API_KEY=4b07745ad79b66dfd320697e5e40f596
VITE_DEEPSEEK_API_KEY=your-deepseek-key
```

### Step 4: Run Development Server

```bash
npm run dev
```

Visit http://localhost:5173

## 📁 Project Structure

```
src/
├── lib/
│   ├── supabase.ts        # Supabase client and types
│   ├── marketstack.ts     # Stock API integration
│   └── deepseek.ts        # AI chatbot integration
├── hooks/
│   ├── useAuth.ts         # Authentication hook
│   ├── useStockPrice.ts   # Stock data fetching hook
│   └── useAI.ts           # AI chat hook
├── components/
│   ├── Auth.tsx           # Login/signup component
│   ├── StockQuote.tsx     # Stock price display
│   └── AIHelper.tsx       # Floating AI chatbot
├── pages/
│   └── Home.tsx           # Main homepage
├── App.tsx                # App wrapper
└── main.tsx               # Entry point
```

## 🔌 APIs Used

### 1. Marketstack API

**Base URL:** `http://api.marketstack.com/v1`

**Endpoint:** `/eod/latest`

**Example Request:**
```
GET http://api.marketstack.com/v1/eod/latest?access_key=YOUR_KEY&symbols=0005.XHKG
```

**Symbol Formats:**
- Hong Kong: `0005.XHKG` (HSBC)
- China: `600000.XSHG` (Shanghai) or `.XSHE` (Shenzhen)
- US: `AAPL` (no suffix)

**Free Tier:** 100 API calls/month

### 2. DeepSeek API

**Base URL:** `https://api.deepseek.com/v1`

**Endpoint:** `/chat/completions`

**Model:** `deepseek-chat`

**Example Request:**
```json
{
  "model": "deepseek-chat",
  "messages": [
    {
      "role": "system",
      "content": "You are a stock market analyst..."
    },
    {
      "role": "user",
      "content": "What is P/E ratio?"
    }
  ]
}
```

## 🗄️ Database Schema

The app uses these Supabase tables:

- `profiles` - User profiles
- `portfolios` - User portfolios
- `holdings` - Stock holdings
- `stock_cache` - Cached stock prices (reduces API calls)

Row Level Security (RLS) is enabled for data protection.

## 🧪 Testing

### Test Stock Symbols

**Hong Kong (HK):**
- `0005` - HSBC Holdings
- `0700` - Tencent Holdings
- `0941` - China Mobile

**China (CN):**
- `600000` - Pudong Development Bank
- `601398` - ICBC

**US:**
- `AAPL` - Apple
- `MSFT` - Microsoft
- `GOOGL` - Google

### Test AI Questions

- "What's the difference between Hong Kong and Shanghai stock exchanges?"
- "How do I calculate P/E ratio?"
- "What factors should I consider before buying a stock?"

## 📦 Build for Production

```bash
npm run build
```

The built files will be in the `dist/` folder.

## 🚀 Deployment

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add environment variables in Vercel dashboard.

### Deploy to Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod
```

## 🔧 Configuration

### API Rate Limits

- **Marketstack Free:** 100 calls/month
- **DeepSeek:** Check your plan
- **Supabase Free:** 500MB database, 2GB bandwidth

### Caching Strategy

Stock data is cached for 1 hour to reduce API calls. Configure in `src/lib/marketstack.ts`:

```typescript
if (cacheAge < 60 * 60 * 1000) { // 1 hour
  return cached;
}
```

## 🐛 Troubleshooting

### "No data found for symbol"

- Check if the symbol format is correct
- Verify the market selection matches the symbol
- Try an example symbol first

### "API key invalid"

- Check `.env` file has correct keys
- Restart dev server after changing `.env`
- Verify keys are not expired

### Supabase connection error

- Check SUPABASE_URL and SUPABASE_ANON_KEY
- Ensure Supabase project is running
- Check database schema is created

### AI chatbot not responding

- Verify DEEPSEEK_API_KEY is set
- Check API quota/rate limits
- Look at browser console for errors

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `VITE_MARKETSTACK_API_KEY` | Marketstack API key | Yes |
| `VITE_DEEPSEEK_API_KEY` | DeepSeek API key | Yes |

## 🔐 Security

- Environment variables are prefixed with `VITE_` for Vite
- Never commit `.env` to version control
- Supabase Row Level Security protects user data
- API keys are never exposed to client

## 📄 License

MIT

## 🤝 Contributing

This is a working draft implementation. Feel free to extend and customize!

## 📞 Support

For issues with:
- **Supabase:** https://supabase.com/docs
- **Marketstack API:** https://marketstack.com/documentation
- **DeepSeek API:** https://platform.deepseek.com/api-docs
- **React/Vite:** https://vitejs.dev/guide/

---

Built with ❤️ using React, TypeScript, Supabase, Marketstack, and DeepSeek AI
