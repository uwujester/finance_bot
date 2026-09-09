# 📝 Changelog

All notable changes to Smart Budget project will be documented in this file.

---

## [2.5.0] - 2025-01-XX - **Proactive AI Analysis & Smart UI** 🧠✨

### 🎯 Major Features

#### 🤖 Proactive AI Analysis (Always Active)
- **NEW:** AI analyzes financial situation automatically on app load
- **NEW:** AI recommendations update in real-time after any financial change
- **NEW:** Smart caching system (5 min) to reduce API calls
- **NEW:** AI analyzes entire financial picture:
  * Current balance and available funds
  * Days until next salary
  * All active debts (total + individual)
  * Progress on savings goals
  * Financial priorities (debts → subscriptions → savings → reserve)

#### 🏠 AI Recommendations on Main Screen
- **NEW:** Prominent debt recommendation banner (only for users with debts)
  * Shows all active debts with amounts
  * AI-powered repayment recommendation
  * Beautiful gradient yellow banner with lightning emoji
- **NEW:** AI-powered food budget advice in "Бюджет на питание" cell
  * Instead of generic "~333 ₽/день"
  * Shows contextual AI advice: "💡 Всё стабильно! Тратьте разумно ~333 ₽/день"
  * Updates after each financial operation

#### 💳 Better UX for Debt Management
- **CHANGED:** Debt cells now show "💳 Погасить" (Repay) instead of "➕ Пополнить" (Add)
- **REMOVED:** "Снять" (Withdraw) button from debt cells (illogical to withdraw from debt)
- **REMOVED:** "Автовзнос" (Auto-deduct) display from debt cells
- **CHANGED:** Modal title for debts: "💳 Погасить долг" instead of "➕ Пополнить ячейку"
- **IMPROVED:** Only "Погасить" and "Удалить" buttons for debt cells
- **PRESERVED:** "Пополнить", "Снять", "Удалить" for other cell types (SAVINGS, GOAL, SUBSCRIPTION)

#### 🎨 AI Recommendations in Modal Windows
- **NEW:** AI analyzes situation when opening cell modals
- **NEW:** Real-time professional recommendations for deposits/repayments
- **NEW:** Intelligent loading state: "🤖 Анализирую ситуацию..."
- **NEW:** Context-aware suggestions in beautiful blue info boxes
- **NEW:** Fallback to basic info if AI unavailable

### 🔄 Real-Time Updates
- AI cache invalidates automatically after:
  * Manual cell deposits/withdrawals
  * AI-executed financial actions (INCOME, EXPENSE, UPDATE_CELL, etc.)
  * Creating or deleting cells
- Dashboard re-renders with fresh AI recommendations
- Seamless UX: user sees updated advice immediately

### 🔧 Technical Implementation
- **NEW:** `getProactiveAiAnalysis()`: Async function for background AI analysis
- **NEW:** `aiAnalysisCache`: Smart caching with 5-minute TTL
- **NEW:** AI prompt optimized for two-part response:
  * ДОЛГ: Debt repayment recommendation (only if debts exist)
  * ЕДА: Daily food budget advice
- **CHANGED:** `renderCells()`: Renders debt recommendation banner + AI-powered food advice
- **CHANGED:** `confirmCellAction()`: Invalidates cache and refreshes AI after operations
- **CHANGED:** `handleExpenseSubmit()`: Refreshes AI analysis after chat actions
- **REMOVED:** "Автовзнос" detail line from debt cell rendering

### 📊 AI Analysis Examples

**Debt Recommendation Banner:**
```
⚡ РЕКОМЕНДАЦИЯ ПО КРЕДИТУ:
📊 Активные долги: Кредитка: 30 000 Р
💡 Погасите минимум 9 000 ₽ (30% долга) для снижения процентов
```

**Food Budget Advice:**
```
💡 Всё стабильно! Тратьте разумно ~333 ₽/день
```

**Modal AI Recommendations:**
```
💡 Рекомендую погасить: 9 000 ₽
При долге 30 000₽ и балансе 10 000₽ разумно внести 90% 
с учётом минимального резерва на неотложные расходы.
```

### 🎯 User Experience Flow

**Before (v2.4):**
- User opens modal → sees generic percentages (30%, 50%)
- Main screen shows static calculations
- No context-aware advice

**After (v2.5):**
- App loads → AI analyzes → shows personalized banner for debts
- Food budget shows AI advice instead of simple math
- User opens modal → AI analyzes → shows smart recommendation
- User makes transaction → AI re-analyzes → updates all advice

---

## [2.4.0] - 2025-01-XX - **AI Full Control & Bug Fixes** 🤖

### 🎯 Major Changes

#### 🤖 AI Now Controls ALL Financial Distribution
- **REMOVED:** Fixed 30/30/40 percentage logic from system
- **REMOVED:** `autoDeduct` default value (was 0.3 / 30%)
- **REMOVED:** Hardcoded recommendations in modals (50% for savings, 30% for debt)
- **REMOVED:** Food budget calculation (was `freeBalance * 0.6`)
- **NEW:** AI makes 100% of distribution decisions based on user's financial situation
- **NEW:** Two-step confirmation process for income distribution:
  1. AI analyzes situation and gives recommendation
  2. User confirms with "Принято", "Давай", or "Ок"
  3. AI executes multiple UPDATE_CELL actions to distribute funds

#### 💡 How It Works Now:
```
User: "Пришла зарплата 10000"
AI: Analyzes debts, goals, subscriptions
    Returns ONLY INCOME action
    Gives recommendation in text

User: "Принято"
AI: Executes UPDATE_CELL actions to distribute
    Money goes to debts, savings, goals as recommended
```

### 🐛 Bug Fixes
- **FIXED:** Food budget showing incorrect amount (was 60% of balance, now shows actual free balance)
- **FIXED:** Savings modal recommending 50% without considering debts (removed formula)
- **FIXED:** Debt modal showing "30% от долга" hardcoded recommendation (removed formula)
- **FIXED:** `userInput is not defined` error → changed to `text`
- **FIXED:** Template literals in system prompt causing syntax errors

### 🔧 Technical Changes
- `CellsManager.CELL_TYPES.DEBT.defaultAutoDeduct`: 0.3 → 0
- `createCell()`: No longer sets autoDeduct to 0.3 for DEBT cells
- `addToCellPrompt()`: Removed `recommendedAmount` calculations for DEBT and SAVINGS
- `renderCells()`: Food budget now shows `freeBalance` instead of `freeBalance * 0.6`
- System prompt: Removed autoDeduct instructions, added confirmation workflow
- AI now uses multiple actions in single response for complex operations

### 📊 Financial Logic Improvements
- No hardcoded percentages anywhere in the system
- AI analyzes: debts, goals, subscriptions, days until salary
- Priority order: Critical debts → Subscriptions → Savings → Living expenses
- AI suggests closing goals that are >70% complete
- Debt repayment calculated by AI based on situation (not hardcoded 30%)
- Minimum 20% of income always reserved for living expenses (AI guideline, not enforcement)

---

## [2.3.0] - 2025-01-XX - **AI Intelligence & Bug Fixes** 🧠

### 🐛 Bug Fixes

#### ✅ Fixed Transaction Display
- **FIXED:** Cell withdrawal now correctly shows as `+` (income) instead of `-`
- **FIXED:** Changed logic from `tx.category === 'income'` to `meta.isIncome` check
- **IMPACT:** Withdrawals from savings/goals now properly display as positive transactions

#### 💳 DEBT Cell Creation
- **FIXED:** AI can now create DEBT cells without requiring balance
- **LOGIC:** DEBT and SUBSCRIPTION are liabilities, not assets - no balance check needed
- **BEFORE:** "Недостаточно средств для создания ячейки" error
- **AFTER:** Debt cells created immediately, user can repay later

### 🎉 New Features

#### 🧠 AI Conversation Memory
- **NEW:** AI now remembers last 10 messages (5 exchanges) for context
- **NEW:** Maintains conversation flow across multiple questions
- **NEW:** Can reference previous answers and build on context
- **EXAMPLE:** "Сколько у меня долгов?" → "А во вкладах?" (AI remembers first question)
- **TECHNICAL:** `conversationHistory[]` array with automatic pruning

#### 💡 Smart Financial Distribution
- **NEW:** AI dynamically calculates optimal money allocation (no more fixed 30/30/40%)
- **NEW:** Analyzes current debts, goals, and financial situation
- **NEW:** Provides personalized recommendations based on:
  - Debt size (large debt → 40-50% repayment, small debt → 20-30%)
  - Goal proximity (>80% saved → suggest full completion)
  - Subscription obligations
  - Emergency fund needs
- **NEW:** Context-aware advice format in AI responses
- **EXAMPLE:** "💰 Рекомендую: 40% на долг, 25% во вклад, 35% на жизнь"

### 🔧 Technical Improvements
- Transaction rendering now uses `meta.isIncome` flag consistently
- Cell creation logic differentiates between assets and liabilities
- Conversation history automatically trimmed to last 10 messages
- System prompt enhanced with financial intelligence guidelines

---

## [2.2.0] - 2025-01-XX - **UX & AI Enhancements** 💎

### 🎉 New Features

#### 💡 Smart Recommendations
- **NEW:** Cell deposit prompts now show intelligent suggestions based on cell type
- **NEW:** DEBT cells show recommended 30% payment amount
- **NEW:** SAVINGS cells suggest 50% of available balance
- **NEW:** GOAL cells display remaining amount to target
- **NEW:** Real-time balance availability checks

#### 🎨 Beautiful Input Modals
- **NEW:** Replaced native `prompt()` with custom modal windows
- **NEW:** Large, centered amount input with better UX
- **NEW:** Context-aware information display (recommendations, limits, warnings)
- **NEW:** Color-coded highlights (blue for recommendations, red for warnings)
- **NEW:** Keyboard support (Enter to confirm, Escape to cancel)

#### 🤖 AI Balance Correction
- **NEW:** AI can now correct balance via `SET_BALANCE` action
- **NEW:** Use phrases like "исправь баланс на 50000" or "у меня неправильный баланс"
- **NEW:** Balance corrections tracked in transaction history
- **NEW:** Initial balance set to 0 ₽ (was undefined)

#### 🗑️ Smart Cell Deletion
- **CHANGED:** Deleting a cell NO LONGER returns funds to balance
- **NEW:** Warning prompt if cell contains funds
- **NEW:** Recommends using "Снять" button before deletion
- **NEW:** Prevents accidental money loss

### 🔧 Technical Improvements
- Custom modal system with backdrop blur effect
- Modal state management via `cellActionModalState`
- Improved HTML escaping for XSS protection
- Better type validation for numeric inputs
- Enhanced transaction categorization (`balance_correction`)

---

## [2.1.0] - 2025-01-XX - **UX Improvements & Onboarding** 🎨

### 🎉 New Features

#### 🏠 UI Consolidation
- **IMPROVED:** Merged all financial cards into single unified section "🏦 Мои финансы"
- **NEW:** 3 base cells always visible: Balance, Days to Salary, Food Budget
- **NEW:** Visual separator between base cells and user-created cells
- **IMPROVED:** Cleaner layout with `.base-cell` styling for core metrics

#### 👋 Welcome Message & Onboarding
- **NEW:** First-time user welcome screen with step-by-step guide
- **NEW:** Quick command examples for faster onboarding
- **NEW:** Automatic display on first `/start` (stored in localStorage)

#### 🔔 Payment Reminders System
- **NEW:** Automatic reminder checks for DEBT and SUBSCRIPTION cells
- **NEW:** Notifications for payments due today, tomorrow, or in 3 days
- **NEW:** Smart daily check (once per day via sessionStorage)
- **NEW:** Visual payment alerts with emoji indicators

#### 🐛 Bug Fixes
- **FIXED:** Cell action buttons now working correctly (event delegation pattern)
- **FIXED:** Replaced `onclick` with `data-action` attributes for dynamic content
- **FIXED:** Removed duplicate `case` statements in category mapping
- **FIXED:** Event listeners now properly attached to dynamically rendered cells

### 🔧 Technical Improvements
- Implemented event delegation for `.cell-action-btn` clicks
- Added `checkPaymentReminders()` function with date-based logic
- Added `showWelcomeMessage()` with first-run detection
- Converted window-scoped functions to module-scoped for cleaner namespace

---

## [2.0.0] - 2025-01-XX - **Agentic Architecture Release** 🚀

### 🎉 Major Features

#### 🏦 Dynamic Financial Cells System
- **NEW:** Introduced modular cell-based architecture replacing static cards
- **NEW:** 4 cell types: SAVINGS, GOAL, DEBT, SUBSCRIPTION
- **NEW:** Each cell is AI-manageable through natural language
- **NEW:** Interactive cell actions: ➕ Add funds, ➖ Withdraw, 🗑️ Delete

#### 🧠 Agentic UI & AI-Driven Interface
- **BREAKING:** New AI response format with `actions` array
- **NEW:** AI can now execute multiple structured actions:
  - `INCOME` - Add funds to balance
  - `EXPENSE` - Deduct from balance
  - `CREATE_CELL` - Create new financial cell
  - `UPDATE_CELL` - Modify cell amounts
  - `DELETE_CELL` - Remove cells
  - `UPDATE_DAYS` - Change salary countdown
- **NEW:** Multi-action commands support (e.g., "salary 50k, create deposit 30k, debt 15k")

#### 💰 SAVINGS Cells (Deposits)
- Store funds with interest rate tracking
- Automatic monthly income calculation display
- Example: "Create deposit 100000 at 18% annual"

#### 🎯 GOAL Cells (Savings Goals)
- Target-based savings with progress bar
- Visual percentage tracking
- Example: "Piggy bank for iPhone 80000"

#### 💳 DEBT Cells (Credit Management)
- Auto-deduct feature: % of income goes automatically to debt
- Replaces old `creditDebt` field with flexible cell system
- Example: "Credit card debt 25000 with 30% auto-deduct"

#### 📅 SUBSCRIPTION Cells (Recurring Payments)
- Track monthly subscriptions with day-of-month
- Ready for future reminder integrations
- Example: "Subscription Netflix 999 on 5th of month"

### 🔧 Technical Improvements

#### Architecture
- **NEW:** `CellsManager` module for centralized cell operations
- **NEW:** `calculateFinancials()` - smart balance calculation (free vs allocated)
- **NEW:** Data structure v2 with `cells[]` array
- **NEW:** Automatic migration from v1 to v2

#### UI/UX
- **NEW:** Dynamic cells container with empty state
- **NEW:** Cell type badges with color coding
- **NEW:** Per-cell action buttons (Add/Withdraw/Delete)
- **NEW:** Cell-specific details (progress bars, rates, auto-deduct info)
- **IMPROVED:** Analytics section now shows debt info from cells
- **IMPROVED:** Dashboard calculations based on free balance only

#### Data Management
- **BREAKING:** Storage key changed from `smart_budget_data_v1` to `smart_budget_data_v2`
- **NEW:** Automatic migration converts `creditDebt` → DEBT cell
- **NEW:** `dailyLimit` field (auto-calculated)
- **NEW:** `reminders[]` array (future-ready)

### 🎨 Styling & Design
- **NEW:** `.financial-cell` component styles
- **NEW:** Cell type color system:
  - DEBT: `#ef4444` (red)
  - SAVINGS: `#10b981` (green)
  - GOAL: `#8b5cf6` (purple)
  - SUBSCRIPTION: `#f59e0b` (orange)
- **NEW:** Cell action buttons with hover effects
- **NEW:** Progress bar animations for GOAL cells
- **NEW:** Empty state illustration for cells container

### 🔄 Migration & Compatibility
- ✅ Automatic v1 → v2 migration on first load
- ✅ Preserves all transactions, API keys, settings
- ✅ Converts old `creditDebt` to DEBT cell with 30% auto-deduct
- ✅ Backward-compatible natural language commands

### 📚 Documentation
- **NEW:** `EXAMPLES.md` - Comprehensive usage examples
- **NEW:** `MIGRATION.md` - Migration guide from v1 to v2
- **UPDATED:** `README.md` - Full rewrite with Agentic UI focus
- **NEW:** Changelog (this file)

### 🐛 Bug Fixes
- Fixed duplicate `formatMoney()` function definition
- Fixed duplicate `renderDashboard()` logic
- Removed legacy debt calculation code
- Added `escapeHtml()` helper to prevent XSS in cell titles

### ⚠️ Breaking Changes
- **BREAKING:** Old AI JSON format no longer supported:
  - ❌ `income_items`, `expense_items`, `new_balance`, `new_debt`, `new_days`
  - ✅ New format: `{ ai_response, daily_limit, actions: [...] }`
- **BREAKING:** `creditDebt` field removed from state (use DEBT cells)
- **BREAKING:** Storage key changed (auto-migration handles this)

### 🚀 Performance
- Cell rendering is O(n) with single loop
- localStorage + CloudStorage dual persistence
- Efficient DOM updates with targeted renders

---

## [1.0.0] - 2025-01-XX - **Initial Release**

### Features
- Natural language budget management
- Multi-LLM support (DeepSeek, OpenRouter, OpenAI, Groq)
- Period-based analytics (Day/Week/Month/All)
- Smart debt payoff recommendations
- Transaction history with categories
- Telegram Mini App integration
- Dark/Light theme support
- Zero-backend architecture (localStorage + CloudStorage)

### Core Functionality
- Income/expense tracking via AI
- Manual balance/debt/days parameters
- Automatic daily food budget calculation (60% rule)
- Q&A financial advisor
- Settings modal with API configuration

### Tech Stack
- Pure HTML5/CSS3/Vanilla JavaScript
- Telegram WebApp SDK integration
- OpenAI-compatible chat completions API

---

## Versioning

This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality additions
- **PATCH** version for backwards-compatible bug fixes

---

## Migration Notes

### v1.x → v2.0
See [MIGRATION.md](./MIGRATION.md) for detailed migration guide.

**TL;DR:**
- Automatic migration on first load
- Old `creditDebt` becomes DEBT cell
- All data preserved
- New AI commands available immediately

---

## Roadmap

### v2.1 (Planned)
- [ ] Reminder system with Telegram Bot notifications
- [ ] Export/import financial data (JSON/CSV)
- [ ] Cell templates (quick create from presets)
- [ ] Multi-currency support

### v2.2 (Planned)
- [ ] Charts & visual analytics
- [ ] Budget forecasting with ML
- [ ] Shared family budgets
- [ ] Cloud sync between devices

### v3.0 (Future)
- [ ] Telegram Bot backend for reminders
- [ ] Voice commands via Telegram Voice Messages
- [ ] Bank account integration (read-only)
- [ ] Receipt scanning (OCR)

---

## Contributors

- **Lead Developer:** [Your Name]
- **AI Assistant:** Claude (Anthropic)

---

## License

MIT License - See [LICENSE](./LICENSE) file for details.

---

**Thank you for using Smart Budget!** 💰✨
