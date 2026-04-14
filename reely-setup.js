// ============================================================
//  REELY — package.json
// ============================================================
{
  "name": "reely-bot",
  "version": "1.0.0",
  "description": "WhatsApp bot that converts Instagram reels into action steps",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "dotenv": "^16.4.1",
    "express": "^4.18.2",
    "openai": "^4.28.0",
    "twilio": "^5.0.0"
  }
}

// ============================================================
//  REELY — .env (copy to .env and fill in values)
// ============================================================
/*
PORT=3000

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=+14155238886

# OpenAI
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
*/

// ============================================================
//  SETUP GUIDE — 7 days to launch
// ============================================================
/*
DAY 1: Infrastructure
  1. Create Twilio account → activate WhatsApp sandbox
  2. Create Supabase project → run reely-schema.sql
  3. Get OpenAI API key
  4. npm install

DAY 2: Local dev
  1. Copy .env template, fill in credentials
  2. node index.js
  3. Install ngrok: ngrok http 3000
  4. Set Twilio WhatsApp webhook → your ngrok URL/webhook

DAY 3: Test all flows
  - Test reel URL detection
  - Test all 3 modes (summary, actions, content)
  - Test save / tasks / remind actions
  - Test error handling

DAY 4: Deploy
  1. Push to GitHub
  2. Deploy to Railway (railway up) or Render
  3. Update Twilio webhook to production URL

DAY 5: Weekly digest
  1. Set up cron job (Railway cron / Supabase pg_cron)
  2. Schedule POST /digest every Sunday 10:00 AM IST
  3. Test digest with a dummy user

DAY 6: Beta users
  - Invite 5–10 users to WhatsApp sandbox
  - Collect feedback manually
  - Watch Supabase dashboard for reel inserts

DAY 7: Measure
  - % users who sent 2+ reels → engagement signal
  - % users who did tasks/remind → action signal
  - Decide: iterate or kill

TWILIO SANDBOX SETUP:
  → https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
  → Sandbox join phrase: "join <your-phrase>"
  → Webhook URL: https://your-domain.com/webhook
  → Method: POST

RAILWAY DEPLOY (fastest):
  npm install -g @railway/cli
  railway login
  railway init
  railway up
  railway domain
*/
