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
  const STORAGE_KEY = 'smart_budget_data_v2'; // Updated version for new architecture

  const defaultState = {
    // AI Settings
    apiKey: '',
    apiPreset: 'deepseek',
    apiEndpoint: 'https://api.deepseek.com/chat/completions',
    apiModel: 'deepseek-chat',
    
    // Financial Core
    currentBalance: 0, // Начальный баланс 0 ₽
    dailyLimit: 0, // Calculated dynamically
    daysSalary: 14,
    
    // Dynamic Financial Cells (Agentic Architecture)
    cells: [
      // Example structure:
      // {
      //   id: 'cell_xxxxx',
      //   type: 'DEBT' | 'SAVINGS' | 'GOAL' | 'SUBSCRIPTION',
      //   title: 'Кредитная карта Сбер',
      //   amount: 15000,
      //   target: 0, // For GOAL type
      //   rate: 0, // For SAVINGS type (%)
      //   dayOfMonth: 0, // For SUBSCRIPTION type
      //   autoDeduct: 0.3, // For DEBT: % from income to auto-allocate
      //   createdAt: '2026-09-09T10:00:00.000Z'
      // }
    ],
    
    // Transaction History
    transactions: [],
    
    // Scheduled Reminders (for Telegram Bot integration)
    reminders: []
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
      // Try loading v2 first
      let local = localStorage.getItem(STORAGE_KEY);
      
      // If v2 doesn't exist, try migrating from v1
      if (!local) {
        const oldKey = 'smart_budget_data_v1';
        const oldData = localStorage.getItem(oldKey);
        
        if (oldData) {
          console.log('Migrating from v1 to v2...');
          const oldParsed = JSON.parse(oldData);
          
          // Migrate old creditDebt to a DEBT cell
          const migratedState = { ...defaultState, ...oldParsed };
          
          if (oldParsed.creditDebt && oldParsed.creditDebt > 0) {
            migratedState.cells = [{
              id: 'cell_migrated_debt_' + Date.now(),
              type: 'DEBT',
              title: 'Кредит (мигрировано)',
              amount: oldParsed.creditDebt,
              target: 0,
              rate: 0,
              dayOfMonth: 0,
              autoDeduct: 0.3,
              createdAt: new Date().toISOString()
            }];
          }
          
          delete migratedState.creditDebt; // Remove old field
          appState = migratedState;
          
          // Save migrated data
          saveData();
          
          // Clean up old storage
          localStorage.removeItem(oldKey);
          console.log('Migration complete!');
          return;
        }
      }
      
      if (local) {
        const parsed = JSON.parse(local);
        appState = { ...defaultState, ...parsed };
        
        // Ensure cells array exists
        if (!appState.cells) {
          appState.cells = [];
        }
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
    // Note: currentBalance, remainingDebt, remainingFood, daysToSalary moved to dynamic cells
    // currentBalance: document.getElementById('currentBalance'),
    // remainingDebt: document.getElementById('remainingDebt'),
    // remainingFood: document.getElementById('remainingFood'),
    // daysToSalary: document.getElementById('daysToSalary'),

    // Analytics elements
    periodSpentLabel: document.getElementById('periodSpentLabel'),
    periodSpentValue: document.getElementById('periodSpentValue'),
    periodIncomeLabel: document.getElementById('periodIncomeLabel'),
    periodIncomeValue: document.getElementById('periodIncomeValue'),
    debtRecommendText: document.getElementById('debtRecommendText'),
    periodToggle: document.getElementById('periodToggle'),

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
    toastContainer: document.getElementById('toastContainer'),
    
    // Dynamic Cells Container
    cellsContainer: document.getElementById('cellsContainer'),
    
    // Cell Action Modal
    cellActionModal: document.getElementById('cellActionModal'),
    cellActionTitle: document.getElementById('cellActionTitle'),
    cellActionInfo: document.getElementById('cellActionInfo'),
    cellActionAmountInput: document.getElementById('cellActionAmountInput'),
    closeCellActionBtn: document.getElementById('closeCellActionBtn'),
    cancelCellActionBtn: document.getElementById('cancelCellActionBtn'),
    confirmCellActionBtn: document.getElementById('confirmCellActionBtn')
  };

  // Modal state for cell actions
  let cellActionModalState = {
    cellId: null,
    action: null, // 'add' or 'withdraw'
    cell: null
  };

  // =========================================================================
  // 4. Dynamic Cells Manager (Agentic Architecture)
  // =========================================================================
  const CellsManager = {
    // Cell type metadata
    CELL_TYPES: {
      DEBT: {
        icon: '💳',
        name: 'Долг / Кредит',
        color: '#ef4444',
        defaultAutoDeduct: 0  // Убрали дефолт 0.3, AI сам решает
      },
      SAVINGS: {
        icon: '💰',
        name: 'Вклад / Накопления',
        color: '#10b981'
      },
      GOAL: {
        icon: '🎯',
        name: 'Копилка на цель',
        color: '#8b5cf6'
      },
      SUBSCRIPTION: {
        icon: '📅',
        name: 'Подписка / Регулярный платёж',
        color: '#f59e0b'
      }
    },

    createCell(type, data) {
      const cell = {
        id: 'cell_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        type: type,
        title: data.title || this.CELL_TYPES[type].name,
        amount: Number(data.amount) || 0,
        target: Number(data.target) || 0,
        rate: Number(data.rate) || 0,
        dayOfMonth: Number(data.dayOfMonth) || 0,
        autoDeduct: data.autoDeduct !== undefined ? Number(data.autoDeduct) : 0,  // Без дефолта
        createdAt: new Date().toISOString(),
        ...data
      };
      
      appState.cells.push(cell);
      saveData();
      return cell;
    },

    updateCell(cellId, updates) {
      const cell = appState.cells.find(c => c.id === cellId);
      if (!cell) return null;
      
      Object.assign(cell, updates);
      saveData();
      return cell;
    },

    deleteCell(cellId) {
      appState.cells = appState.cells.filter(c => c.id !== cellId);
      saveData();
    },

    getCellById(cellId) {
      return appState.cells.find(c => c.id === cellId);
    },

    // Calculate total allocated funds in all cells
    getTotalAllocated() {
      return appState.cells.reduce((sum, cell) => {
        if (cell.type === 'DEBT' || cell.type === 'GOAL' || cell.type === 'SAVINGS') {
          return sum + (Number(cell.amount) || 0);
        }
        return sum;
      }, 0);
    },

    // Calculate monthly income from savings
    getMonthlyIncome() {
      return appState.cells
        .filter(c => c.type === 'SAVINGS')
        .reduce((sum, cell) => {
          const rate = Number(cell.rate) || 0;
          const amount = Number(cell.amount) || 0;
          return sum + (amount * rate / 100 / 12);
        }, 0);
    },

    renderCell(cell) {
      const meta = this.CELL_TYPES[cell.type];
      let progressHTML = '';
      let detailsHTML = '';

      // Type-specific rendering
      if (cell.type === 'GOAL' && cell.target > 0) {
        const progress = Math.min(100, (cell.amount / cell.target) * 100);
        progressHTML = `
          <div class="cell-progress-bar">
            <div class="cell-progress-fill" style="width: ${progress}%; background: ${meta.color};"></div>
          </div>
          <div class="cell-progress-text">${formatMoney(cell.amount)} / ${formatMoney(cell.target)} ₽ (${Math.round(progress)}%)</div>
        `;
      } else if (cell.type === 'SAVINGS' && cell.rate > 0) {
        const monthlyIncome = (cell.amount * cell.rate / 100 / 12);
        detailsHTML = `<div class="cell-detail">📈 ${cell.rate}% годовых • +${formatMoney(monthlyIncome)} ₽/мес</div>`;
      } else if (cell.type === 'SUBSCRIPTION' && cell.dayOfMonth > 0) {
        detailsHTML = `<div class="cell-detail">📅 Списание ${cell.dayOfMonth} числа каждого месяца</div>`;
      }

      // Кнопки в зависимости от типа ячейки
      let actionsHTML = '';
      if (cell.type === 'DEBT') {
        // Для долгов: только "Погасить" и "Удалить"
        actionsHTML = `
          <div class="cell-actions">
            <button class="cell-action-btn" data-action="add" data-cell-id="${cell.id}" title="Погасить долг">💳 Погасить</button>
            <button class="cell-action-btn danger" data-action="delete" data-cell-id="${cell.id}" title="Удалить">🗑️</button>
          </div>
        `;
      } else {
        // Для остальных: "Пополнить", "Снять", "Удалить"
        actionsHTML = `
          <div class="cell-actions">
            <button class="cell-action-btn" data-action="add" data-cell-id="${cell.id}" title="Пополнить">➕ Пополнить</button>
            <button class="cell-action-btn" data-action="withdraw" data-cell-id="${cell.id}" title="Снять">➖ Снять</button>
            <button class="cell-action-btn danger" data-action="delete" data-cell-id="${cell.id}" title="Удалить">🗑️</button>
          </div>
        `;
      }

      return `
        <div class="financial-cell" data-id="${cell.id}" data-type="${cell.type}" style="border-left: 4px solid ${meta.color};">
          <div class="cell-header">
            <div class="cell-icon">${meta.icon}</div>
            <div class="cell-info">
              <div class="cell-title">${escapeHtml(cell.title)}</div>
              <div class="cell-type-badge" style="background: ${meta.color}20; color: ${meta.color};">${meta.name}</div>
            </div>
            <div class="cell-amount" style="color: ${meta.color};">${formatMoney(cell.amount)} ₽</div>
          </div>
          ${progressHTML}
          ${detailsHTML}
          ${actionsHTML}
        </div>
      `;
    }
  };

  // Cell action handlers (no longer on window)
  function addToCellPrompt(cellId) {
    const cell = CellsManager.getCellById(cellId);
    if (!cell) return;
    
    const availableBalance = appState.currentBalance;
    
    // Show modal immediately with loading state
    cellActionModalState = { cellId, action: 'add', cell };
    
    if (cell.type === 'DEBT') {
      elements.cellActionTitle.textContent = '💳 Погасить долг';
    } else {
      elements.cellActionTitle.textContent = '➕ Пополнить ячейку';
    }
    
    elements.cellActionInfo.innerHTML = `
      <strong>${CellsManager.CELL_TYPES[cell.type]?.icon || '💰'} ${escapeHtml(cell.title)}</strong><br>
      <span style="color: #666;">🤖 Анализирую ситуацию...</span>
    `;
    elements.cellActionAmountInput.value = '';
    elements.cellActionAmountInput.max = availableBalance;
    elements.cellActionAmountInput.placeholder = `Максимум: ${formatMoney(availableBalance)} ₽`;
    
    elements.cellActionModal.classList.remove('hidden');
    triggerHaptic('light');
    
    // Get AI recommendation
    getAiRecommendationForCell(cell, availableBalance);
  }

  async function getAiRecommendationForCell(cell, availableBalance) {
    try {
      if (cell.type === 'DEBT' && aiAnalysisCache.debtRecommendation) {
        updateModalWithRecommendation(cell, availableBalance, aiAnalysisCache.debtRecommendation);
        return;
      }
      const allCells = appState.cells || [];
      const totalDebt = allCells.filter(c => c.type === 'DEBT').reduce((sum, c) => sum + c.amount, 0);
      const totalGoals = allCells.filter(c => c.type === 'GOAL').reduce((sum, c) => sum + (c.target - c.amount), 0);
      
      const prompt = `Ты тот же финансовый советник, который формирует рекомендации на главном экране. Пользователь хочет ${cell.type === 'DEBT' ? 'погасить долг' : 'пополнить ячейку'} "${cell.title}". Используй ровно те же правила расчёта, не применяй шаблонные 30%, 50% или 60%.

📊 ТЕКУЩАЯ СИТУАЦИЯ:
• Доступно на балансе: ${formatMoney(availableBalance)} ₽
• Дней до зарплаты: ${appState.daysSalary} дн.
• Тип ячейки: ${cell.type}
${cell.type === 'DEBT' ? `• Текущий долг: ${formatMoney(cell.amount)} ₽` : ''}
${cell.type === 'SAVINGS' ? `• Текущий вклад: ${formatMoney(cell.amount)} ₽` : ''}
${cell.type === 'GOAL' ? `• Накоплено: ${formatMoney(cell.amount)} из ${formatMoney(cell.target)} ₽` : ''}
${cell.type === 'SUBSCRIPTION' ? `• Сумма подписки: ${formatMoney(cell.amount)} ₽` : ''}

📈 ОБЩАЯ КАРТИНА:
• Всего долгов: ${formatMoney(totalDebt)} ₽
• До целей осталось: ${formatMoney(totalGoals)} ₽
• Всего ячеек: ${allCells.length}

💡 ЗАДАЧА: Рассчитай посильную сумму для действия с учётом ${appState.daysSalary} дней до следующей зарплаты, дневного бюджета на еду, всех долгов, обязательных платежей и резерва. Сначала рассчитай резерв на весь период, затем сумму платежа как остаток после резерва. Если баланс больше нуля и это долг, не рекомендуй 0 ₽ — выбери положительную сумму после сохранения резерва. Для вклада сначала учти долги и обязательные платежи. Не используй другую формулу, если уже есть рекомендация главного экрана.

Формат ответа (только текст, БЕЗ JSON):
💡 Рекомендую ${cell.type === 'DEBT' ? 'погасить' : 'отложить'}: [сумма] ₽ ([процент]% доступного баланса)
📅 До зарплаты: ${appState.daysSalary} дн. — [краткое обоснование]`;

      const response = await fetch(appState.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${appState.apiKey}`
        },
        body: JSON.stringify({
          model: appState.apiModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 150
        })
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const recommendation = data.choices?.[0]?.message?.content?.trim() || 'Рекомендацию не удалось получить';
      
      // Update modal with AI recommendation
      updateModalWithRecommendation(cell, availableBalance, recommendation);
      
    } catch (error) {
      console.error('AI recommendation error:', error);
      // Fallback to simple info
      updateModalWithRecommendation(cell, availableBalance, null);
    }
  }

  function updateModalWithRecommendation(cell, availableBalance, aiRecommendation) {
    let infoHTML = '';
    
    if (cell.type === 'DEBT') {
      infoHTML = `
        <strong>💳 ${escapeHtml(cell.title)}</strong><br>
        <span class="warning">Текущий долг: ${formatMoney(cell.amount)} ₽</span><br><br>
        ${aiRecommendation ? `<div style="background: #eff6ff; padding: 8px; border-radius: 6px; font-size: 13px; line-height: 1.5;">${aiRecommendation}</div><br>` : ''}
        📊 Доступно на балансе: <span class="highlight">${formatMoney(availableBalance)} ₽</span>
      `;
    } else if (cell.type === 'SAVINGS') {
      infoHTML = `
        <strong>💰 ${escapeHtml(cell.title)}</strong><br>
        <span class="highlight">Текущий вклад: ${formatMoney(cell.amount)} ₽</span><br><br>
        ${aiRecommendation ? `<div style="background: #eff6ff; padding: 8px; border-radius: 6px; font-size: 13px; line-height: 1.5;">${aiRecommendation}</div><br>` : ''}
        📊 Доступно на балансе: <span class="highlight">${formatMoney(availableBalance)} ₽</span>
      `;
    } else if (cell.type === 'GOAL') {
      const remaining = Math.max(0, cell.target - cell.amount);
      infoHTML = `
        <strong>🎯 ${escapeHtml(cell.title)}</strong><br>
        <span class="highlight">Накоплено: ${formatMoney(cell.amount)} ₽ из ${formatMoney(cell.target)} ₽</span><br><br>
        ${aiRecommendation ? `<div style="background: #eff6ff; padding: 8px; border-radius: 6px; font-size: 13px; line-height: 1.5;">${aiRecommendation}</div><br>` : ''}
        🎯 <strong>До цели осталось:</strong> <span class="warning">${formatMoney(remaining)} ₽</span><br>
        📊 Доступно на балансе: <span class="highlight">${formatMoney(availableBalance)} ₽</span>
      `;
    } else {
      infoHTML = `
        <strong>${CellsManager.CELL_TYPES[cell.type]?.icon || '💰'} ${escapeHtml(cell.title)}</strong><br>
        <span class="highlight">Текущая сумма: ${formatMoney(cell.amount)} ₽</span><br><br>
        ${aiRecommendation ? `<div style="background: #eff6ff; padding: 8px; border-radius: 6px; font-size: 13px; line-height: 1.5;">${aiRecommendation}</div><br>` : ''}
        📊 Доступно на балансе: <span class="highlight">${formatMoney(availableBalance)} ₽</span>
      `;
    }
    
    elements.cellActionInfo.innerHTML = infoHTML;
    setTimeout(() => elements.cellActionAmountInput.focus(), 100);
  }

  function withdrawFromCellPrompt(cellId) {
    const cell = CellsManager.getCellById(cellId);
    if (!cell) return;
    
    const infoHTML = `
      <strong>${CellsManager.CELL_TYPES[cell.type]?.icon || '💰'} ${escapeHtml(cell.title)}</strong><br>
      <span class="highlight">Доступно для снятия: ${formatMoney(cell.amount)} ₽</span><br><br>
      ℹ️ Средства вернутся на общий баланс
    `;
    
    // Set modal state
    cellActionModalState = { cellId, action: 'withdraw', cell };
    
    // Update modal UI
    elements.cellActionTitle.textContent = '➖ Снять средства';
    elements.cellActionInfo.innerHTML = infoHTML;
    elements.cellActionAmountInput.value = '';
    elements.cellActionAmountInput.max = cell.amount;
    elements.cellActionAmountInput.placeholder = `Максимум: ${formatMoney(cell.amount)} ₽`;
    
    // Show modal
    elements.cellActionModal.classList.remove('hidden');
    setTimeout(() => elements.cellActionAmountInput.focus(), 100);
    triggerHaptic('light');
  }

  function closeCellActionModal() {
    elements.cellActionModal.classList.add('hidden');
    cellActionModalState = { cellId: null, action: null, cell: null };
  }

  function confirmCellAction() {
    const { cellId, action, cell } = cellActionModalState;
    if (!cellId || !action || !cell) return;
    
    const amount = Number(elements.cellActionAmountInput.value);
    
    if (!amount || isNaN(amount) || amount <= 0) {
      showToast('Введите корректную сумму', 'error');
      return;
    }
    
    if (action === 'add') {
      if (amount > appState.currentBalance) {
        showToast('Недостаточно средств на балансе', 'error');
        return;
      }
      
      const updatedAmount = cell.type === 'DEBT' ? Math.max(0, cell.amount - amount) : cell.amount + amount;
      CellsManager.updateCell(cellId, { amount: updatedAmount });
      appState.currentBalance -= amount;
      
      appState.transactions.push({
        id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        amount: amount,
        category: cell.type === 'DEBT' ? 'credit_debt' : 'cell_deposit',
        description: cell.type === 'DEBT' ? `Погашение: ${cell.title}` : `Пополнение: ${cell.title}`,
        cellId: cellId,
        date: new Date().toISOString()
      });
      
      // Invalidate AI cache and refresh
      aiAnalysisCache.lastUpdate = null;
      saveData();
      getProactiveAiAnalysis().then(() => renderDashboard());
      showToast(cell.type === 'DEBT' ? `Погашено ${formatMoney(amount)} ₽ → ${cell.title}` : `Пополнено ${formatMoney(amount)} ₽ → ${cell.title}`, 'success');
      triggerHaptic('success');
      
    } else if (action === 'withdraw') {
      if (amount > cell.amount) {
        showToast('Недостаточно средств в ячейке', 'error');
        return;
      }
      
      CellsManager.updateCell(cellId, { amount: cell.amount - amount });
      appState.currentBalance += amount;
      
      appState.transactions.push({
        id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        amount: amount,
        category: 'cell_withdrawal',
        description: `Снятие из: ${cell.title}`,
        cellId: cellId,
        date: new Date().toISOString()
      });
      
      // Invalidate AI cache and refresh
      aiAnalysisCache.lastUpdate = null;
      saveData();
      getProactiveAiAnalysis().then(() => renderDashboard());
      showToast(`Снято ${formatMoney(amount)} ₽ ← ${cell.title}`, 'success');
      triggerHaptic('success');
    }
    
    closeCellActionModal();
  }

  function deleteCellConfirm(cellId) {
    const cell = CellsManager.getCellById(cellId);
    if (!cell) return;
    
    const hasBalance = cell.amount > 0;
    const confirmText = hasBalance 
      ? `Удалить ячейку "${cell.title}"?\n\n⚠️ Внимание: Средства (${formatMoney(cell.amount)} ₽) будут списаны и НЕ вернутся на баланс.\n\nСначала снимите деньги кнопкой "Снять", если хотите их сохранить.`
      : `Удалить ячейку "${cell.title}"?`;
    
    if (!confirm(confirmText)) return;
    
    // НЕ возвращаем баланс при удалении
    CellsManager.deleteCell(cellId);
    
    saveData();
    renderDashboard();
    showToast(`Ячейка "${cell.title}" удалена`, 'info');
    triggerHaptic('medium');
  }

  // =========================================================================
  // 5. Toast Notifications
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
  // 5. Budget Computation & Render Logic (Analytics Period)
  // =========================================================================
  let selectedAnalyticsPeriod = 'month';

  // AI conversation history (last 10 messages for context)
  let conversationHistory = [];
  const MAX_HISTORY_LENGTH = 10;

  function filterTransactionsByPeriod(period) {
    const now = new Date();
    return appState.transactions.filter((tx) => {
      const txDate = new Date(tx.date);
      if (isNaN(txDate.getTime())) return true;

      if (period === 'today') {
        return txDate.toDateString() === now.toDateString();
      } else if (period === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return txDate >= weekAgo;
      } else if (period === 'month') {
        const monthAgo = new Date(now);
        monthAgo.setDate(now.getDate() - 30);
        return txDate >= monthAgo;
      }
      return true; // 'all'
    });
  }

  function renderAnalytics() {
    if (!elements.periodSpentValue || !elements.debtRecommendText) return;

    const filtered = filterTransactionsByPeriod(selectedAnalyticsPeriod);

    let periodExpenses = 0;
    let periodIncomes = 0;

    filtered.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.category === 'income') {
        periodIncomes += amt;
      } else {
        periodExpenses += amt;
      }
    });

    const periodLabels = {
      today: 'Потрачено за сегодня',
      week: 'Потрачено за 7 дней',
      month: 'Потрачено за 30 дней',
      all: 'Потрачено за всё время'
    };

    elements.periodSpentLabel.textContent = periodLabels[selectedAnalyticsPeriod] || 'Потрачено';
    elements.periodSpentValue.textContent = `${formatMoney(periodExpenses)} ₽`;
    elements.periodIncomeValue.textContent = `+${formatMoney(periodIncomes)} ₽`;

    // Smart recommendations based on cells
    const financials = calculateFinancials();
    const debtCells = appState.cells.filter(c => c.type === 'DEBT');
    const totalDebt = debtCells.reduce((sum, c) => sum + c.amount, 0);

    if (proactiveAnalysisLoading) {
      elements.debtRecommendText.innerHTML = 'ИИ анализирует долги, резерв и доступную сумму…';
    } else if (totalDebt <= 0 && debtCells.length === 0) {
      elements.debtRecommendText.innerHTML = `🎉 У вас <b>нет активных долгов</b>. Все средства свободны для накоплений и текущих трат!`;
    } else if (debtCells.length > 0) {
      const debtInfo = debtCells.map(c => `<b>${escapeHtml(c.title)}</b>: ${formatMoney(c.amount)} ₽`).join(', ');
      elements.debtRecommendText.innerHTML = `💳 Активные долги: ${debtInfo}.<br>📅 До зарплаты: <b>${financials.days} дн.</b><br>💡 ${aiAnalysisCache.debtRecommendation || 'ИИ анализирует баланс, срок до зарплаты и приоритет долга.'}`;
    } else {
      elements.debtRecommendText.innerHTML = `💡 Рекомендуем создать ячейки для управления долгами через ИИ-помощника.`;
    }
  }

  // =========================================================================
  // 6. Financial Calculations & Rendering (New Agentic Logic)
  // =========================================================================
  function formatMoney(amount) {
    return Math.round(amount).toLocaleString('ru-RU');
  }

  function calculateFinancials() {
    // Total allocated in cells (frozen funds)
    const totalAllocated = CellsManager.getTotalAllocated();
    
    // Free balance = current balance (all liquid funds not in cells)
    const freeBalance = Math.max(0, Number(appState.currentBalance) || 0);
    
    // Calculate daily limit from free balance only
    const days = Math.max(1, Number(appState.daysSalary) || 1);
    const dailyLimit = Math.round(freeBalance / days);
    
    // Update state
    appState.dailyLimit = dailyLimit;
    
    return {
      freeBalance,
      totalAllocated,
      dailyLimit,
      days,
      totalBalance: freeBalance + totalAllocated
    };
  }

  function renderCells() {
    if (!elements.cellsContainer) return;
    
    const financials = calculateFinancials();
    
    // BASE CELLS (always visible)
    const baseCells = [
      {
        id: '__base_balance',
        type: 'BASE_BALANCE',
        icon: '💰',
        title: 'Свободный баланс',
        amount: financials.freeBalance,
        color: '#10b981',
        description: 'Доступные средства'
      },
      {
        id: '__base_days',
        type: 'BASE_DAYS',
        icon: '🗓️',
        title: 'До зарплаты',
        amount: financials.days,
        suffix: 'дн.',
        color: '#3b82f6',
        description: 'Осталось дней'
      },
      {
        id: '__base_food',
        type: 'BASE_FOOD',
        icon: '🍔',
        title: 'Бюджет на питание',
        amount: aiAnalysisCache.foodBudgetAmount ?? financials.freeBalance,
        color: '#f59e0b',
        description: proactiveAnalysisLoading ? 'ИИ рассчитывает бюджет…' : (aiAnalysisCache.foodBudgetAdvice || `ИИ рассчитывает на ${financials.days} дн.`),
        loading: proactiveAnalysisLoading
      }
    ];
    
    // Render base cells
    let html = baseCells.map(cell => {
      return `
        <div class="financial-cell base-cell" data-id="${cell.id}" style="border-left: 4px solid ${cell.color};">
          <div class="cell-header">
            <div class="cell-icon">${cell.icon}</div>
            <div class="cell-info">
              <div class="cell-title">${cell.title}</div>
              <div class="cell-type-badge" style="background: ${cell.color}20; color: ${cell.color};">${cell.description}</div>
            </div>
            <div class="cell-amount${cell.loading ? ' value-loading' : ''}" style="color: ${cell.color};">${cell.loading ? '•••' : `${formatMoney(cell.amount)} ${cell.suffix || '₽'}`}</div>
          </div>
        </div>
      `;
    }).join('');
    
    // Add user cells if any
    if (appState.cells && appState.cells.length > 0) {
      html += '<div class="cells-divider"><span>Дополнительные ячейки</span></div>';
      html += appState.cells.map(cell => CellsManager.renderCell(cell)).join('');
    }
    
    elements.cellsContainer.innerHTML = html;
  }

  function renderDashboard() {
    const financials = calculateFinancials();
    
    // Показываем дневной лимит, рассчитанный AI, если он уже получен.
    const aiFoodTotal = Number(aiAnalysisCache.foodBudgetAmount);
    const dailyFoodLimit = aiFoodTotal > 0 && financials.days > 0
      ? aiFoodTotal / financials.days
      : financials.dailyLimit;
    elements.dailyFoodAmount.textContent = proactiveAnalysisLoading ? '…' : formatMoney(dailyFoodLimit);
    elements.daysCountBadge.textContent = financials.days;
    if (elements.heroSubtext) {
      elements.heroSubtext.textContent = proactiveAnalysisLoading
        ? 'ИИ рассчитывает бюджет, долги и резерв…'
        : (aiAnalysisCache.foodBudgetAdvice || `Безопасный лимит на ${financials.days} дн. до зарплаты`);
    }
    
    // Progress bar (visual indicator)
    const foodPercent = financials.freeBalance > 0
      ? Math.min(100, Math.max(0, (dailyFoodLimit / Math.max(financials.dailyLimit, 1)) * 100))
      : 0;
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

    renderCells();
    renderAnalytics();
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
      case 'cell_deposit':
        return { icon: '📥', name: 'Пополнение ячейки', class: 'cell-transfer', isIncome: false };
      case 'cell_withdrawal':
        return { icon: '📤', name: 'Снятие из ячейки', class: 'cell-transfer', isIncome: true };
      case 'entertainment':
        return { icon: '🎮', name: 'Развлечения', class: 'expense', isIncome: false };
      case 'health':
        return { icon: '💊', name: 'Здоровье', class: 'expense', isIncome: false };
      case 'shopping':
        return { icon: '🛍️', name: 'Покупки', class: 'expense', isIncome: false };
      case 'entertainment':
        return { icon: '🎉', name: 'Развлечения', class: 'expense', isIncome: false };
      case 'other':
      default:
        return { icon: '📝', name: 'Прочее', class: 'expense', isIncome: false };
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

        const sign = meta.isIncome ? '+' : '-';

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

    // Current financial state
    const financials = calculateFinancials();
    
    // Serialize cells for AI context
    const cellsContext = appState.cells.map(cell => {
      const meta = CellsManager.CELL_TYPES[cell.type];
      return `- ${meta.icon} "${cell.title}" (${meta.name}): ${formatMoney(cell.amount)} ₽${cell.target ? ` / Цель: ${formatMoney(cell.target)} ₽` : ''}`;
    }).join('\n') || 'Нет активных ячеек';

    const systemPrompt = `Ты — умный AI-ассистент для управления личными финансами в Telegram Mini App.

🔹 ТЕКУЩЕЕ ФИНАНСОВОЕ СОСТОЯНИЕ:
- Свободный баланс (liquid): ${formatMoney(financials.freeBalance)} ₽
- Средства в ячейках (frozen): ${formatMoney(financials.totalAllocated)} ₽
- Общий баланс: ${formatMoney(financials.totalBalance)} ₽
- Суточный лимит: ${formatMoney(financials.dailyLimit)} ₽
- Дней до зарплаты: ${financials.days} дн.

🏦 АКТИВНЫЕ ФИНАНСОВЫЕ ЯЧЕЙКИ:
${cellsContext}

📋 ТВОЯ ЗАДАЧА — AGENTIC UI:
Проанализируй команду пользователя на русском языке и верни структурированный JSON-ответ.

ВОЗМОЖНЫЕ ТИПЫ ДЕЙСТВИЙ:

1️⃣ ТРАНЗАКЦИИ (доход/расход):
   - "пришла зарплата 50000" → income
   - "купил продукты 1200" → expense
   - "еда 300 + такси 200" → multiple expenses

2️⃣ УПРАВЛЕНИЕ ЯЧЕЙКАМИ:
   - "создай вклад 100000 рублей под 18%" → CREATE_CELL (SAVINGS)
   - "копилка на iPhone 80000" → CREATE_CELL (GOAL)
   - "долг по кредитке 25000 с автовзносом 30%" → CREATE_CELL (DEBT)
   - "подписка Spotify 199р списывается 5 числа" → CREATE_CELL (SUBSCRIPTION)
   - "пополни копилку на 5000" → UPDATE_CELL
   - "удали ячейку вклад" → DELETE_CELL

3️⃣ ПАРАМЕТРЫ БЮДЖЕТА:
   - "до зарплаты 12 дней" → update daysSalary
   - "мне на 2 недели" → update daysSalary

4️⃣ ВОПРОСЫ И СОВЕТЫ:
   - "сколько могу тратить в день?"
   - "на сколько дней хватит?"
   - "дай совет по финансам"

🎯 ФОРМАТ ОТВЕТА (СТРОГО JSON):

{
  "ai_response": "Дружелюбный ответ пользователю с подтверждением действий",
  "daily_limit": number | null,  // Обновленный суточный лимит (если изменился)
  "actions": [
    {
      "type": "INCOME" | "EXPENSE" | "CREATE_CELL" | "UPDATE_CELL" | "DELETE_CELL" | "UPDATE_DAYS" | "SET_BALANCE",
      "data": {
        // Для INCOME/EXPENSE:
        "amount": number,
        "category": "food" | "transport" | "entertainment" | "shopping" | "health" | "other" | "income",
        "description": string,
        
        // Для CREATE_CELL:
        "cellType": "DEBT" | "SAVINGS" | "GOAL" | "SUBSCRIPTION",
        "title": string,
        "amount": number,
        "target": number,        // Для GOAL
        "rate": number,          // Для SAVINGS (%)
        "dayOfMonth": number,    // Для SUBSCRIPTION (1-31)
        "autoDeduct": number,    // Для DEBT (0.0-1.0, default 0.3)
        
        // Для UPDATE_CELL:
        "cellId": string | null,  // Если null, найти по title
        "title": string,          // Для поиска ячейки
        "amountChange": number,   // Положительное = пополнение, отрицательное = снятие
        
        // Для DELETE_CELL:
        "cellId": string | null,
        "title": string,
        
        // Для UPDATE_DAYS:
        "days": number,
        
        // Для SET_BALANCE (корректировка баланса):
        "balance": number,       // Новое значение баланса
        "description": string    // Причина изменения
      }
    }
  ]
}

⚠️ ВАЖНЫЕ ПРАВИЛА:
- autoDeduct БОЛЬШЕ НЕ ИСПОЛЬЗУЕТСЯ! Ты САМ распределяешь средства через UPDATE_CELL
- Для SAVINGS обязательно укажи rate (процентная ставка)
- Для GOAL обязательно укажи target (целевая сумма)
- Для SUBSCRIPTION укажи dayOfMonth (день месяца списания)
- При UPDATE_CELL используй amountChange (не переписывай amount целиком)
- Используй SET_BALANCE если пользователь говорит "у меня неправильный баланс", "поставь баланс X", "исправь баланс на Y"
- Все суммы в рублях, без копеек
- ai_response должен быть эмоциональным, с эмодзи, подтверждением действий

💡 УМНОЕ РАСПРЕДЕЛЕНИЕ СРЕДСТВ (ТЫ ПОЛНОСТЬЮ КОНТРОЛИРУЕШЬ ПРОЦЕСС):

🎯 **КРИТИЧЕСКИ ВАЖНО:** Когда пользователь получает доход (зарплата, премия), ты должен:
1. Проанализировать его финансовую ситуацию
2. Дать рекомендацию в текстовом виде (ai_response)
3. **НЕ ВЫПОЛНЯТЬ АВТОМАТИЧЕСКИ** - пользователь должен подтвердить!

**КАК ЭТО РАБОТАЕТ:**

Шаг 1: Получен доход
- Пользователь пишет: "Пришла зарплата 10000"
- Ты выполняешь ТОЛЬКО действие INCOME
- В ai_response даёшь рекомендацию по распределению
- Просишь подтверждения

Шаг 2: Пользователь подтверждает
- Пользователь пишет: "Принято" или "Давай" или "Ок"
- Ты выполняешь множественные UPDATE_CELL действия для распределения средств по ячейкам

**ПРИОРИТЕТЫ (в порядке важности):**

1. **КРИТИЧНЫЕ ДОЛГИ (высокий приоритет):**
   - Если есть DEBT ячейки с суммой > 20% от дохода → это критичный долг
   - Рекомендуй погасить МИНИМУМ 30% от текущего долга (не от дохода!)
   - Пример: долг 30000₽, доход 10000₽ → рекомендуй 9000₽ (30% от долга)
   - Если 30% от долга больше 50% дохода → рекомендуй 40-50% дохода
   
2. **ПОДПИСКИ И ОБЯЗАТЕЛЬНЫЕ ПЛАТЕЖИ:**
   - SUBSCRIPTION ячейки со сроком оплаты в ближайшие 7 дней → зарезервировать полную сумму
   - Это приоритет #1, деньги нельзя распределять в другие категории

3. **НАКОПЛЕНИЯ (средний приоритет):**
   - Если нет критичных долгов → 15-25% в SAVINGS
   - Если есть GOAL близкая к завершению (>70%) → предложи добавить недостающее
   - Минимум: 10% от дохода должно идти в накопления

4. **РЕЗЕРВ НА ЖИЗНЬ:**
   - Еда, транспорт, непредвиденные расходы
   - МИНИМУМ: (дни до зарплаты × 300₽) для базовых нужд
   - Остаток после всех выплат и накоплений

**ВАЖНО:**
- Не используй фиксированные проценты и шаблонные суммы.
- Сначала рассчитай резерв на ${appState.daysSalary} дней до зарплаты и обязательные платежи.
- Остаток распределяй между долгами, целями и накоплениями по приоритету.
- Если есть долг и доступный остаток после резерва больше нуля, предложи положительный платёж, а не 0 ₽.
- При подтверждённом распределении выполняй только рассчитанные действия.
- **НИКОГДА не распределяй автоматически при получении дохода - только по подтверждению!**`;

    // Build messages array with conversation history
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userInput }
    ];

    const requestBody = {
      model: model,
      messages: messages,
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
  // 7. Expense & Chat Form Handling (New Agentic Actions System)
  // =========================================================================
  async function handleExpenseSubmit() {
    const text = elements.naturalInput.value.trim();
    if (!text) return;

    setLoading(true);

    try {
      const result = await processWithAI(text);

      let changesApplied = 0;
      const appliedNotes = [];

      // Process actions array
      if (result.actions && Array.isArray(result.actions)) {
        for (const action of result.actions) {
          const actionType = action.type;
          const data = action.data || {};

          switch (actionType) {
            case 'INCOME': {
              const amt = Number(data.amount);
              if (!isNaN(amt) && amt > 0) {
                appState.currentBalance += amt;
                appState.transactions.push({
                  id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                  amount: amt,
                  category: 'income',
                  description: data.description || 'Пополнение',
                  date: new Date().toISOString()
                });
                changesApplied++;
                appliedNotes.push(`+${formatMoney(amt)} ₽`);
              }
              break;
            }

            case 'EXPENSE': {
              const amt = Number(data.amount);
              if (!isNaN(amt) && amt > 0) {
                appState.currentBalance = Math.max(0, appState.currentBalance - amt);
                appState.transactions.push({
                  id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                  amount: amt,
                  category: data.category || 'other',
                  description: data.description || 'Расход',
                  date: new Date().toISOString()
                });
                changesApplied++;
                appliedNotes.push(`-${formatMoney(amt)} ₽`);
              }
              break;
            }

            case 'CREATE_CELL': {
              const cellType = data.cellType;
              if (!cellType || !CellsManager.CELL_TYPES[cellType]) {
                console.warn('Unknown cell type:', cellType);
                break;
              }

              const cellData = {
                title: data.title || CellsManager.CELL_TYPES[cellType].name,
                amount: Number(data.amount) || 0,
                target: Number(data.target) || 0,
                rate: Number(data.rate) || 0,
                dayOfMonth: Number(data.dayOfMonth) || 0,
                autoDeduct: data.autoDeduct !== undefined ? Number(data.autoDeduct) : 0  // Без дефолта
              };

              // Deduct initial amount from balance if cell has funds
              // DEBT и SUBSCRIPTION не требуют баланса (это обязательства, а не активы)
              if (cellData.amount > 0 && cellType !== 'DEBT' && cellType !== 'SUBSCRIPTION') {
                if (appState.currentBalance < cellData.amount) {
                  showToast('Недостаточно средств для создания ячейки', 'error');
                  break;
                }
                appState.currentBalance -= cellData.amount;
              }

              CellsManager.createCell(cellType, cellData);
              changesApplied++;
              appliedNotes.push(`Создана: ${cellData.title}`);
              break;
            }

            case 'UPDATE_CELL': {
              let cell = null;
              
              if (data.cellId) {
                cell = CellsManager.getCellById(data.cellId);
              } else if (data.title) {
                // Find by title (fuzzy match)
                const title = data.title.toLowerCase();
                cell = appState.cells.find(c => c.title.toLowerCase().includes(title) || title.includes(c.title.toLowerCase()));
              }

              if (!cell) {
                showToast('Ячейка не найдена', 'error');
                break;
              }

              const amountChange = Number(data.amountChange) || 0;
              
              if (amountChange > 0) {
                // Deposit into cell
                if (appState.currentBalance < amountChange) {
                  showToast('Недостаточно средств', 'error');
                  break;
                }
                appState.currentBalance -= amountChange;
                CellsManager.updateCell(cell.id, { amount: cell.amount + amountChange });
                appliedNotes.push(`+${formatMoney(amountChange)} ₽ → ${cell.title}`);
              } else if (amountChange < 0) {
                // Withdraw from cell
                const withdrawAmount = Math.abs(amountChange);
                if (cell.amount < withdrawAmount) {
                  showToast('Недостаточно средств в ячейке', 'error');
                  break;
                }
                appState.currentBalance += withdrawAmount;
                CellsManager.updateCell(cell.id, { amount: cell.amount - withdrawAmount });
                appliedNotes.push(`-${formatMoney(withdrawAmount)} ₽ ← ${cell.title}`);
              }

              changesApplied++;
              break;
            }

            case 'DELETE_CELL': {
              let cell = null;
              
              if (data.cellId) {
                cell = CellsManager.getCellById(data.cellId);
              } else if (data.title) {
                const title = data.title.toLowerCase();
                cell = appState.cells.find(c => c.title.toLowerCase().includes(title) || title.includes(c.title.toLowerCase()));
              }

              if (!cell) {
                showToast('Ячейка не найдена', 'error');
                break;
              }

              // Return funds to balance
              appState.currentBalance += cell.amount;
              CellsManager.deleteCell(cell.id);
              changesApplied++;
              appliedNotes.push(`Удалена: ${cell.title}`);
              break;
            }

            case 'UPDATE_DAYS': {
              const days = Number(data.days);
              if (!isNaN(days) && days > 0) {
                appState.daysSalary = Math.round(days);
                changesApplied++;
                appliedNotes.push(`Дней: ${appState.daysSalary}`);
              }
              break;
            }

            case 'SET_BALANCE': {
              const newBalance = Number(data.balance);
              if (!isNaN(newBalance) && newBalance >= 0) {
                const oldBalance = appState.currentBalance;
                appState.currentBalance = newBalance;
                changesApplied++;
                appliedNotes.push(`Баланс установлен: ${formatMoney(newBalance)} ₽ (было ${formatMoney(oldBalance)} ₽)`);
                
                // Add transaction for tracking
                appState.transactions.push({
                  id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                  amount: newBalance - oldBalance,
                  category: 'balance_correction',
                  description: data.description || 'Корректировка баланса',
                  date: new Date().toISOString()
                });
              }
              break;
            }

            default:
              console.warn('Unknown action type:', actionType);
          }
        }
      }

      // Save & Update Dashboard
      if (changesApplied > 0) {
        saveData();
        // Invalidate AI cache on financial changes
        aiAnalysisCache.lastUpdate = null;
        await getProactiveAiAnalysis();
        renderDashboard();
        triggerHaptic('success');
        showToast(appliedNotes.slice(0, 3).join(' • '), 'success');
      }

      // Display AI response
      if (result.ai_response && result.ai_response.trim() !== '') {
        displayAiResponse(result.ai_response);
        triggerHaptic('light');
        
        // Save to conversation history
        conversationHistory.push(
          { role: 'user', content: text },
          { role: 'assistant', content: result.ai_response }
        );
        
        // Keep only last MAX_HISTORY_LENGTH messages (5 exchanges = 10 messages)
        if (conversationHistory.length > MAX_HISTORY_LENGTH) {
          conversationHistory = conversationHistory.slice(-MAX_HISTORY_LENGTH);
        }
      } else if (changesApplied === 0) {
        displayAiResponse('Понял ваш запрос, но не нашел финансовых действий. Попробуйте уточнить.');
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
    document.body.classList.toggle('ai-calculating', isLoading);
    if (isLoading) {
      elements.sendIcon.classList.add('hidden');
      elements.loadingSpinner.classList.remove('hidden');
      if (elements.dailyFoodAmount) elements.dailyFoodAmount.textContent = '…';
      if (elements.heroSubtext) elements.heroSubtext.textContent = 'ИИ анализирует баланс, долги и резерв…';
    } else {
      elements.sendIcon.classList.remove('hidden');
      elements.loadingSpinner.classList.add('hidden');
      renderDashboard();
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

    // Analytics Period Toggle
    if (elements.periodToggle) {
      elements.periodToggle.querySelectorAll('.period-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          elements.periodToggle.querySelectorAll('.period-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          selectedAnalyticsPeriod = btn.getAttribute('data-period') || 'month';
          renderAnalytics();
          triggerHaptic('light');
        });
      });
    }

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

    // Event delegation for cell action buttons
    if (elements.cellsContainer) {
      elements.cellsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.cell-action-btn');
        if (!btn) return;

        const action = btn.getAttribute('data-action');
        const cellId = btn.getAttribute('data-cell-id');

        if (!action || !cellId) return;

        e.preventDefault();
        e.stopPropagation();

        switch (action) {
          case 'add':
            addToCellPrompt(cellId);
            break;
          case 'withdraw':
            withdrawFromCellPrompt(cellId);
            break;
          case 'delete':
            deleteCellConfirm(cellId);
            break;
        }
      });
    }

    // Cell Action Modal handlers
    elements.closeCellActionBtn.addEventListener('click', closeCellActionModal);
    elements.cancelCellActionBtn.addEventListener('click', closeCellActionModal);
    elements.confirmCellActionBtn.addEventListener('click', confirmCellAction);
    
    // Close modal on background click
    elements.cellActionModal.addEventListener('click', (e) => {
      if (e.target === elements.cellActionModal) {
        closeCellActionModal();
      }
    });

    // Submit on Enter key
    elements.cellActionAmountInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        confirmCellAction();
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

  // Welcome message for first-time users
  function showWelcomeMessage() {
    const hasSeenWelcome = localStorage.getItem('smart_budget_welcome_seen');
    
    if (!hasSeenWelcome) {
      const userName = tg?.initDataUnsafe?.user?.first_name || 'Друг';
      
      const welcomeMessage = `👋 Привет, ${userName}!

🎉 Добро пожаловать в Smart Budget — ваш умный финансовый помощник!

Я помогу вам:
💰 Управлять бюджетом через простой чат
🏦 Создавать финансовые ячейки (вклады, копилки, долги)
📊 Анализировать расходы и доходы
💡 Получать умные советы по финансам

🚀 Для начала работы:
1️⃣ Откройте настройки ⚙️ и добавьте API-ключ
2️⃣ Напишите: "Пришла зарплата 50000, до зарплаты 14 дней"
3️⃣ Создайте ячейки: "Создай вклад 20000 под 18%"

💬 Попробуйте команды:
• "Купил продукты 1200"
• "Копилка на iPhone 80000"
• "На сколько дней хватит денег?"

Удачи! 💪`;

      displayAiResponse(welcomeMessage);
      localStorage.setItem('smart_budget_welcome_seen', 'true');
      triggerHaptic('success');
    }
  }

  // Payment reminders checker
  function checkPaymentReminders() {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Get reminder check key for today
    const checkKey = `reminder_checked_${currentYear}_${currentMonth}_${currentDay}`;
    const alreadyChecked = sessionStorage.getItem(checkKey);

    // Only check once per day
    if (alreadyChecked) return;

    const upcomingPayments = [];

    // Check DEBT and SUBSCRIPTION cells with dayOfMonth
    appState.cells.forEach(cell => {
      if ((cell.type === 'DEBT' || cell.type === 'SUBSCRIPTION') && cell.dayOfMonth > 0) {
        const daysUntilPayment = cell.dayOfMonth - currentDay;
        
        // Remind if payment is today, tomorrow, or in 3 days
        if (daysUntilPayment >= 0 && daysUntilPayment <= 3) {
          upcomingPayments.push({
            title: cell.title,
            amount: cell.amount,
            day: cell.dayOfMonth,
            daysLeft: daysUntilPayment,
            type: cell.type
          });
        }
      }
    });

    // Show reminders if any
    if (upcomingPayments.length > 0) {
      let reminderText = '🔔 Напоминание о платежах:\n\n';
      
      upcomingPayments.forEach(payment => {
        const emoji = payment.type === 'DEBT' ? '💳' : '📱';
        const dayText = payment.daysLeft === 0 ? 'СЕГОДНЯ' : 
                       payment.daysLeft === 1 ? 'завтра' : 
                       `через ${payment.daysLeft} дня`;
        
        reminderText += `${emoji} ${payment.title}\n`;
        reminderText += `💰 Сумма: ${formatMoney(payment.amount)}\n`;
        reminderText += `📅 Оплата: ${dayText} (${payment.day} числа)\n\n`;
      });

      reminderText += '💡 Не забудьте подготовить средства для оплаты!';

      displayAiResponse(reminderText);
      triggerHaptic('notification');
      
      // Mark as checked for today
      sessionStorage.setItem(checkKey, 'true');
    }
  }

  // =========================================================================
  // 9. Proactive AI Analysis
  // =========================================================================
  
  let aiAnalysisCache = {
    debtRecommendation: null,
    foodBudgetAdvice: null,
    foodBudgetAmount: null,
    lastUpdate: null
  };
  let proactiveAnalysisLoading = false;

  async function getProactiveAiAnalysis() {
    // Skip if no API key or analyzed recently (cache 5 min)
    if (!appState.apiKey || !appState.apiKey.trim()) return;
    
    const now = Date.now();
    if (aiAnalysisCache.lastUpdate && (now - aiAnalysisCache.lastUpdate) < 300000) {
      return aiAnalysisCache; // Use cache
    }

    proactiveAnalysisLoading = true;
    renderDashboard();
    try {
      const allCells = appState.cells || [];
      const debtCells = allCells.filter(c => c.type === 'DEBT');
      const totalDebt = debtCells.reduce((sum, c) => sum + c.amount, 0);
      
      // Only analyze if there are debts OR if balance is low
      if (totalDebt === 0 && appState.currentBalance > 1000) {
        aiAnalysisCache = {
          debtRecommendation: null,
          foodBudgetAdvice: `ИИ рассчитывает бюджет питания на ${appState.daysSalary} дн.`,
          foodBudgetAmount: Math.min(appState.currentBalance, Math.round(appState.currentBalance * 0.35)),
          lastUpdate: now
        };
        return aiAnalysisCache;
      }

      const prompt = `Ты финансовый советник. Проанализируй ситуацию и дай персональные рекомендации. Не используй фиксированные проценты: рассчитай их сам из баланса, долгов, обязательных платежей и времени до зарплаты.

📊 ФИНАНСОВАЯ СИТУАЦИЯ:
• Баланс: ${formatMoney(appState.currentBalance)} ₽
• Дней до зарплаты: ${appState.daysSalary} дн.
• Всего долгов: ${formatMoney(totalDebt)} ₽
${debtCells.length > 0 ? '• Долги:\n' + debtCells.map(d => `  - ${d.title}: ${formatMoney(d.amount)} ₽`).join('\n') : ''}

💡 ЗАДАЧА: Рассчитай:
1. Сумму и процент баланса для погашения долга (только если долг есть), оставив реалистичный резерв до зарплаты. Учитывай ${appState.daysSalary} дней и дневной бюджет на еду. При положительном балансе и долге не возвращай 0 ₽: предложи посильную положительную сумму.
2. Умеренный общий бюджет на еду до зарплаты и дневной лимит. Не закладывай 500 ₽ в день автоматически: используй экономный реалистичный бюджет и учитывай, что продукты могут уже быть дома.

Формат ответа (только текст, без JSON):
ДОЛГ: [сумма] ₽ ([процент]% баланса) — [обоснование]
ЕДА: [общая сумма] ₽ на ${appState.daysSalary} дн. ([дневной лимит] ₽/день)`;

      const response = await fetch(appState.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${appState.apiKey}`
        },
        body: JSON.stringify({
          model: appState.apiModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 100
        })
      });

      if (!response.ok) throw new Error('AI unavailable');

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content?.trim() || '';
      
      // Parse response
      const lines = aiResponse.split('\n');
      let debtLine = lines.find(l => l.startsWith('ДОЛГ:'))?.replace('ДОЛГ:', '').trim();
      let foodLine = lines.find(l => l.startsWith('ЕДА:'))?.replace('ЕДА:', '').trim();
      const foodMatch = foodLine?.match(/([\d\s]+)\s*₽/);
      const foodAmount = foodMatch ? Number(foodMatch[1].replace(/\s/g, '')) : appState.currentBalance;
      
      aiAnalysisCache = {
        debtRecommendation: totalDebt > 0 ? (debtLine || 'Рекомендую погасить часть долга') : null,
        foodBudgetAdvice: foodLine || `ИИ: ~${Math.round(foodAmount / Math.max(1, appState.daysSalary))} ₽/день`,
        foodBudgetAmount: Math.min(appState.currentBalance, Math.max(0, foodAmount)),
        lastUpdate: now
      };
      
      return aiAnalysisCache;
      
    } catch (error) {
      console.error('Proactive AI analysis failed:', error);
      return aiAnalysisCache; // Return old cache or null
    } finally {
      proactiveAnalysisLoading = false;
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
    
    // Get proactive AI analysis
    await getProactiveAiAnalysis();
    renderDashboard(); // Re-render with AI recommendations
    
    showWelcomeMessage();
    checkPaymentReminders();
  }

  // Run on DOM loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
