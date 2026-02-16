# ⛪ SacredPool - Sacrament Blessing Scheduler

Automated weekly scheduling system for 3 priests to bless the sacrament at Sunday service.

## Live URL
https://sacredpool.vercel.app

## Architecture
- **Frontend/Backend**: Next.js 14 (App Router)
- **Database**: Supabase (project: lygrptakyxwjmvkavqww, us-east-2)
- **SMS**: Twilio (+19453002848)
- **Hosting**: Vercel (free tier)
- **Styling**: Tailwind CSS

## How It Works
1. **Monday 9 AM CST**: System texts top 3 priests from queue (sorted by last served date)
2. Priests reply YES/NO via SMS
3. **Thursday**: Check-in texts to confirmed priests
4. **Saturday**: Final reminder with co-server names
5. **Sunday**: Service happens, stats updated

## Admin Dashboard
Mobile-first single page at root URL:
- View current week's assignments (green=confirmed, yellow=pending)
- Manage priest roster (add/edit/remove)
- View service history

## Twilio Webhook
SMS replies are received at `/api/sms/receive` (configured in Twilio)

## Environment Variables
Set in Vercel dashboard:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- `CRON_SECRET`

## Database Schema
See `supabase-schema.sql` - run in Supabase SQL Editor
