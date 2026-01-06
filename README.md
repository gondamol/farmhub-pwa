# FarmHub Web App

A Progressive Web App (PWA) for goat farm management.

## Features

- 🐐 **Herd Management** - Track all goats with profiles, photos, and genealogy
- 💉 **Health Records** - Vaccinations, deworming, and health events
- ❤️ **Breeding Management** - Track breeding, pregnancies, and kidding
- 💰 **Financial Tracking** - Income, expenses, and profitability analysis
- 🔔 **Smart Reminders** - Never miss a vaccination or kidding date
- 📴 **Offline First** - Works without internet connection
- 📱 **Mobile Friendly** - Install as an app on your phone

## Installation

### Local Development

1. Open the folder in a local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Or using Node.js
   npx serve .
   ```

2. Open http://localhost:8000 in your browser

### Deploy to GitHub Pages

1. Create a new GitHub repository
2. Push this folder to the repository
3. Go to Settings → Pages → Source: main branch
4. Access at: https://yourusername.github.io/farmhub-web/

### Install as Mobile App

1. Open the web app in Chrome on your phone
2. Tap the menu (⋮) → "Add to Home Screen"
3. The app will work offline!

## Project Structure

```
farmhub-web/
├── index.html          # Main HTML file
├── manifest.json       # PWA configuration
├── sw.js              # Service Worker (offline support)
├── css/
│   └── style.css      # All styles
├── js/
│   ├── db.js          # IndexedDB database
│   ├── components.js  # UI components
│   ├── pages.js       # Page renderers
│   └── app.js         # Main application
└── assets/
    └── icons/         # App icons
```

## Data Storage

All data is stored locally in your browser using IndexedDB. 

**Important:** Export your data regularly using the Export/Import feature!

## Roadmap

- [ ] Cloud sync (Cloudflare Workers)
- [ ] Multi-device sync
- [ ] 5-year financial projections
- [ ] Photo upload for goats
- [ ] Investment portal for external investors

## Made for Kenyan Farmers 🇰🇪

Built with specific features for East African goat farming:
- Kenya-specific vaccines (PPR, CCPP)
- FAMACHA scoring for deworming
- KES currency
- East African goat breeds

---

**Kazi iendelee! 🚀🐐**
