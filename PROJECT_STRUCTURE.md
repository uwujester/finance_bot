# 📁 Project Structure

```
smart-budget/
│
├── 📄 index.html           # Main application file (SPA)
├── 🎨 style.css            # Telegram-native styles with cell components
├── ⚙️ app.js               # Core logic (Agentic Architecture + CellsManager)
│
├── 📖 README.md            # Full project documentation
├── ⚡ QUICKSTART.md        # 3-minute getting started guide
├── 📚 EXAMPLES.md          # Comprehensive usage examples
├── 🔄 MIGRATION.md         # v1 → v2 migration guide
├── 📝 CHANGELOG.md         # Version history and release notes
├── 🚀 DEPLOYMENT.md        # Deployment instructions (GitHub Pages, Telegram Bot, etc.)
│
└── budget-app/             # Legacy folder (can be deleted)
```

---

## 🗂️ File Descriptions

### Core Application Files

#### `index.html` (Main App)
- Single-page application markup
- Telegram WebApp SDK integration
- Hero card, stats grid, cells container, analytics, chat input
- Settings modal with AI configuration
- Transaction history section

#### `style.css` (Styles)
- CSS custom properties for Telegram theming
- Responsive mobile-first design
- Dynamic cell components (`.financial-cell`)
- Light/Dark theme support
- Animations and transitions

#### `app.js` (Logic)
**Structure:**
```javascript
// 1. Telegram WebApp Init
// 2. State Management (appState)
// 3. Storage (localStorage + CloudStorage)
// 4. CellsManager Module
// 5. Toast Notifications
// 6. Financial Calculations (calculateFinancials, renderDashboard)
// 7. Analytics (filterTransactionsByPeriod, renderAnalytics)
// 8. AI Integration (processWithAI)
// 9. Form Handlers (handleExpenseSubmit)
// 10. Event Listeners (DOMContentLoaded)
```

**Key Components:**
- `CellsManager` - CRUD operations for financial cells
- `processWithAI()` - Agentic UI JSON parser
- `calculateFinancials()` - Balance calculations (free vs allocated)
- `renderCells()` - Dynamic cell rendering
- `renderDashboard()` - Main UI orchestrator

---

### Documentation Files

#### `README.md` ⭐ Start Here
- Project overview
- Features list with Agentic UI focus
- Installation instructions
- API provider setup
- Architecture explanation
- Quick examples

#### `QUICKSTART.md` ⚡ 3-Minute Guide
- Minimal setup steps
- Essential commands
- First cells creation
- Links to detailed docs

#### `EXAMPLES.md` 📚 Comprehensive Guide
- All cell types with examples
- Complex multi-action commands
- Button usage (Add/Withdraw/Delete)
- Error handling scenarios
- Full user scenarios (Day 1 → Day 30)

#### `MIGRATION.md` 🔄 v1 → v2
- What changed between versions
- Automatic migration process
- Manual migration steps
- FAQ and troubleshooting
- Rollback instructions

#### `CHANGELOG.md` 📝 Version History
- Release notes for v2.0.0
- Breaking changes documentation
- New features list
- Bug fixes
- Roadmap for future versions

#### `DEPLOYMENT.md` 🚀 Hosting Guide
- GitHub Pages deployment
- Telegram Bot integration
- Local development setup
- Alternative hosting (Netlify)
- Testing checklist
- Common issues & fixes

---

## 📊 Code Statistics

### Lines of Code (Approximate)
- `app.js`: ~1,200 lines
- `style.css`: ~900 lines
- `index.html`: ~280 lines
- **Total:** ~2,380 lines

### Key Metrics
- **Cell Types:** 4 (SAVINGS, GOAL, DEBT, SUBSCRIPTION)
- **AI Actions:** 6 (INCOME, EXPENSE, CREATE_CELL, UPDATE_CELL, DELETE_CELL, UPDATE_DAYS)
- **API Providers:** 5 (DeepSeek, OpenRouter, OpenAI, Groq, Custom)
- **Storage Keys:** 2 (v1, v2 with auto-migration)
- **Transaction Categories:** 9 (income, food, transport, entertainment, health, shopping, cell_deposit, cell_withdrawal, other)

---

## 🔧 Configuration Points

### Customizable Constants (in `app.js`)

```javascript
// Storage version
const STORAGE_KEY = 'smart_budget_data_v2';

// Default state
const defaultState = {
  apiKey: '',
  apiPreset: 'deepseek',
  apiEndpoint: 'https://api.deepseek.com/chat/completions',
  apiModel: 'deepseek-chat',
  currentBalance: 0,
  dailyLimit: 0,
  daysSalary: 14,
  cells: [],
  transactions: [],
  reminders: []
};

// Cell type configurations
CELL_TYPES = {
  DEBT: { icon: '💳', name: 'Долг / Кредит', color: '#ef4444', defaultAutoDeduct: 0.3 },
  SAVINGS: { icon: '💰', name: 'Вклад / Накопления', color: '#10b981' },
  GOAL: { icon: '🎯', name: 'Копилка на цель', color: '#8b5cf6' },
  SUBSCRIPTION: { icon: '📅', name: 'Подписка', color: '#f59e0b' }
};

// API Presets
const PRESETS = {
  deepseek: { endpoint: 'https://api.deepseek.com/chat/completions', model: 'deepseek-chat' },
  openrouter: { endpoint: 'https://openrouter.ai/api/v1/chat/completions', model: 'deepseek/deepseek-chat' },
  openai: { endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
  groq: { endpoint: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile' }
};
```

---

## 🎨 Styling Architecture

### CSS Variables (Themeable)
```css
/* Colors */
--accent-primary: #3b82f6
--accent-success: #10b981
--accent-danger: #ef4444
--accent-warning: #f59e0b
--accent-purple: #8b5cf6

/* Surfaces */
--surface-bg
--surface-card
--surface-border

/* Geometry */
--radius-sm: 8px
--radius-md: 14px
--radius-lg: 20px

/* Transitions */
--transition-fast: 0.15s ease
--transition-normal: 0.25s cubic-bezier(0.4, 0, 0.2, 1)
```

### Component Classes
- `.financial-cell` - Main cell container
- `.cell-header` - Cell top section with icon/title/amount
- `.cell-actions` - Button group (Add/Withdraw/Delete)
- `.cell-progress-bar` - Progress indicator for GOAL cells
- `.cell-type-badge` - Colored type label
- `.empty-cells-state` - Placeholder when no cells

---

## 🔄 Data Flow

```
User Input (Natural Language)
         ↓
  handleExpenseSubmit()
         ↓
   processWithAI() → Fetch API
         ↓
    AI Response (JSON with actions)
         ↓
   Parse & Execute Actions
         ↓
  Update appState + cells[]
         ↓
      saveData() → localStorage + CloudStorage
         ↓
   renderDashboard()
         ↓
  Update UI (balance, cells, transactions)
```

---

## 🧪 Testing Scenarios

### Unit Tests (Manual)
- [ ] Cell creation (all 4 types)
- [ ] Cell update (add/withdraw)
- [ ] Cell deletion
- [ ] Balance calculations
- [ ] Daily limit calculations
- [ ] Analytics filtering (Day/Week/Month/All)
- [ ] Transaction history
- [ ] Storage save/load
- [ ] Migration v1 → v2

### Integration Tests
- [ ] Multi-action commands
- [ ] Auto-deduct on income (DEBT cells)
- [ ] Interest calculation (SAVINGS cells)
- [ ] Progress tracking (GOAL cells)
- [ ] CloudStorage sync (Telegram)
- [ ] Theme switching (Light/Dark)

---

## 🚀 Performance Considerations

### Optimizations
- Single-pass cell rendering (O(n))
- Debounced AI requests (prevent spam)
- Lazy transaction history (max height with scroll)
- localStorage caching
- CSS transitions over JS animations

### Bottlenecks
- AI API latency (network-bound)
- Transaction history rendering (DOM-heavy if 100+ items)
- CloudStorage async operations

---

## 🔐 Security Checklist

- [x] XSS protection via `escapeHtml()` for user input
- [x] No eval() or innerHTML with untrusted data
- [x] API keys stored locally only (not sent to server)
- [x] HTTPS enforced for GitHub Pages deployment
- [x] CSP headers recommended (add to hosting)
- [x] Input validation for numeric fields
- [x] JSON.parse with try/catch for safety

---

## 📞 Maintenance

### Regular Tasks
- [ ] Update AI model list in PRESETS
- [ ] Monitor API provider changes
- [ ] Check Telegram WebApp SDK updates
- [ ] Review user feedback/issues
- [ ] Update documentation

### Version Bumps
- **Patch (2.0.x):** Bug fixes, typos, style tweaks
- **Minor (2.x.0):** New features (e.g., charts, export)
- **Major (x.0.0):** Breaking changes (e.g., new storage format)

---

## 🎯 Next Steps

1. ✅ Deploy to GitHub Pages
2. ✅ Set up Telegram Bot
3. ⏳ Collect user feedback
4. ⏳ Plan v2.1 features (see CHANGELOG.md roadmap)

---

**Project Status:** ✅ Production Ready (v2.0.0)
