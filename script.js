/* ========================================== */
/* CONFIGURAÇÃO INICIAL */
/* ========================================== */

// ⚠️ WEBHOOK DO N8N - ALTERAR AQUI QUANDO INTEGRAR BACKEND
const N8N_WEBHOOK_URL = 'https://gabrielsup.app.n8n.cloud/webhook-test/suporte-t.i'; // Ex: 'https://seu-n8n.com/webhook/suporte-ti'

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
        id: 'gabriel_adm',
        name: 'Gabriel Oliveira | Adm',
        photo: 'images/gabriel.jpg'
    }
];

// ========================================== 
// ESTADO GLOBAL
// ========================================== 

let currentUser = null;
let sessionId = null;
let messages = [];
let currentTheme = localStorage.getItem('theme') || 'light';

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
    
    // Limpa input
    input.value = '';
    input.style.height = 'auto';
    
    // Remove mensagem de boas-vindas se existir
    const welcomeMsg = document.querySelector('.welcome-message');
    if (welcomeMsg) welcomeMsg.remove();
    
    // Adiciona mensagem do usuário
    addMessage('user', text);
    
    // Mostra loader
    addLoadingMessage();
    
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
const firstName = currentUser.name
  .split('|')[0]
  .trim()
  .split(' ')[0];


async function sendToN8N(messageText) {
    // Prepara payload conforme contrato especificado

    const firstName = currentUser.name
  .split('|')[0]
  .trim()
  .split(' ')[0];

    const payload = {
        event: 'chat_message',
        
        user: {
            id: currentUser.id,
            name: firstName
                    
        },
        session: {
            id: sessionId,
            startedAt: new Date(Number(sessionId.split('_')[1])).toISOString()
        },
        message: {
            type: 'text',
            content: messageText
        },
        meta: {
            origin: 'frontend',
            ui: 'chat'
        }
    };
    
    try {
        // ⚠️ PONTO DE INTEGRAÇÃO COM BACKEND N8N
        // Verifica se a URL do webhook foi configurada
        if (N8N_WEBHOOK_URL === 'COLE_AQUI') {
            // Modo simulado (sem backend)
            console.warn('⚠️ URL do webhook n8n não configurada. Usando resposta simulada.');
            simulateN8NResponse(messageText);
            return;
        }
        
        // Faz requisição real para o n8n
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Remove loader
        removeLoadingMessage();
        
        // Renderiza resposta do bot
        if (data.response && data.response.text) {
            addMessage('bot', data.response.text);
        } else {
            addMessage('bot', 'Desculpe, não consegui processar sua solicitação.');
        }
        
    } catch (error) {
        console.error('Erro ao comunicar com n8n:', error);
        removeLoadingMessage();
        addMessage('bot', 'Erro ao conectar com o servidor. Tente novamente.');
    }
}

// Função simulada para teste (quando n8n não está configurado)
function simulateN8NResponse(messageText) {
    setTimeout(() => {
        removeLoadingMessage();
        
        // Respostas simuladas baseadas em palavras-chave
        let responseText = 'Entendi sua dúvida. Como posso ajudar mais?';
        
        const lowerText = messageText.toLowerCase();
        
        if (lowerText.includes('erro') || lowerText.includes('problema')) {
            responseText = 'Identifiquei que você está com um erro. Para resolver:\n\n1. Verifique se está na última versão do sistema\n2. Limpe o cache do navegador\n3. Tente novamente\n\nSe o erro persistir, entre em contato com o suporte técnico.';
        } else if (lowerText.includes('nf-e') || lowerText.includes('nota fiscal')) {
            responseText = 'Para gerar NF-e:\n\n1. Acesse "Faturamento > Notas Fiscais"\n2. Clique em "Nova NF-e"\n3. Preencha os dados do cliente\n4. Adicione os produtos/serviços\n5. Clique em "Emitir NF-e"\n\nPrecisa de mais ajuda?';
        } else if (lowerText.includes('senha') || lowerText.includes('login')) {
            responseText = 'Para recuperar sua senha:\n\n1. Clique em "Esqueci minha senha"\n2. Digite seu e-mail cadastrado\n3. Verifique sua caixa de entrada\n4. Clique no link recebido\n5. Crie uma nova senha\n\nSe não receber o e-mail, verifique a pasta de spam.';
        }
        
        addMessage('bot', responseText);
    }, 1500); // Simula delay de processamento
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
