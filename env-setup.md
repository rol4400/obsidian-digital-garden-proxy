# Environment Variables Setup

To use Supabase with your Netlify functions, you'll need to set up the following environment variables in your Netlify project settings:

1. `SUPABASE_URL` - Your Supabase project URL (e.g., https://xyzproject.supabase.co)
2. `SUPABASE_KEY` - Your Supabase service role key or anon/public key depending on your security requirements
3. `TELE_BOT_TOKEN` - Your Telegram bot token (unchanged from previous setup)

## How to set up in Netlify

1. Go to your Netlify site dashboard
2. Navigate to Site settings > Build & deploy > Environment
3. Add these environment variables
4. Redeploy your site for the changes to take effect

## Local Development

For local development, create a `.env` file with these variables:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-key
TELE_BOT_TOKEN=your-telegram-bot-token
```

Make sure to add `.env` to your `.gitignore` file to avoid exposing sensitive information.
