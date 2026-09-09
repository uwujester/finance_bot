# 🚀 Deployment Guide - Smart Budget v2.0

## 📋 Pre-deployment Checklist

- [x] index.html - Main application file
- [x] style.css - Telegram-native styles
- [x] app.js - Core logic with Agentic Architecture
- [x] README.md - Full documentation
- [x] EXAMPLES.md - Usage examples
- [x] MIGRATION.md - Migration guide
- [x] CHANGELOG.md - Version history

---

## 🌐 Option 1: GitHub Pages (Recommended)

### Step 1: Create GitHub Repository
```bash
git init
git add .
git commit -m "Initial commit - Smart Budget v2.0 (Agentic Architecture)"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/smart-budget.git
git push -u origin main
```

### Step 2: Enable GitHub Pages
1. Go to repository **Settings**
2. Navigate to **Pages** section
3. Under **Source**, select branch: `main`
4. Click **Save**
5. Wait 1-2 minutes for deployment

### Step 3: Get Your URL
Your app will be available at:
```
https://YOUR_USERNAME.github.io/smart-budget/
```

---

## 📱 Option 2: Telegram Bot Integration

### Step 1: Create Bot via BotFather
1. Open [@BotFather](https://t.me/BotFather)
2. Send `/newbot`
3. Follow instructions to set name and username
4. Save your bot token (you won't need it for WebApp)

### Step 2: Create Web App
1. Send `/newapp` to BotFather
2. Select your bot
3. Provide:
   - **Title:** Smart Budget
   - **Description:** AI-powered personal finance manager with dynamic cells
   - **Photo:** Upload app icon (512x512 recommended)
   - **Demo GIF/Video:** Optional
   - **Web App URL:** Your GitHub Pages URL
   - **Short name:** `smartbudget` or similar

### Step 3: Set Menu Button (Optional)
1. Send `/setmenubutton` to BotFather
2. Select your bot
3. Paste your Web App URL
4. Set button text: "💰 Open Budget"

### Step 4: Test
1. Open your bot in Telegram
2. Click "💰 Open Budget" button
3. App should load in WebView

---

## 🔧 Option 3: Local Development

### Quick Start
```bash
# Just open index.html in browser
start index.html  # Windows
open index.html   # macOS
xdg-open index.html  # Linux
```

### With Live Server (VS Code)
1. Install "Live Server" extension
2. Right-click `index.html`
3. Select "Open with Live Server"
4. App opens at `http://localhost:5500`

### With Python
```bash
# Python 3
python -m http.server 8000

# Then open http://localhost:8000
```

### With Node.js
```bash
npx http-server -p 8000
```

---

## 🌍 Option 4: Netlify (Alternative to GitHub Pages)

### Via Drag & Drop
1. Go to [app.netlify.com](https://app.netlify.com)
2. Sign up / Log in
3. Drag & drop project folder
4. Get instant URL: `https://random-name.netlify.app`

### Via CLI
```bash
npm install -g netlify-cli
netlify deploy --prod
```

---

## 🔐 Environment Setup

### API Keys Configuration
The app stores API keys locally. First-time users need to:
1. Open app
2. Click ⚙️ Settings
3. Select AI provider (DeepSeek/OpenRouter/OpenAI/Groq)
4. Paste API key
5. Click "Save AI Settings"

### Recommended API Providers

| Provider | Free Tier | Cost | Speed | Best For |
|----------|-----------|------|-------|----------|
| **DeepSeek** | ✅ Yes | $0.14/M tokens | Fast | Budget-conscious |
| **Groq** | ✅ Yes (limited) | Free/Paid | Ultra-fast | Power users |
| **OpenRouter** | ❌ No | $0.06/M+ tokens | Medium | Model variety |
| **OpenAI** | ❌ No | $0.15/M tokens | Fast | Premium quality |

---

## 📊 Post-Deployment Testing

### Test Checklist
- [ ] App loads without errors (check Console F12)
- [ ] Telegram theme colors apply correctly
- [ ] Settings modal opens and closes
- [ ] Can enter API key and save
- [ ] Natural language input works: "balance 10000"
- [ ] Cell creation works: "create deposit 5000 at 15%"
- [ ] Cell actions work: ➕ Add, ➖ Withdraw, 🗑️ Delete
- [ ] Analytics toggle works (Day/Week/Month/All)
- [ ] Transaction history displays correctly
- [ ] CloudStorage saves data (if in Telegram)
- [ ] localStorage fallback works (in browser)

### Debug Commands (Browser Console)
```javascript
// Check current state
console.log(JSON.parse(localStorage.getItem('smart_budget_data_v2')));

// Check migration status
console.log(localStorage.getItem('smart_budget_data_v1')); // Should be null after migration

// Force re-migration (testing only)
localStorage.removeItem('smart_budget_data_v2');
location.reload();
```

---

## 🐛 Common Issues & Fixes

### Issue 1: API Key Not Saving
**Solution:** Check browser localStorage permissions
```javascript
// Test localStorage
try {
  localStorage.setItem('test', '1');
  localStorage.removeItem('test');
  console.log('✅ localStorage works');
} catch(e) {
  console.error('❌ localStorage blocked:', e);
}
```

### Issue 2: AI Not Responding
**Checklist:**
- [ ] API key is correct
- [ ] API endpoint is reachable (check Network tab)
- [ ] Model name is valid for selected provider
- [ ] Sufficient credits/quota on API account

### Issue 3: Cells Not Rendering
**Solution:** Check console for errors
```javascript
// Verify cells data
const state = JSON.parse(localStorage.getItem('smart_budget_data_v2'));
console.log('Cells:', state.cells);
```

### Issue 4: Telegram Theme Not Working
**Solution:** App must be opened in Telegram WebView
- Works ✅: Direct bot link in Telegram app
- Doesn't work ❌: Opening URL in external browser

---

## 🔄 Update Deployment

### GitHub Pages
```bash
git add .
git commit -m "Update: [description]"
git push
```
Changes go live in 1-2 minutes.

### Netlify
```bash
netlify deploy --prod
```

### Manual Update
Just replace files on hosting and hard refresh (Ctrl+F5).

---

## 📈 Monitoring & Analytics

### Built-in Diagnostics
App logs key events to console:
- Migration status
- API calls (errors only)
- Cell operations
- Storage operations

### Optional: Add Analytics
To track usage, add to `index.html` before `</head>`:
```html
<!-- Google Analytics (Optional) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

---

## 🔒 Security Considerations

### What's Secure ✅
- API keys stored locally only
- No data sent to third parties
- Zero-backend architecture
- CloudStorage encrypted by Telegram

### What to Watch ⚠️
- Users must trust their AI provider
- API keys in localStorage (not encrypted)
- XSS protection via `escapeHtml()` helper

### Recommendations
- Use DeepSeek for best price/security ratio
- Never share localStorage data
- Regularly rotate API keys

---

## 📞 Support & Maintenance

### User Support
1. Direct users to `README.md`
2. Check `EXAMPLES.md` for common patterns
3. Migration issues → `MIGRATION.md`

### Issue Reporting
Encourage users to report via GitHub Issues with:
- Browser/Telegram version
- Console errors (F12)
- Steps to reproduce

---

## 🎉 Deployment Complete!

Your Smart Budget v2.0 is now live! 🚀

**Next steps:**
1. Share bot link with users
2. Monitor console for errors
3. Collect feedback
4. Plan v2.1 features

---

**Questions?** Check documentation or create an issue on GitHub.
