/**
 * Smart Budget - Telegram Mini App
 * Zero-Backend with DeepSeek API integration
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. Telegram WebApp Initialization & Helpers
  // =========================================================================
  const tg = window.Telegram?.WebApp;
  let isTgReady = false;

  if (tg) {
    try {
      tg.ready();
      tg.expand();
      isTgReady = true;

      // Apply Telegram theme colors to document
      if (tg.colorScheme === 'light') {
        document.body.classList.add('light-theme');
      }

      tg.onEvent?.('themeChanged', function () {
        if (tg.colorScheme === 'light') {
          document.body.classList.add('light-theme');
        } else {
          document.body.classList.remove('light-theme');
        }
      });

      // Set header color if supported
      if (tg.isVersionAtLeast?.('6.1') && tg.setHeaderColor) {
        tg.setHeaderColor('secondary_bg_color');
      }
    } catch (e) {
      console.warn('Telegram WebApp init notice:', e);
    }
  }

  function triggerHaptic(type = 'light') {
    if (!tg?.HapticFeedback) return;
    try {
      if (type === 'success' || type === 'error' || type === 'warning') {
        tg.HapticFeedback.notificationOccurred(type);
      } else {
        tg.HapticFeedback.impactOccurred(type); // 'light' | 'medium' | 'heavy'
      }
    } catch (e) {
      console.warn('Haptic feedback error:', e);
    }
  }

  // =========================================================================
  // 2. Storage System (Telegram CloudStorage with LocalStorage fallback)
  // =========================================================================
  const STORAGE_KEY = 'smart_budget_data_v1';

  const defaultState = {
    apiKey: '',
    apiPreset: 'deepseek',
    apiEndpoint: 'https://api.deepseek.com/chat/completions',
    apiModel: 'deepseek-chat',
    currentBalance: 0,
    creditDebt: 0,
    daysSalary: 14,
    transactions: []
  };

  const PRESETS = {
    deepseek: {
      endpoint: 'https://api.deepseek.com/chat/completions',
      model: 'deepseek-chat'
    },
    openrouter: {
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      model: 'deepseek/deepseek-chat'
    },
    openai: {
      endpoint: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4o-mini'
    },
    groq: {
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      model: 'llama-3.3-70b-versatile'
    }
  };

  let appState = { ...defaultState };

  async function loadData() {
    loadFromLocalStorage(); // Всегда загружаем локальные данные первыми

    try {
      if (tg?.isVersionAtLeast?.('6.9') && tg?.CloudStorage?.getItem) {
        return new Promise((resolve) => {
          try {
            tg.CloudStorage.getItem(STORAGE_KEY, (err, result) => {
              if (!err && result) {
                try {
                  const parsed = JSON.parse(result);
                  appState = { ...defaultState, ...parsed };
                } catch (e) {
                  console.error('Failed to parse CloudStorage data', e);
                }
              }
              resolve(appState);
            });
          } catch (_) {
            resolve(appState);
          }
        });
      }
    } catch (e) {
      console.warn('CloudStorage not available in this environment:', e);
    }
    return Promise.resolve(appState);
  }

  function loadFromLocalStorage() {
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        appState = { ...defaultState, ...parsed };
      }
    } catch (e) {
      console.error('Failed to load from localStorage', e);
    }
  }

  function saveData() {
    try {
      const serialized = JSON.stringify(appState);
      localStorage.setItem(STORAGE_KEY, serialized);
      if (tg?.isVersionAtLeast?.('6.9') && tg?.CloudStorage?.setItem) {
        tg.CloudStorage.setItem(STORAGE_KEY, serialized, (err) => {
          if (err) console.warn('CloudStorage save error:', err);
        });
      }
    } catch (e) {
      console.error('Failed to save data', e);
    }
  }

  // =========================================================================
  // 3. UI Elements References
  // =========================================================================
  const elements = {
    userName: document.getElementById('userName'),
    userAvatar: document.getElementById('userAvatar'),
    apiKeyBanner: document.getElementById('apiKeyBanner'),
    bannerSettingsBtn: document.getElementById('bannerSettingsBtn'),
    openSettingsBtn: document.getElementById('openSettingsBtn'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),
    cancelSettingsBtn: document.getElementById('cancelSettingsBtn'),
    settingsModal: document.getElementById('settingsModal'),
    settingsForm: document.getElementById('settingsForm'),
    
    // Inputs in settings (Only AI settings)
    apiKeyInput: document.getElementById('apiKeyInput'),
    apiPresetSelect: document.getElementById('apiPresetSelect'),
    apiEndpointInput: document.getElementById('apiEndpointInput'),
    apiModelInput: document.getElementById('apiModelInput'),
    currentModelBadge: document.getElementById('currentModelBadge'),
    toggleApiKeyVisibility: document.getElementById('toggleApiKeyVisibility'),

    // Dashboard values
    dailyFoodAmount: document.getElementById('dailyFoodAmount'),
    daysCountBadge: document.getElementById('daysCountBadge'),
    foodProgressBar: document.getElementById('foodProgressBar'),
    currentBalance: document.getElementById('currentBalance'),
    remainingDebt: document.getElementById('remainingDebt'),
    remainingFood: document.getElementById('remainingFood'),
    daysToSalary: document.getElementById('daysToSalary'),

    // Expense & Chat input form
    expenseForm: document.getElementById('expenseForm'),
    naturalInput: document.getElementById('naturalInput'),
    sendBtn: document.getElementById('sendBtn'),
    sendIcon: document.getElementById('sendIcon'),
    loadingSpinner: document.getElementById('loadingSpinner'),

    // AI Response box
    aiResponseBox: document.getElementById('aiResponseBox'),
    aiResponseText: document.getElementById('aiResponseText'),
    closeAiResponseBtn: document.getElementById('closeAiResponseBtn'),

    // Transactions list
    transactionsList: document.getElementById('transactionsList'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    toastContainer: document.getElementById('toastContainer')
  };

  // =========================================================================
  // 4. Toast Notifications
  // =========================================================================
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // =========================================================================
  // 5. Budget Computation & Render Logic
  // =========================================================================
  function formatMoney(amount) {
    return Math.round(amount).toLocaleString('ru-RU');
  }

  function renderDashboard() {
    const currentBalance = Number(appState.currentBalance) || 0;
    const remainingDebt = Number(appState.creditDebt) || 0;
    const days = Math.max(1, Number(appState.daysSalary) || 1);

    // Auto-calculate available food budget:
    // 60% of free funds allocated for food
    const freePool = Math.max(0, currentBalance);
    const calculatedFoodBudget = Math.round(freePool * 0.6);

    // Daily food = Остаток на еду / Дней
    const dailyFood = Math.round(calculatedFoodBudget / days);

    // Progress bar
    const foodPercent = freePool > 0 ? Math.min(100, Math.max(0, (calculatedFoodBudget / (freePool || 1)) * 100)) : 0;

    // Update DOM
    elements.dailyFoodAmount.textContent = formatMoney(dailyFood);
    elements.daysCountBadge.textContent = days;
    elements.currentBalance.textContent = formatMoney(currentBalance);
    elements.remainingDebt.textContent = formatMoney(remainingDebt);
    elements.remainingFood.textContent = formatMoney(calculatedFoodBudget);
    elements.daysToSalary.textContent = days;
    elements.foodProgressBar.style.width = `${foodPercent}%`;

    // Update Model Badge
    if (elements.currentModelBadge) {
      const modelLabel = appState.apiModel || 'AI';
      elements.currentModelBadge.textContent = modelLabel.length > 18 ? modelLabel.substring(0, 15) + '...' : modelLabel;
      elements.currentModelBadge.title = `Endpoint: ${appState.apiEndpoint || 'default'}\nModel: ${appState.apiModel || 'default'}`;
    }

    // API Key warning banner
    if (!appState.apiKey || appState.apiKey.trim() === '') {
      elements.apiKeyBanner.classList.remove('hidden');
    } else {
      elements.apiKeyBanner.classList.add('hidden');
    }

    renderTransactions();
  }

  function getCategoryMeta(category) {
    switch (category) {
      case 'food':
        return { icon: '🍔', name: 'Еда & Продукты', class: 'expense', isIncome: false };
      case 'income':
        return { icon: '💵', name: 'Пополнение / Доход', class: 'income', isIncome: true };
      case 'credit_debt':
        return { icon: '💳', name: 'Погашение кредита', class: 'debt-repay', isIncome: false };
      case 'transport':
        return { icon: '🚕', name: 'Транспорт', class: 'expense', isIncome: false };
      case 'entertainment':
        return { icon: '🎉', name: 'Развлечения', class: 'expense', isIncome: false };
      default:
        return { icon: '🏷️', name: 'Расход', class: 'expense', isIncome: false };
    }
  }

  function renderTransactions() {
    if (!appState.transactions || appState.transactions.length === 0) {
      elements.transactionsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <p>Нет операций. Напишите «пришли 10000», «обед 350» или «осталось 10 дней», и ИИ всё настроит автоматически!</p>
        </div>
      `;
      return;
    }

    const html = appState.transactions
      .slice()
      .reverse()
      .map((tx) => {
        const meta = getCategoryMeta(tx.category);
        const dateFormatted = new Date(tx.date).toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        });

        const sign = tx.category === 'income' ? '+' : '-';

        return `
          <div class="transaction-item" data-id="${tx.id}">
            <div class="tx-left">
              <div class="tx-icon">${meta.icon}</div>
              <div class="tx-details">
                <div class="tx-desc">${escapeHtml(tx.description || meta.name)}</div>
                <div class="tx-meta">
                  <span class="tx-category-badge">${meta.name}</span> • <span>${dateFormatted}</span>
                </div>
              </div>
            </div>
            <div class="tx-right">
              <div class="tx-amount ${meta.class}">
                ${sign}${formatMoney(tx.amount)} ₽
              </div>
              <button class="tx-delete-btn" onclick="window._deleteTx('${tx.id}')" title="Удалить">🗑️</button>
            </div>
          </div>
        `;
      })
      .join('');

    elements.transactionsList.innerHTML = html;
  }

  function escapeHtml(string) {
    const div = document.createElement('div');
    div.textContent = string;
    return div.innerHTML;
  }

  // Window bridge for deleting item
  window._deleteTx = function (id) {
    appState.transactions = appState.transactions.filter((tx) => tx.id !== id);
    saveData();
    renderDashboard();
    triggerHaptic('light');
    showToast('Операция удалена', 'info');
  };

  // =========================================================================
  // 6. Universal LLM Agent (Expenses, Incomes, Days, Debts & QA)
  // =========================================================================
  async function processWithAI(userInput) {
    const apiKey = appState.apiKey?.trim();
    if (!apiKey) {
      throw new Error('API-ключ не указан! Откройте настройки ⚙️ и введите ключ.');
    }

    const endpoint = appState.apiEndpoint || 'https://api.deepseek.com/chat/completions';
    const model = appState.apiModel || 'deepseek-chat';

    // Current budget context
    const currentBalance = Number(appState.currentBalance) || 0;
    const remainingDebt = Number(appState.creditDebt) || 0;
    const days = Math.max(1, Number(appState.daysSalary) || 1);

    const freePool = Math.max(0, currentBalance);
    const calculatedFoodBudget = Math.round(freePool * 0.6);
    const dailyFood = Math.round(calculatedFoodBudget / days);

    const systemPrompt = `Ты — умный персональный финансовый ассистент в Telegram Mini App.

ТЕКУЩЕЕ СОСТОЯНИЕ БЮДЖЕТА:
- Текущий баланс: ${currentBalance} ₽
- Долг по кредитке / кредиту: ${remainingDebt} ₽
- Дней до зарплаты: ${days} дн.
- Рассчитанный остаток на еду (60%): ${calculatedFoodBudget} ₽ (~${dailyFood} ₽/день)

ТВОЯ ЗАДАЧА:
Проанализируй ввод пользователя на русском языке и определи действия. Ввод может содержать одно или сразу несколько действий.

ВОЗМОЖНЫЕ ДЕЙСТВИЯ:
1. ДОХОД / ПОПОЛНЕНИЕ БАЛАНСА (например: "пришли деньги 5000", "дали премию 20000", "зарплата 65000", "баланс 10000", "у меня сейчас 30000 рублей"):
   -> Добавь в income_items или укажи new_balance.
2. РАСХОД (например: "кофе 250", "купил продукты 1200 и аптека 450"):
   -> Добавь в expense_items.
3. ПОГАШЕНИЕ ДОЛГА (например: "закинул на кредитку 3000", "погасил долг 5000"):
   -> Добавь в expense_items с категорией "credit_debt".
4. УСТАНОВКА ИЛИ ИЗМЕНЕНИЕ ДОЛГА (например: "мой долг 15000", "у меня долг по кредитке 25к"):
   -> Укажи new_debt.
5. УСТАНОВКА ИЛИ ИЗМЕНЕНИЕ ДНЕЙ ДО ЗП (например: "осталось 10 дней", "до зарплаты 5 дней", "с этими деньгами на 2 недели", "мне на 20 дней"):
   -> Укажи new_days.
6. ВОПРОС / СОВЕТ / ОБЩЕНИЕ (например: "на сколько дней мне хватит?", "сколько могу тратить в день?", "дай совет"):
   -> Составь развернутый, доброжелательный, математически точный ответ с расчетом в поле message.

ВЕРНИ СТРОГО JSON следующего формата:
{
  "income_items": [
    {
      "amount": number,
      "description": string
    }
  ],
  "expense_items": [
    {
      "amount": number,
      "category": "food" | "credit_debt" | "transport" | "entertainment" | "general",
      "description": string
    }
  ],
  "new_balance": number | null, // Заполни, если пользователь прямо задал баланс ("мой баланс 25000")
  "new_debt": number | null,    // Заполни, если пользователь задал/обновил сумму долга ("долг 10000")
  "new_days": number | null,    // Заполни, если пользователь указал кол-во дней ("на 12 дней", "осталось 5 дней")
  "message": string             // Комментарий, подтверждение действий или ответ на вопрос пользователя
}

Категории для expense_items:
- "food": еда, кафе, ресторан, доставка, продукты, обед, перекус
- "credit_debt": оплата/погашение долга или кредитки
- "transport": такси, метро, бензин, проезд
- "entertainment": кино, игры, подписки, отдых
- "general": прочее`;

    const requestBody = {
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput }
      ],
      temperature: 0.2
    };

    if (!model.includes('claude') && !model.includes('gemini-1.0')) {
      try {
        requestBody.response_format = { type: 'json_object' };
      } catch (_) {}
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };

    if (endpoint.includes('openrouter.ai')) {
      headers['HTTP-Referer'] = window.location.origin || 'https://telegram.org';
      headers['X-Title'] = 'Smart Budget Mini App';
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      let errDetail = response.statusText;
      try {
        const errJson = await response.json();
        if (errJson.error && (errJson.error.message || errJson.error.code)) {
          errDetail = errJson.error.message || errJson.error.code;
        } else if (errJson.message) {
          errDetail = errJson.message;
        }
      } catch (_) {}
      throw new Error(`Ошибка API (${response.status}): ${errDetail}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Пустой ответ от ИИ модели');
    }

    // Extract JSON
    let cleanedContent = content.trim();
    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedContent = jsonMatch[0];
    }

    return JSON.parse(cleanedContent);
  }

  // =========================================================================
  // 7. Expense & Chat Form Handling
  // =========================================================================
  async function handleExpenseSubmit() {
    const text = elements.naturalInput.value.trim();
    if (!text) return;

    setLoading(true);

    try {
      const result = await processWithAI(text);

      let changesApplied = 0;
      const appliedNotes = [];

      // 1. Direct balance override if specified
      if (typeof result.new_balance === 'number' && !isNaN(result.new_balance)) {
        appState.currentBalance = Math.max(0, result.new_balance);
        changesApplied++;
        appliedNotes.push(`Баланс установлен: ${formatMoney(appState.currentBalance)} ₽`);
      }

      // 2. Income items
      if (result.income_items && Array.isArray(result.income_items)) {
        result.income_items.forEach((inc) => {
          const amt = Number(inc.amount);
          if (!isNaN(amt) && amt > 0) {
            appState.currentBalance = (Number(appState.currentBalance) || 0) + amt;
            appState.transactions.push({
              id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
              amount: amt,
              category: 'income',
              description: inc.description || 'Пополнение',
              date: new Date().toISOString()
            });
            changesApplied++;
            appliedNotes.push(`+${formatMoney(amt)} ₽ (${inc.description || 'Доход'})`);
          }
        });
      }

      // 3. Expense items (including legacy .items fallback)
      const expenses = result.expense_items || (result.action === 'add_expense' || result.action === 'expense_and_answer' ? result.items : null);
      if (expenses && Array.isArray(expenses)) {
        expenses.forEach((item) => {
          const amount = Number(item.amount);
          if (!isNaN(amount) && amount > 0) {
            // Deduct from balance
            appState.currentBalance = Math.max(0, (Number(appState.currentBalance) || 0) - amount);

            // If debt repayment, also reduce creditDebt
            if (item.category === 'credit_debt') {
              appState.creditDebt = Math.max(0, (Number(appState.creditDebt) || 0) - amount);
            }

            appState.transactions.push({
              id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
              amount: amount,
              category: item.category || 'general',
              description: item.description || 'Расход',
              date: new Date().toISOString()
            });
            changesApplied++;
            appliedNotes.push(`-${formatMoney(amount)} ₽ (${item.description || 'Расход'})`);
          }
        });
      }

      // 4. Update Debt
      if (typeof result.new_debt === 'number' && !isNaN(result.new_debt)) {
        appState.creditDebt = Math.max(0, result.new_debt);
        changesApplied++;
        appliedNotes.push(`Долг установлен: ${formatMoney(appState.creditDebt)} ₽`);
      }

      // 5. Update Days
      if (typeof result.new_days === 'number' && !isNaN(result.new_days)) {
        appState.daysSalary = Math.max(1, Math.round(result.new_days));
        changesApplied++;
        appliedNotes.push(`Дней до ЗП: ${appState.daysSalary}`);
      }

      // Save & Update Dashboard
      if (changesApplied > 0) {
        saveData();
        renderDashboard();
        triggerHaptic('success');
        showToast(appliedNotes.slice(0, 2).join(' | '), 'success');
      }

      // Handle message / QA response from AI
      if (result.message && result.message.trim() !== '') {
        displayAiResponse(result.message);
        triggerHaptic('light');
      } else if (changesApplied === 0) {
        displayAiResponse('Понял ваш запрос, но не нашел финансовых параметров (суммы, дней или вопросов). Попробуйте уточнить.');
      }

      elements.naturalInput.value = '';
    } catch (err) {
      console.error(err);
      triggerHaptic('error');
      showToast(err.message || 'Ошибка обработки запроса', 'error');
    } finally {
      setLoading(false);
    }
  }

  function displayAiResponse(text) {
    if (!elements.aiResponseBox || !elements.aiResponseText) return;
    elements.aiResponseText.textContent = text;
    elements.aiResponseBox.classList.remove('hidden');
    // Smooth scroll to response
    elements.aiResponseBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideAiResponse() {
    if (elements.aiResponseBox) {
      elements.aiResponseBox.classList.add('hidden');
    }
  }

  function setLoading(isLoading) {
    elements.sendBtn.disabled = isLoading;
    if (isLoading) {
      elements.sendIcon.classList.add('hidden');
      elements.loadingSpinner.classList.remove('hidden');
    } else {
      elements.sendIcon.classList.remove('hidden');
      elements.loadingSpinner.classList.add('hidden');
    }
  }

  // =========================================================================
  // 8. Settings Modal Logic (Only AI Configuration)
  // =========================================================================
  function openSettings() {
    elements.apiKeyInput.value = appState.apiKey || '';
    elements.apiPresetSelect.value = appState.apiPreset || 'deepseek';
    elements.apiEndpointInput.value = appState.apiEndpoint || 'https://api.deepseek.com/chat/completions';
    elements.apiModelInput.value = appState.apiModel || 'deepseek-chat';

    elements.settingsModal.classList.remove('hidden');
    triggerHaptic('light');
  }

  function closeSettings() {
    elements.settingsModal.classList.add('hidden');
  }

  function handlePresetChange() {
    const preset = elements.apiPresetSelect.value;
    if (PRESETS[preset]) {
      elements.apiEndpointInput.value = PRESETS[preset].endpoint;
      elements.apiModelInput.value = PRESETS[preset].model;
    }
  }

  function saveSettings(e) {
    e.preventDefault();

    appState.apiKey = elements.apiKeyInput.value.trim();
    appState.apiPreset = elements.apiPresetSelect.value;
    appState.apiEndpoint = elements.apiEndpointInput.value.trim() || 'https://api.deepseek.com/chat/completions';
    appState.apiModel = elements.apiModelInput.value.trim() || 'deepseek-chat';

    saveData();
    renderDashboard();
    closeSettings();

    triggerHaptic('success');
    showToast('Настройки ИИ успешно сохранены!', 'success');
  }

  // =========================================================================
  // 9. Event Listeners Setup
  // =========================================================================
  function setupEventListeners() {
    // Settings openers & closers
    elements.openSettingsBtn.addEventListener('click', openSettings);
    elements.bannerSettingsBtn.addEventListener('click', openSettings);
    elements.closeSettingsBtn.addEventListener('click', closeSettings);
    elements.cancelSettingsBtn.addEventListener('click', closeSettings);
    elements.settingsForm.addEventListener('submit', saveSettings);
    elements.apiPresetSelect.addEventListener('change', handlePresetChange);

    // Close modal on background click
    elements.settingsModal.addEventListener('click', (e) => {
      if (e.target === elements.settingsModal) {
        closeSettings();
      }
    });

    // Toggle API Key visibility
    elements.toggleApiKeyVisibility.addEventListener('click', () => {
      const type = elements.apiKeyInput.getAttribute('type') === 'password' ? 'text' : 'password';
      elements.apiKeyInput.setAttribute('type', type);
      elements.toggleApiKeyVisibility.textContent = type === 'password' ? '👁️' : '🔒';
    });

    // Expense form submit
    elements.expenseForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleExpenseSubmit();
    });

    // Close AI response box
    if (elements.closeAiResponseBtn) {
      elements.closeAiResponseBtn.addEventListener('click', hideAiResponse);
    }

    // Quick Hint Tags
    document.querySelectorAll('.hint-tag').forEach((btn) => {
      btn.addEventListener('click', () => {
        elements.naturalInput.value = btn.getAttribute('data-text');
        elements.naturalInput.focus();
        triggerHaptic('light');
      });
    });

    // Clear history
    elements.clearHistoryBtn.addEventListener('click', () => {
      if (confirm('Вы уверены, что хотите очистить всю историю операций?')) {
        appState.transactions = [];
        saveData();
        renderDashboard();
        triggerHaptic('medium');
        showToast('История операций очищена', 'info');
      }
    });
  }

  // Set Telegram User Details
  function initTelegramUser() {
    if (tg?.initDataUnsafe?.user) {
      const user = tg.initDataUnsafe.user;
      const name = user.first_name || user.username || 'Друг';
      elements.userName.textContent = `Привет, ${name}!`;
      if (user.photo_url) {
        elements.userAvatar.innerHTML = `<img src="${user.photo_url}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
      }
    }
  }

  // =========================================================================
  // 10. Bootstrap App
  // =========================================================================
  async function init() {
    initTelegramUser();
    setupEventListeners();
    await loadData();
    renderDashboard();
  }

  // Run on DOM loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
