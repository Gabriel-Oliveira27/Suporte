/* ========================================== */
/* CONFIGURAÇÃO INICIAL */
/* ========================================== */

// ⚠️ WEBHOOK DO N8N - ALTERAR AQUI QUANDO INTEGRAR BACKEND
const N8N_WEBHOOK_URL = 'https://gabrielsup.app.n8n.cloud/webhook/suporte-t.i'; 

// ⚠️ LISTA DE USUÁRIOS - ADICIONAR/REMOVER USUÁRIOS AQUI
// Para adicionar foto: coloque o caminho em "photo" (ex: "assets/gabriel.jpg")
// Para usar SVG padrão: deixe "photo" como null
const USERS = [
    {
        id: 'visitor',
        name: 'Visitante',
        photo: null // SVG padrão será usado
    },
    {
        id: 'gabriel',
        name: 'Gabriel Oliveira | Adm',
        photo: 'images/gabriel.jpg'
    },
    {
        id: 'hanna',
        name: 'Hanna Conrado',
        photo: 'null'
    }
];

// ========================================== 
// ESTADO GLOBAL
// ========================================== 

let currentUser = null;
let sessionId = null;
let messages = [];
let currentTheme = localStorage.getItem('theme') || 'light';
let currentQuestion = null; // Armazena a pergunta original para feedback
let isConversationFinished = false; // Controla se a conversa foi finalizada

// ========================================== 
// SVG PADRÃO PARA USUÁRIOS SEM FOTO
// ========================================== 

const DEFAULT_AVATAR_SVG = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
</svg>
`;

// ========================================== 
// INICIALIZAÇÃO
// ========================================== 

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Aplica tema salvo
    applyTheme(currentTheme);
    
    // Renderiza cards de usuários
    renderUserCards();
    
    // Configura event listeners
    setupEventListeners();
    
    // Mostra tela de seleção
    showScreen('user-selection-screen');
}

// ========================================== 
// RENDERIZAÇÃO DE USUÁRIOS
// ========================================== 

function renderUserCards() {
    const container = document.getElementById('user-cards');
    container.innerHTML = '';
    
    USERS.forEach(user => {
        const card = document.createElement('div');
        card.className = 'user-card';
        card.onclick = () => selectUser(user);
        
        const avatarHTML = user.photo 
            ? `<img src="${user.photo}" alt="${user.name}">`
            : DEFAULT_AVATAR_SVG;
        
        card.innerHTML = `
            <div class="user-avatar">${avatarHTML}</div>
            <div class="user-name">${user.name}</div>
        `;
        
        container.appendChild(card);
    });
}

// ========================================== 
// SELEÇÃO DE USUÁRIO
// ========================================== 

function selectUser(user) {
    currentUser = user;
    sessionId = generateSessionId();
    messages = [];
    
    // Atualiza header com usuário atual
    updateCurrentUserHeader();
    
    // Atualiza perfil
    updateProfileView();
    
    // Transição suave para tela de chat
    const userScreen = document.getElementById('user-selection-screen');
    userScreen.style.opacity = '0';
    userScreen.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
        showScreen('chat-screen');
        switchView('chat');
    }, 300);
}

function updateCurrentUserHeader() {
    const container = document.getElementById('current-user');
    
    const avatarHTML = currentUser.photo
        ? `<img src="${currentUser.photo}" alt="${currentUser.name}">`
        : DEFAULT_AVATAR_SVG;
    
    container.innerHTML = `
        <div class="current-user-avatar">${avatarHTML}</div>
        <span class="current-user-name">${currentUser.name}</span>
    `;
}

function updateProfileView() {
    // Foto
    const photoPreview = document.getElementById('photo-preview');
    const avatarHTML = currentUser.photo
        ? `<img src="${currentUser.photo}" alt="${currentUser.name}">`
        : DEFAULT_AVATAR_SVG;
    photoPreview.innerHTML = avatarHTML;
    
    // Nome e ID
    document.getElementById('profile-name').textContent = currentUser.name;
    document.getElementById('profile-id').textContent = currentUser.id;
}

// ========================================== 
// CONTROLE DE TELAS E VIEWS
// ========================================== 

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function switchView(viewName) {
    // Remove active de todos os nav-items e views
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Ativa o nav-item e view correspondentes
    const navButton = document.querySelector(`[data-view="${viewName}"]`);
    if (navButton) navButton.classList.add('active');
    
    const view = document.getElementById(`view-${viewName}`);
    if (view) view.classList.add('active');
}

// ========================================== 
// EVENT LISTENERS
// ========================================== 

function setupEventListeners() {
    // Toggle do menu lateral
    document.getElementById('menu-toggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('collapsed');
    });
    
    // Navegação do sidebar
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = e.currentTarget.dataset.view;
            
            if (view === 'logout') {
                logout();
            } else {
                switchView(view);
            }
        });
    });
    
    // Enviar mensagem
    document.getElementById('send-button').addEventListener('click', sendMessage);
    
    document.getElementById('message-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Auto-resize do textarea
    document.getElementById('message-input').addEventListener('input', (e) => {
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
    });
    
    // Upload de foto
    document.getElementById('photo-input').addEventListener('change', handlePhotoUpload);
    
    // Botões de cancelar e salvar foto (adicionados dinamicamente quando necessário)
    // Não precisam ser adicionados aqui pois usam onclick direto no HTML
    
    // Alteração de tema
    document.querySelectorAll('input[name="theme"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const theme = e.target.value;
            applyTheme(theme);
            highlightSelectedTheme(theme);
        });
    });
    
    // Seleciona tema clicando no card
    document.querySelectorAll('.theme-option').forEach(option => {
        option.addEventListener('click', () => {
            const theme = option.dataset.theme;
            document.getElementById(`theme-${theme}`).checked = true;
            applyTheme(theme);
            highlightSelectedTheme(theme);
        });
    });
}

// ========================================== 
// CHAT - ENVIO DE MENSAGEM
// ========================================== 

async function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    
    if (!text) return;
    
    // Verifica se a conversa já foi finalizada
    if (isConversationFinished) {
        alert('Esta conversa foi finalizada. Faça uma nova pergunta para começar outra conversa.');
        return;
    }
    
    // Armazena a pergunta original
    currentQuestion = text;
    
    // Limpa input
    input.value = '';
    input.style.height = 'auto';
    
    // Remove mensagem de boas-vindas se existir
    const welcomeMsg = document.querySelector('.welcome-message');
    if (welcomeMsg) welcomeMsg.remove();
    
    // Adiciona mensagem do usuário
    addMessage('user', text);
    
    // Mostra fluxo de estados sequenciais
    await renderStatusFlow();
    
    // Envia para n8n
    await sendToN8N(text);
}

function addMessage(sender, text, time = null) {
    const messagesArea = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const avatarHTML = sender === 'user'
        ? (currentUser.photo 
            ? `<img src="${currentUser.photo}" alt="${currentUser.name}">` 
            : DEFAULT_AVATAR_SVG)
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
           </svg>`;
    
    const timestamp = time || getCurrentTime();
    
    messageDiv.innerHTML = `
        <div class="message-avatar">${avatarHTML}</div>
        <div>
            <div class="message-bubble">${escapeHTML(text)}</div>
            <div class="message-time">${timestamp}</div>
        </div>
    `;
    
    messagesArea.appendChild(messageDiv);
    scrollToBottom();
    
    // Salva mensagem
    messages.push({
        sender,
        text,
        timestamp
    });
}

function addLoadingMessage() {
    const messagesArea = document.getElementById('messages');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot loading';
    loadingDiv.id = 'loading-message';
    
    loadingDiv.innerHTML = `
        <div class="message-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
        </div>
        <div>
            <div class="message-bubble">
                <div class="loader-dots">
                    <div class="loader-dot"></div>
                    <div class="loader-dot"></div>
                    <div class="loader-dot"></div>
                </div>
            </div>
        </div>
    `;
    
    messagesArea.appendChild(loadingDiv);
    scrollToBottom();
}

function removeLoadingMessage() {
    const loadingMsg = document.getElementById('loading-message');
    if (loadingMsg) loadingMsg.remove();
}

// ========================================== 
// INTEGRAÇÃO COM N8N
// ========================================== 



async function sendToN8N(messageText) {
  // ✅ Garante que o usuário foi selecionado
  const safeUser = currentUser || { id: 'visitor', name: 'Visitante' };
  const firstName = safeUser.name ? safeUser.name.split('|')[0].trim().split(' ')[0] : 'Visitante';

  // payload padrão
  const payload = {
    event: 'chat_message',
    user: { id: safeUser.id, name: firstName },
    session: { id: sessionId || `session_${Date.now()}`, startedAt: new Date().toISOString() },
    message: { type: 'text', content: messageText },
    meta: { origin: 'frontend', ui: 'chat' }
  };

  // Mostra no console
  console.log('-> Enviando payload para n8n:', payload);

  try {
    // ⚠️ Se não configurar webhook, usa resposta simulada
    if (N8N_WEBHOOK_URL === 'COLE_AQUI') {
      console.warn('⚠️ URL do webhook n8n não configurada. Resposta simulada.');
      
      // Remove fluxo de status
      removeStatusFlow();
      
      // Usa resposta estruturada simulada
      simulateStructuredResponse(messageText);
      return;
    }

    // Fetch para n8n
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    let data;
    try { data = await response.json(); } catch { data = await response.text(); }

    console.log('<- Resposta bruta do n8n:', data);

    // Remove fluxo de status
    removeStatusFlow();

    // Verifica se a resposta está no formato estruturado
    if (data.type === 'answer' && data.message) {
      // Renderiza resposta estruturada
      renderMessage(data);
    } else {
      // Fallback: renderiza como mensagem simples
      let text = '';
      if (Array.isArray(data) && data[0]?.response) text = data[0].response;
      else if (data.response) text = data.response;
      else if (typeof data === 'string') text = data;
      else text = 'Desculpe, não consegui processar sua solicitação.';

      addMessage('bot', text);
    }
  } catch (error) {
    console.error('Erro ao comunicar com n8n:', error);
    
    // Remove fluxo de status
    removeStatusFlow();
    
    const errMsg = String(error).toLowerCase();
    if (errMsg.includes('cors') || errMsg.includes('failed to fetch')) {
      addMessage('bot', 'Erro de conexão: CORS bloqueando. Use Worker proxy ou configure n8n.');
    } else {
      addMessage('bot', 'Erro ao conectar com o servidor. Tente novamente.');
    }
  }
}

// Função simulada para teste (quando n8n não está configurado)
function simulateStructuredResponse(messageText) {
    setTimeout(() => {
        removeStatusFlow();
        
        // Exemplo de resposta estruturada simulada
        const mockResponse = {
            type: 'answer',
            message: {
                title: 'Como resolver problemas de login',
                body: 'Identificamos que você está com dificuldades para acessar o sistema.',
                solution: 'Para resolver esse problema:\n\n1. Limpe o cache do navegador\n2. Tente usar o modo anônimo/privado\n3. Verifique se seu usuário está ativo\n4. Certifique-se de usar a senha correta\n\nSe o problema persistir, entre em contato com o suporte técnico.'
            },
            actions: [
                { id: 'helped', label: 'Isso me ajudou' },
                { id: 'not_helped', label: 'Não é o que eu procurava' }
            ],
            alternatives: [
                {
                    id: 'alt_1',
                    title: 'Redefinir senha',
                    solution: 'Clique em "Esqueci minha senha" na tela de login e siga as instruções enviadas por e-mail.'
                },
                {
                    id: 'alt_2',
                    title: 'Conta bloqueada',
                    solution: 'Se sua conta foi bloqueada após múltiplas tentativas, aguarde 30 minutos ou entre em contato com o suporte.'
                },
                {
                    id: 'alt_3',
                    title: 'Problemas com autenticação',
                    solution: 'Verifique se a autenticação de dois fatores está configurada corretamente no seu dispositivo.'
                }
            ]
        };
        
        renderMessage(mockResponse);
    }, 800); // Simula delay de processamento
}

// ========================================== 
// FLUXO DE ESTADOS SEQUENCIAIS
// ========================================== 

/**
 * Renderiza o fluxo de estados ao enviar uma pergunta:
 * 1. "Enviado"
 * 2. "Consultando base de dados"
 * 3. "Formulando resposta"
 * 4. "Já sei!"
 */
async function renderStatusFlow() {
    const messagesArea = document.getElementById('messages');
    
    // Cria elemento de status
    const statusDiv = document.createElement('div');
    statusDiv.className = 'message bot status-flow';
    statusDiv.id = 'status-flow-message';
    
    statusDiv.innerHTML = `
        <div class="message-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
        </div>
        <div>
            <div class="message-bubble status-bubble">
                <div class="status-steps" id="status-steps">
                    <div class="status-step" data-step="1">
                        <div class="status-icon">⏳</div>
                        <span>Enviado</span>
                    </div>
                    <div class="status-step" data-step="2">
                        <div class="status-icon">🔍</div>
                        <span>Consultando base de dados</span>
                    </div>
                    <div class="status-step" data-step="3">
                        <div class="status-icon">💭</div>
                        <span>Formulando resposta</span>
                    </div>
                    <div class="status-step" data-step="4">
                        <div class="status-icon">✅</div>
                        <span>Já sei!</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    messagesArea.appendChild(statusDiv);
    scrollToBottom();
    
    // Ativa cada etapa sequencialmente
    const steps = [1, 2, 3, 4];
    for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 600)); // Delay entre etapas
        const stepEl = statusDiv.querySelector(`[data-step="${steps[i]}"]`);
        if (stepEl) {
            stepEl.classList.add('active');
            scrollToBottom();
        }
    }
    
    // Aguarda um pouco antes de remover
    await new Promise(resolve => setTimeout(resolve, 400));
}

/**
 * Remove o fluxo de status da tela
 */
function removeStatusFlow() {
    const statusMsg = document.getElementById('status-flow-message');
    if (statusMsg) statusMsg.remove();
}

// ========================================== 
// RENDERIZAÇÃO ESTRUTURADA DE RESPOSTAS
// ========================================== 

/**
 * Renderiza mensagem estruturada do backend com:
 * - Título, corpo e solução
 * - Botões de ação
 * - Cards de alternativas (se aplicável)
 * 
 * @param {Object} responseData - JSON retornado do backend
 */
function renderMessage(responseData) {
    const messagesArea = document.getElementById('messages');
    
    // Cria container da mensagem
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot structured';
    
    const avatarHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
    `;
    
    let contentHTML = `
        <div class="message-avatar">${avatarHTML}</div>
        <div class="structured-content">
    `;
    
    // Renderiza título, corpo e solução
    if (responseData.message) {
        const msg = responseData.message;
        
        contentHTML += `
            <div class="message-bubble structured-bubble">
                ${msg.title ? `<h3 class="message-title">${escapeHTML(msg.title)}</h3>` : ''}
                ${msg.body ? `<p class="message-body">${escapeHTML(msg.body)}</p>` : ''}
                ${msg.solution ? `<div class="message-solution">${escapeHTML(msg.solution)}</div>` : ''}
            </div>
        `;
    }
    
    // Renderiza botões de ação
    if (responseData.actions && responseData.actions.length > 0) {
        contentHTML += renderActions(responseData.actions, responseData.alternatives);
    }
    
    contentHTML += `
            <div class="message-time">${getCurrentTime()}</div>
        </div>
    `;
    
    messageDiv.innerHTML = contentHTML;
    messagesArea.appendChild(messageDiv);
    scrollToBottom();
}

/**
 * Renderiza botões de ação abaixo da resposta principal
 * 
 * @param {Array} actions - Lista de ações [{id, label}]
 * @param {Array} alternatives - Lista de alternativas (opcional)
 */
function renderActions(actions, alternatives = []) {
    let html = '<div class="action-buttons">';
    
    actions.forEach(action => {
        html += `
            <button 
                class="action-btn" 
                data-action="${action.id}"
                onclick="handleActionClick('${action.id}', ${JSON.stringify(alternatives).replace(/"/g, '&quot;')})">
                ${escapeHTML(action.label)}
            </button>
        `;
    });
    
    html += '</div>';
    return html;
}

/**
 * Renderiza cards de alternativas quando usuário clica "Não é o que eu procurava"
 * 
 * @param {Array} alternatives - Lista de alternativas [{id, title, solution}]
 */
function renderCards(alternatives) {
    const messagesArea = document.getElementById('messages');
    
    // Cria container de alternativas
    const cardsDiv = document.createElement('div');
    cardsDiv.className = 'message bot alternatives';
    cardsDiv.id = 'alternatives-container';
    
    const avatarHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
    `;
    
    let html = `
        <div class="message-avatar">${avatarHTML}</div>
        <div class="alternatives-content">
            <div class="message-bubble">
                <p><strong>Outras soluções que podem ajudar:</strong></p>
            </div>
            <div class="alternatives-grid">
    `;
    
    alternatives.forEach(alt => {
        html += `
            <div class="alternative-card">
                <h4 class="card-title">${escapeHTML(alt.title)}</h4>
                <p class="card-solution">${escapeHTML(alt.solution)}</p>
                <button 
                    class="card-btn" 
                    onclick="handleAlternativeClick('${alt.id}', '${escapeHTML(alt.title)}', '${escapeHTML(alt.solution)}')">
                    Essa resposta me ajudou
                </button>
            </div>
        `;
    });
    
    html += `
            </div>
            <div class="message-time">${getCurrentTime()}</div>
        </div>
    `;
    
    cardsDiv.innerHTML = html;
    messagesArea.appendChild(cardsDiv);
    scrollToBottom();
}

// ========================================== 
// HANDLERS DE AÇÕES E FEEDBACK
// ========================================== 

/**
 * Manipula clique nos botões de ação principais
 * 
 * @param {string} actionId - ID da ação clicada
 * @param {Array} alternatives - Alternativas disponíveis
 */
async function handleActionClick(actionId, alternatives) {
    console.log('Ação clicada:', actionId);
    
    // Desabilita todos os botões de ação
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
    });
    
    if (actionId === 'helped') {
        // Usuário foi ajudado - envia feedback positivo
        await sendActionToBackend({
            action: 'helped',
            selected_solution: 'primary',
            original_question: currentQuestion,
            timestamp: new Date().toISOString()
        });
        
    } else if (actionId === 'not_helped') {
        // Usuário não foi ajudado - mostra alternativas
        if (alternatives && alternatives.length > 0) {
            renderCards(alternatives);
        } else {
            // Sem alternativas - envia feedback negativo
            await sendActionToBackend({
                action: 'not_helped',
                selected_solution: null,
                original_question: currentQuestion,
                timestamp: new Date().toISOString()
            });
        }
    }
}

/**
 * Manipula clique em card de alternativa
 * 
 * @param {string} altId - ID da alternativa
 * @param {string} title - Título da alternativa
 * @param {string} solution - Solução da alternativa
 */
async function handleAlternativeClick(altId, title, solution) {
    console.log('Alternativa clicada:', altId);
    
    // Desabilita todos os botões de alternativas
    document.querySelectorAll('.card-btn').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
    });
    
    // Envia feedback indicando qual alternativa ajudou
    await sendActionToBackend({
        action: 'helped',
        selected_solution: altId,
        original_question: currentQuestion,
        alternative_title: title,
        timestamp: new Date().toISOString()
    });
}

/**
 * Envia feedback da ação do usuário para o backend
 * 
 * @param {Object} feedbackData - Dados do feedback
 */
async function sendActionToBackend(feedbackData) {
    console.log('-> Enviando feedback para backend:', feedbackData);
    
    try {
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event: 'user_feedback',
                user: { id: currentUser.id, name: currentUser.name },
                session: { id: sessionId },
                feedback: feedbackData
            })
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        console.log('<- Resposta do backend ao feedback:', data);
        
        // Verifica status de conclusão
        handleCompletionStatus(data);
        
    } catch (error) {
        console.error('Erro ao enviar feedback:', error);
        // Não exibe erro ao usuário neste caso, apenas loga
    }
}

/**
 * Manipula estados de finalização da conversa
 * 
 * @param {Object} data - Resposta do backend
 */
function handleCompletionStatus(data) {
    const messagesArea = document.getElementById('messages');
    
    if (data.status === 'concluido') {
        // Conversa finalizada - bloqueia novas ações
        isConversationFinished = true;
        
        const conclusionDiv = document.createElement('div');
        conclusionDiv.className = 'message bot conclusion';
        conclusionDiv.innerHTML = `
            <div class="message-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
            </div>
            <div>
                <div class="message-bubble success-bubble">
                    ✅ <strong>Ótimo!</strong> Fico feliz em ter ajudado! Se precisar de mais alguma coisa, estou à disposição.
                </div>
                <div class="message-time">${getCurrentTime()}</div>
            </div>
        `;
        
        messagesArea.appendChild(conclusionDiv);
        scrollToBottom();
        
        // Desabilita input de mensagem
        const input = document.getElementById('message-input');
        input.disabled = true;
        input.placeholder = 'Conversa finalizada. Recarregue a página para iniciar nova conversa.';
        
    } else if (data.status === 'nao_concluido') {
        // Não concluído - pede reformulação
        const reformulateDiv = document.createElement('div');
        reformulateDiv.className = 'message bot reformulate';
        reformulateDiv.innerHTML = `
            <div class="message-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
            </div>
            <div>
                <div class="message-bubble warning-bubble">
                    💬 Desculpe não ter conseguido ajudar. Pode reformular sua pergunta ou fornecer mais detalhes? Assim posso buscar uma solução melhor para você.
                </div>
                <div class="message-time">${getCurrentTime()}</div>
            </div>
        `;
        
        messagesArea.appendChild(reformulateDiv);
        scrollToBottom();
        
        // Reseta estado para permitir nova pergunta
        currentQuestion = null;
        isConversationFinished = false;
    }
}

// ========================================== 
// UPLOAD DE FOTO DO PERFIL
// ========================================== 

// Estado temporário para preview da nova foto
let newPhotoData = null;
let newPhotoFile = null;

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    
    if (!file) return;
    
    // Valida tipo de arquivo
    if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione uma imagem válida.');
        event.target.value = ''; // Limpa o input
        return;
    }
    
    // Valida tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 5MB.');
        event.target.value = ''; // Limpa o input
        return;
    }
    
    // Lê e prepara preview
    const reader = new FileReader();
    
    reader.onload = (e) => {
        newPhotoData = e.target.result; // Base64
        newPhotoFile = file;
        
        // Mostra estado de preview (antes/depois)
        showPhotoPreviewState();
    };
    
    reader.readAsDataURL(file);
}

function showPhotoPreviewState() {
    // Esconde estado inicial
    document.getElementById('photo-current-state').style.display = 'none';
    
    // Mostra estado de preview
    document.getElementById('photo-preview-state').style.display = 'block';
    
    // Preenche foto atual (antes)
    const photoBefore = document.getElementById('photo-before');
    const currentAvatarHTML = currentUser.photo
        ? `<img src="${currentUser.photo}" alt="${currentUser.name}">`
        : DEFAULT_AVATAR_SVG;
    photoBefore.innerHTML = currentAvatarHTML;
    
    // Preenche nova foto (depois)
    const photoAfter = document.getElementById('photo-after');
    photoAfter.innerHTML = `<img src="${newPhotoData}" alt="Nova foto">`;
    
    // Info do arquivo
    document.getElementById('new-photo-name').textContent = newPhotoFile.name;
    document.getElementById('new-photo-size').textContent = formatFileSize(newPhotoFile.size);
}

function cancelPhotoChange() {
    // Limpa estados temporários
    newPhotoData = null;
    newPhotoFile = null;
    
    // Limpa input
    document.getElementById('photo-input').value = '';
    
    // Esconde preview e mostra estado inicial
    document.getElementById('photo-preview-state').style.display = 'none';
    document.getElementById('photo-current-state').style.display = 'block';
}

function sanitizeFilename(text) {
    return text
      .toLowerCase()
      .normalize('NFD')                // remove acentos
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')      // só letras, números e _
      .replace(/_+/g, '_')             // remove ____
      .replace(/^_|_$/g, '');          // remove _ no início/fim
  }

async function savePhotoChange() {
    if (!newPhotoData || !newPhotoFile) return;
    
    if (!newPhotoData.includes(',')) {
        throw new Error('Base64 inválido');
      }
      
    // Esconde preview
    document.getElementById('photo-preview-state').style.display = 'none';
    
    // Mostra estado de loading
    document.getElementById('photo-uploading-state').style.display = 'flex';
    
    
    try {
     
        const uploadResponse = await fetch('https://suporte.gab-oliveirab27.workers.dev', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: newPhotoFile.name,
                mimeType: newPhotoFile.type,
                data: newPhotoData.split(',')[1], // BASE64 PURO
                user: currentUser.name,
                message: 'Atualização de foto de perfil'
              })    
          });
          
          const result = await uploadResponse.json();
          
          if (!result.success) {
            throw new Error(result.error || 'Erro ao salvar foto');
          }

        const photoUrl = result.url; // URL retornada pelo backend
        
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Por enquanto, salva no localStorage (temporário)
        localStorage.setItem(`user_photo_${currentUser.id}`, newPhotoData);
        
        // Atualiza usuário atual
        currentUser.photo = newPhotoData;
        
        // Atualiza foto na lista de usuários também
        const userIndex = USERS.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
            USERS[userIndex].photo = newPhotoData;
        }
        
        // Esconde loading
        document.getElementById('photo-uploading-state').style.display = 'none';
        
        // Mostra mensagem de sucesso
        showPhotoMessage('success', '✅ Foto salva com sucesso!');
        
        // Atualiza foto no perfil
        const photoPreview = document.getElementById('photo-preview');
        photoPreview.innerHTML = `<img src="${newPhotoData}" alt="${currentUser.name}">`;
        
        // Atualiza header
        updateCurrentUserHeader();
        
        // Limpa estados temporários
        newPhotoData = null;
        newPhotoFile = null;
        document.getElementById('photo-input').value = '';
        
        // Volta para estado inicial após 2 segundos
        setTimeout(() => {
            document.getElementById('photo-current-state').style.display = 'block';
            hidePhotoMessage();
        }, 2000);
        
    } catch (error) {
        console.error('Erro ao salvar foto:', error);
        
        // Esconde loading
        document.getElementById('photo-uploading-state').style.display = 'none';
        
        // Mostra mensagem de erro
        showPhotoMessage('error', '❌ Erro ao salvar foto. Tente novamente.');
        
        // Volta para estado de preview após 2 segundos
        setTimeout(() => {
            showPhotoPreviewState();
            hidePhotoMessage();
        }, 2000);
    }
}

function showPhotoMessage(type, text) {
    const messageEl = document.getElementById('photo-message');
    messageEl.className = `photo-message ${type}`;
    messageEl.textContent = text;
    messageEl.style.display = 'block';
}

function hidePhotoMessage() {
    document.getElementById('photo-message').style.display = 'none';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ========================================== 
// TEMA (CLARO/ESCURO)
// ========================================== 

function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Marca o radio button correto
    const radio = document.getElementById(`theme-${theme}`);
    if (radio) radio.checked = true;
    
    highlightSelectedTheme(theme);
}

function highlightSelectedTheme(theme) {
    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    const selectedOption = document.querySelector(`[data-theme="${theme}"]`);
    if (selectedOption) selectedOption.classList.add('selected');
}

// ========================================== 
// LOGOUT
// ========================================== 

function logout() {
    // Limpa estado
    currentUser = null;
    sessionId = null;
    messages = [];
    
    // Limpa mensagens
    const messagesArea = document.getElementById('messages');
    messagesArea.innerHTML = `
        <div class="welcome-message">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <h2>Olá! Como posso ajudar?</h2>
            <p>Digite sua dúvida abaixo e receba suporte automatizado.</p>
        </div>
    `;
    
    // Volta para seleção de usuário
    const chatScreen = document.getElementById('chat-screen');
    chatScreen.style.opacity = '0';
    
    setTimeout(() => {
        showScreen('user-selection-screen');
        
        // Reset animação
        const userScreen = document.getElementById('user-selection-screen');
        userScreen.style.opacity = '1';
        userScreen.style.transform = 'scale(1)';
    }, 300);
}

// ========================================== 
// UTILITÁRIOS
// ========================================== 

function generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom() {
    const messagesArea = document.getElementById('messages');
    setTimeout(() => {
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }, 100);
}

// ========================================== 
// CARREGAMENTO INICIAL DO TEMA
// ========================================== 

// Aplica tema ao carregar a página
if (currentTheme === 'dark') {
    highlightSelectedTheme('dark');
} else {
    highlightSelectedTheme('light');
}
