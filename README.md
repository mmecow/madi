# MADI Translator

Easy-read translator with romanization, suggested replies, and vocabulary.

## Deploy to Vercel

1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → Import the repo
3. Add environment variable:
   - `GEMINI_API_KEY` = your Gemini API key
4. Deploy

## Add to iPhone home screen

1. Open the deployed URL in Safari
2. Tap the Share button (box with arrow)
3. Tap "Add to Home Screen"
4. Tap "Add"

## Local development

```bash
npm install
# Create .env.local and add:
# GEMINI_API_KEY=your_key_here
npm run dev
```
