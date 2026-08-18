# discord-bot
discord bot for for sending release notes to the #changelog channel using webhooks and cloudflare.

Setup:
- Add new worker on cloudflare
- define the following env secrets: TEXT: DISCORD_ROLE_ID (role target); SECRETS: DISCORD_WEBHOOK_URL (copy paste value given at new DC webhook creation), GITHUB_WEBHOOK_SECRET (copy paste value given at GitHub Webhooks)
- paste worker.js into code editor and hit deploy
