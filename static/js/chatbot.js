// Chatbot inteligente para análises agrícolas
let chatbotOpen = false;
let chatHistory = [];

// Inicializar chatbot
function initializeChatbot() {
    // Criar container do chatbot
    const chatbotContainer = document.createElement('div');
    chatbotContainer.id = 'chatbot-container';
    chatbotContainer.innerHTML = `
        <!-- Botão flutuante -->
        <button id="chatbot-toggle" class="chatbot-toggle" onclick="toggleChatbot()">
            <i class="fas fa-robot"></i>
        </button>

        <!-- Interface do chat -->
        <div id="chatbot-interface" class="chatbot-interface">
            <div class="chatbot-header">
                <div class="chatbot-title">
                    <i class="fas fa-robot me-2"></i>
                    FertiCore Assistant
                </div>
                <button class="chatbot-close" onclick="toggleChatbot()">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="chatbot-messages" id="chatbot-messages">
                <div class="chatbot-message bot-message">
                    <div class="message-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-content">
                        Olá! Sou o FertiCore Assistant. Posso ajudar você a analisar dados agrícolas brasileiros.<br><br>
                        <strong>📊 O que posso fazer:</strong><br>
                        • Analisar qualquer cultura (soja, milho, banana, café, etc.)<br>
                        • Filtrar por estado ou analisar todo o Brasil<br>
                        • Plotar dados automaticamente no mapa<br>
                        • Fornecer estatísticas detalhadas<br><br>
                        <strong>💬 Exemplos de uso:</strong><br>
                        • "SOJA em SP" ou "analise banana no ceara"<br>
                        • "mostre milho rs" ou "CAFÉ MG"<br>
                        • "produção de tomate" ou "algodao bahia"<br><br>
                        <em>Pode escrever de qualquer jeito - entendo abreviações, maiúsculas, sem acentos, etc!</em>
                    </div>
                </div>
            </div>

            <div class="chatbot-input-container">
                <input type="text" id="chatbot-input" placeholder="Digite sua pergunta..." onkeypress="handleChatbotKeypress(event)">
                <button id="chatbot-send" onclick="sendChatbotMessage()">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(chatbotContainer);
}

// Toggle chatbot
function toggleChatbot() {
    const chatInterface = document.getElementById('chatbot-interface');
    const toggleBtn = document.getElementById('chatbot-toggle');

    chatbotOpen = !chatbotOpen;

    if (chatbotOpen) {
        chatInterface.style.display = 'flex';
        toggleBtn.classList.add('active');
        document.getElementById('chatbot-input').focus();
    } else {
        chatInterface.style.display = 'none';
        toggleBtn.classList.remove('active');
    }
}

// Handle keypress
function handleChatbotKeypress(event) {
    if (event.key === 'Enter') {
        sendChatbotMessage();
    }
}

// Enviar mensagem
async function sendChatbotMessage() {
    const input = document.getElementById('chatbot-input');
    const message = input.value.trim();

    if (!message) return;

    // Adicionar mensagem do usuário
    addChatMessage(message, 'user');
    input.value = '';

    // Mostrar indicador de carregamento
    showTypingIndicator();

    try {
        // Processar comando
        const response = await processChatbotCommand(message);

        // Remover indicador de carregamento
        removeTypingIndicator();

        // Adicionar resposta do bot
        addChatMessage(response.text, 'bot');

        // Executar ações se necessário
        if (response.actions) {
            await executeChatbotActions(response.actions);
        }

    } catch (error) {
        removeTypingIndicator();
        addChatMessage('Desculpe, ocorreu um erro ao processar sua solicitação. Tente reformular sua pergunta.', 'bot');
    }
}

// Adicionar mensagem ao chat
function addChatMessage(message, type) {
    const messagesContainer = document.getElementById('chatbot-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chatbot-message ${type}-message`;

    const avatar = type === 'bot' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';

    messageDiv.innerHTML = `
        <div class="message-avatar">
            ${avatar}
        </div>
        <div class="message-content">
            ${message}
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Salvar no histórico
    chatHistory.push({ message, type, timestamp: new Date() });
}

// Mostrar indicador de digitação
function showTypingIndicator() {
    const messagesContainer = document.getElementById('chatbot-messages');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'chatbot-message bot-message typing-indicator';
    typingDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;

    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Remover indicador de digitação
function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Processar comando do chatbot
async function processChatbotCommand(message) {
    const command = parseNaturalLanguageCommand(message);

    if (!command.crop && !command.action) {
        return {
            text: 'Não consegui entender sua solicitação. Tente perguntar sobre uma cultura específica ou estado. Por exemplo: "Analise a soja em São Paulo" ou "Mostre a produção de milho".'
        };
    }

    // Buscar dados da cultura
    let analysisText = '';
    let actions = [];

    if (command.crop) {
        try {
            const cropData = await fetchCropAnalysis(command.crop, command.state);

            if (cropData.success) {
                analysisText = generateAnalysisText(command, cropData);
                actions.push({
                    type: 'plot_map',
                    crop: command.crop,
                    state: command.state,
                    data: cropData
                });
            } else {
                const errorMsg = cropData.error || 'Dados não encontrados';
                analysisText = `❌ Não encontrei dados para a cultura "${command.crop}". ${errorMsg}\n\n`;
                analysisText += `💡 **Sugestões:**\n`;
                analysisText += `• Verifique se o nome da cultura está correto\n`;
                analysisText += `• Tente variações como "soja", "milho", "banana", etc.\n`;
                analysisText += `• Algumas culturas podem ter nomes específicos no IBGE`;
            }
        } catch (error) {
            analysisText = 'Erro ao buscar dados da cultura. Tente novamente.';
        }
    }

    return {
        text: analysisText,
        actions: actions
    };
}

// Parse de linguagem natural aprimorado
function parseNaturalLanguageCommand(message) {
    const lowerMessage = message.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9\s]/g, ' ') // Remove pontuação
        .replace(/\s+/g, ' ') // Normaliza espaços
        .trim();

    // Mapeamento inteligente de culturas com variações
    const cropMappings = {
        'soja': ['soja', 'soj', 'sojas', 'grão de soja', 'grao de soja'],
        'milho': ['milho', 'milh', 'milhos', 'milho graos', 'milho grao'],
        'banana': ['banana', 'banan', 'bananas', 'banana cacho', 'bananeira'],
        'café': ['cafe', 'caf', 'cafes', 'cafeeiro', 'cafeicultura'],
        'cana-de-açúcar': ['cana', 'cana de acucar', 'cana acucar', 'canavieiro'],
        'arroz': ['arroz', 'arro', 'arrozal', 'rizicultura'],
        'feijão': ['feijao', 'feija', 'feijoes', 'feijao grao'],
        'algodão': ['algodao', 'algoda', 'algodoeiro', 'cotonicultura'],
        'laranja': ['laranja', 'laranj', 'citrus', 'laranjeira'],
        'uva': ['uva', 'uvas', 'viticultura', 'parreira'],
        'maçã': ['maca', 'mac', 'macas', 'macieira'],
        'tomate': ['tomate', 'tomat', 'tomateiro', 'tomaticultura'],
        'batata': ['batata', 'batat', 'batatas', 'bataticultura'],
        'mandioca': ['mandioca', 'mandio', 'aipim', 'macaxeira', 'mandiocultura']
    };

    // Mapeamento completo de estados com variações
    const stateMappings = {
        'AC': ['acre', 'ac'],
        'AL': ['alagoas', 'al', 'alagoa'],
        'AP': ['amapa', 'ap'],
        'AM': ['amazonas', 'am', 'amazonia'],
        'BA': ['bahia', 'ba'],
        'CE': ['ceara', 'ce'],
        'DF': ['distrito federal', 'df', 'brasilia', 'distritofederal'],
        'ES': ['espirito santo', 'es', 'espiritosanto'],
        'GO': ['goias', 'go', 'goiania'],
        'MA': ['maranhao', 'ma'],
        'MT': ['mato grosso', 'mt', 'matogrosso'],
        'MS': ['mato grosso do sul', 'ms', 'matogrossodosul'],
        'MG': ['minas gerais', 'mg', 'minasgerais', 'minas'],
        'PA': ['para', 'pa'],
        'PB': ['paraiba', 'pb'],
        'PR': ['parana', 'pr', 'paraná', 'p.parana', 'p parana'],
        'PE': ['pernambuco', 'pe', 'p.pernambuco', 'p pernambuco'],
        'PI': ['piaui', 'pi', 'piauí', 'p.piaui', 'p piaui'],
        'RJ': ['rio de janeiro', 'rj', 'riodejaneiro', 'r.janeiro', 'r janeiro'],
        'RN': ['rio grande do norte', 'rn', 'riograndedonorte', 'r.norte', 'r norte'],
        'RS': ['rio grande do sul', 'rs', 'riograndedosul', 'r.sul', 'r sul'],
        'RO': ['rondonia', 'ro'],
        'RR': ['roraima', 'rr'],
        'SC': ['santa catarina', 'sc', 'santacatarina'],
        'SP': ['sao paulo', 'sp', 'saopaulo', 'sampa', 'são paulo', 's.paulo', 's paulo', 'paulista'],
        'SE': ['sergipe', 'se'],
        'TO': ['tocantins', 'to']
    };

    let detectedCrop = null;
    let detectedState = null;
    let action = 'analyze';

    // Detectar cultura usando busca inteligente
    detectedCrop = findBestMatch(lowerMessage, cropMappings);

    // Detectar estado usando busca inteligente
    detectedState = findBestMatch(lowerMessage, stateMappings, true);

    // Debug para rastreamento detalhado
    console.log(`=== ANÁLISE DE COMANDO ===`);
    console.log(`Mensagem original: "${message}"`);
    console.log(`Mensagem processada: "${lowerMessage}"`);
    console.log(`Cultura detectada: ${detectedCrop}`);
    console.log(`Estado detectado: ${detectedState}`);

    // Verificar se o usuário solicitou análise nacional explicitamente
    const isNationalRequest = lowerMessage.includes('brasil') || 
                             lowerMessage.includes('nacional') || 
                             lowerMessage.includes('todo o brasil') ||
                             lowerMessage.includes('nivel nacional') ||
                             lowerMessage.includes('nível nacional') ||
                             (!detectedState && (lowerMessage.includes('analise') || lowerMessage.includes('mostre') || lowerMessage.includes('dados')));

    if (detectedState && !isNationalRequest) {
        console.log(`✅ Estado detectado: ${detectedState} na mensagem: "${lowerMessage}"`);
    } else if (isNationalRequest || !detectedState) {
        console.log(`🇧🇷 Análise nacional solicitada ou nenhum estado específico detectado`);
        detectedState = null; // Garantir análise nacional
    } else {
        console.log(`❌ Nenhum estado detectado na mensagem: "${lowerMessage}"`);
        // Mostrar palavras da mensagem para debug
        console.log(`Palavras na mensagem:`, lowerMessage.split(' '));
    }
    console.log(`=========================`);

    // Detectar ação com mais variações
    if (lowerMessage.includes('compare') || lowerMessage.includes('comparar') || 
        lowerMessage.includes('versus') || lowerMessage.includes('vs')) {
        action = 'compare';
    } else if (lowerMessage.includes('analise') || lowerMessage.includes('analisa') || 
               lowerMessage.includes('analizar') || lowerMessage.includes('estudo')) {
        action = 'analyze';
    } else if (lowerMessage.includes('mostre') || lowerMessage.includes('mostra') || 
               lowerMessage.includes('exibe') || lowerMessage.includes('apresente')) {
        action = 'show';
    }

    return {
        crop: detectedCrop,
        state: detectedState,
        action: action,
        originalMessage: message
    };
}

// Função auxiliar para encontrar a melhor correspondência
function findBestMatch(text, mappings, isStateMapping = false) {
    let bestMatch = null;
    let highestScore = 0;

    // Para estados, fazer busca mais específica primeiro
    if (isStateMapping) {
        // Busca direta por siglas (2 letras)
        const words = text.split(' ');
        for (const word of words) {
            const cleanWord = word.replace(/[^a-z]/g, ''); // Remove pontuação
            if (cleanWord.length === 2 && cleanWord.toUpperCase() in mappings) {
                console.log(`Estado encontrado por sigla: ${cleanWord.toUpperCase()}`);
                return cleanWord.toUpperCase();
            }
        }

        // Busca específica por palavras-chave dos estados
        const stateKeywords = {
            'parana': 'PR',
            'paraná': 'PR',
            'pernambuco': 'PE',
            'piaui': 'PI',
            'piauí': 'PI',
            'saopaulo': 'SP',
            'sao paulo': 'SP',
            'são paulo': 'SP',
            'riodejaneiro': 'RJ',
            'rio de janeiro': 'RJ',
            'minasgerais': 'MG',
            'minas gerais': 'MG',
            'riograndedosul': 'RS',
            'rio grande do sul': 'RS',
            'santacatarina': 'SC',
            'santa catarina': 'SC'
        };

        for (const [keyword, state] of Object.entries(stateKeywords)) {
            if (text.includes(keyword)) {
                console.log(`Estado encontrado por palavra-chave: ${keyword} -> ${state}`);
                return state;
            }
        }
    }

    for (const [key, variations] of Object.entries(mappings)) {
        for (const variation of variations) {
            const score = calculateMatchScore(text, variation);
            if (score > highestScore) {
                highestScore = score;
                bestMatch = key;
            }
        }
    }

    // Para estados, usar threshold mais baixo para melhor detecção
    const threshold = isStateMapping ? 0.4 : 0.5;
    const result = highestScore > threshold ? bestMatch : null;

    if (isStateMapping) {
        console.log(`Busca por estado - Melhor match: ${bestMatch}, Score: ${highestScore}, Threshold: ${threshold}, Resultado: ${result}`);
    }

    return result;
}

// Função para calcular pontuação de correspondência
function calculateMatchScore(text, term) {
    const words = text.split(' ');

    // Busca exata
    if (text.includes(term)) {
        return 1.0;
    }

    // Busca por palavra completa
    if (words.includes(term)) {
        return 0.9;
    }

    // Para siglas de 2 letras, dar prioridade alta
    if (term.length === 2) {
        for (const word of words) {
            if (word === term) {
                return 1.0;
            }
        }
    }

    // Busca por início de palavra
    for (const word of words) {
        if (word.startsWith(term) || term.startsWith(word)) {
            const similarity = Math.min(word.length, term.length) / Math.max(word.length, term.length);
            if (similarity > 0.7) {
                return 0.8 * similarity;
            }
        }
    }

    // Busca por substring com tolerância
    for (const word of words) {
        if (word.length >= 3 && term.length >= 3) {
            const commonLength = getCommonSubstringLength(word, term);
            const similarity = commonLength / Math.max(word.length, term.length);
            if (similarity > 0.6) {
                return 0.7 * similarity;
            }
        }
    }

    return 0;
}

// Função para calcular comprimento de substring comum
function getCommonSubstringLength(str1, str2) {
    let maxLength = 0;
    for (let i = 0; i < str1.length; i++) {
        for (let j = 0; j < str2.length; j++) {
            let length = 0;
            while (i + length < str1.length && 
                   j + length < str2.length && 
                   str1[i + length] === str2[j + length]) {
                length++;
            }
            maxLength = Math.max(maxLength, length);
        }
    }
    return maxLength;
}

// Buscar análise da cultura com mapeamento inteligente
async function fetchCropAnalysis(cropName, stateCode) {
    try {
        // Mapeamento de nomes de culturas para os nomes reais no sistema
        const cropNameMapping = {
            'soja': 'Soja (em grão)',
            'milho': 'Milho (em grão)',
            'banana': 'Banana (cacho)',
            'café': 'Café (em grão) Total',
            'cana-de-açúcar': 'Cana-de-açúcar',
            'arroz': 'Arroz (em casca)',
            'feijão': 'Feijão (em grão)',
            'algodão': 'Algodão herbáceo (em caroço)',
            'laranja': 'Laranja',
            'uva': 'Uva',
            'maçã': 'Maçã',
            'tomate': 'Tomate',
            'batata': 'Batata-inglesa',
            'mandioca': 'Mandioca'
        };

        // Tentar encontrar o nome real da cultura
        const realCropName = cropNameMapping[cropName.toLowerCase()] || cropName;

        // Buscar dados da cultura
        let response = await fetch(`/api/crop-data/${encodeURIComponent(realCropName)}`);
        let data = await response.json();

        // Se não encontrou, tentar com o nome original
        if (!data.success && realCropName !== cropName) {
            response = await fetch(`/api/crop-data/${encodeURIComponent(cropName)}`);
            data = await response.json();
        }

        // Se ainda não encontrou, tentar buscar por similaridade
        if (!data.success) {
            // Buscar lista de culturas disponíveis
            const cropsResponse = await fetch('/api/crops');
            const cropsData = await cropsResponse.json();

            if (cropsData.success) {
                const availableCrops = cropsData.crops;
                const similarCrop = findSimilarCropName(cropName, availableCrops);

                if (similarCrop) {
                    response = await fetch(`/api/crop-data/${encodeURIComponent(similarCrop)}`);
                    data = await response.json();

                    if (data.success) {
                        console.log(`Cultura encontrada por similaridade: ${cropName} -> ${similarCrop}`);
                    }
                }
            }
        }

        if (!data.success) {
            return { success: false };
        }

        let analysisData = data.data;

        // Filtrar por estado se especificado
        if (stateCode) {
            analysisData = Object.fromEntries(
                Object.entries(data.data).filter(([code, info]) => info.state_code === stateCode)
            );
        }

        // Buscar estatísticas
        const finalCropName = data.matched_crop || realCropName;
        
        try {
            const statsResponse = await fetch(`/api/analysis/statistical-summary/${encodeURIComponent(finalCropName)}`);
            const statsData = await statsResponse.json();
            
            return {
                success: true,
                cropData: analysisData,
                statistics: statsData.success ? statsData.summary : null,
                cropName: finalCropName,
                stateCode: stateCode
            };
        } catch (statsError) {
            console.warn('Erro ao buscar estatísticas, mas continuando sem elas:', statsError);
            return {
                success: true,
                cropData: analysisData,
                statistics: null,
                cropName: finalCropName,
                stateCode: stateCode
            };
        }

    } catch (error) {
        console.error('Erro ao buscar análise:', error);
        return { success: false, error: error.message };
    }
}

// Função para encontrar cultura similar na lista disponível
function findSimilarCropName(searchName, availableCrops) {
    const normalizedSearch = searchName.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    let bestMatch = null;
    let highestScore = 0;

    for (const crop of availableCrops) {
        const normalizedCrop = crop.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        // Verifica se o termo de busca está contido no nome da cultura
        if (normalizedCrop.includes(normalizedSearch) || normalizedSearch.includes(normalizedCrop)) {
            const score = Math.min(normalizedSearch.length, normalizedCrop.length) / 
                         Math.max(normalizedSearch.length, normalizedCrop.length);

            if (score > highestScore) {
                highestScore = score;
                bestMatch = crop;
            }
        }

        // Verifica correspondência por palavras
        const searchWords = normalizedSearch.split(' ');
        const cropWords = normalizedCrop.split(' ');

        for (const searchWord of searchWords) {
            for (const cropWord of cropWords) {
                if (searchWord.length >= 3 && cropWord.length >= 3) {
                    if (cropWord.includes(searchWord) || searchWord.includes(cropWord)) {
                        const score = Math.min(searchWord.length, cropWord.length) / 
                                     Math.max(searchWord.length, cropWord.length);

                        if (score > highestScore && score > 0.7) {
                            highestScore = score;
                            bestMatch = crop;
                        }
                    }
                }
            }
        }
    }

    return highestScore > 0.5 ? bestMatch : null;
}

// Gerar texto de análise
function generateAnalysisText(command, cropData) {
    const { cropName, stateCode } = cropData;
    const data = cropData.cropData;
    const stats = cropData.statistics;

    if (Object.keys(data).length === 0) {
        return `Não encontrei dados para a cultura "${cropName}"${stateCode ? ` no estado ${stateCode}` : ''}.`;
    }

    // Calcular estatísticas básicas - apenas municípios válidos
    const municipalities = Object.values(data);
    const validMunicipalities = municipalities.filter(m => m.harvested_area && m.harvested_area > 0);

    if (validMunicipalities.length === 0) {
        return `Não encontrei dados válidos para a cultura "${cropName}"${stateCode ? ` no estado ${stateCode}` : ''}.`;
    }

    const totalArea = validMunicipalities.reduce((sum, m) => sum + parseFloat(m.harvested_area), 0);
    const avgArea = totalArea / validMunicipalities.length;

    // Ordenar todos os municípios por área colhida (maior para menor)
    const sortedMunicipalities = validMunicipalities.sort((a, b) => 
        parseFloat(b.harvested_area) - parseFloat(a.harvested_area)
    );

    // Município com maior produção
    const topMunicipality = sortedMunicipalities[0];

    let analysisText = `📊 **Análise da Cultura: ${cropName.charAt(0).toUpperCase() + cropName.slice(1)}**\n\n`;

    if (stateCode) {
        analysisText += `🌍 **Estado:** ${stateCode}\n`;
    }

    analysisText += `📈 **Estatísticas Principais:**\n`;
    analysisText += `• **Municípios com dados:** ${validMunicipalities.length}\n`;
    analysisText += `• **Área total colhida:** ${formatNumber(totalArea)} hectares\n`;
    analysisText += `• **Área média por município:** ${formatNumber(avgArea)} hectares\n\n`;

    analysisText += `🏆 **Maior Produtor:**\n`;
    analysisText += `• **${topMunicipality.municipality_name}** (${topMunicipality.state_code})\n`;
    analysisText += `• **Área colhida:** ${formatNumber(topMunicipality.harvested_area)} hectares\n\n`;

    // Mostrar top 3 maiores produtores para validação
    if (sortedMunicipalities.length >= 3) {
        analysisText += `📋 **Top 3 Maiores Produtores:**\n`;
        for (let i = 0; i < 3; i++) {
            const municipality = sortedMunicipalities[i];
            analysisText += `${i + 1}. **${municipality.municipality_name}** (${municipality.state_code}): ${formatNumber(municipality.harvested_area)} ha\n`;
        }
        analysisText += `\n`;
    }

    if (stats) {
        analysisText += `📊 **Estatísticas Detalhadas:**\n`;
        analysisText += `• **Mediana:** ${formatNumber(stats.median)} hectares\n`;
        analysisText += `• **Desvio padrão:** ${formatNumber(stats.std_dev)} hectares\n`;
        analysisText += `• **Valor mínimo:** ${formatNumber(stats.min)} hectares\n`;
        analysisText += `• **Valor máximo:** ${formatNumber(stats.max)} hectares\n\n`;
    }

    analysisText += `🗺️ **Visualizando no mapa...** Os dados foram plotados automaticamente para sua análise visual.\n\n`;
    
    // Adicionar botão de download Excel
    analysisText += `📊 **Baixar Planilha Excel:**\n`;
    const stateParam = stateCode ? `'${stateCode}'` : 'null';
    analysisText += `<button onclick="downloadCropExcel('${cropName}', ${stateParam})" class="excel-download-btn" style="background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; margin: 10px 0; display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: all 0.3s ease;">`;
    analysisText += `<i class="fas fa-file-excel"></i> Baixar Análise Completa (.xlsx)`;
    analysisText += `</button>`;

    return analysisText;
}

// Executar ações do chatbot
async function executeChatbotActions(actions) {
    for (const action of actions) {
        if (action.type === 'plot_map') {
            await plotCropOnMap(action.crop, action.state, action.data);
        }
    }
}

// Plotar cultura no mapa
async function plotCropOnMap(cropName, stateCode, data) {
    try {
        // Criar nova camada
        const layerName = `${cropName}${stateCode ? ` - ${stateCode}` : ' - Nacional'}`;

        const layerData = {
            type: 'crop',
            name: layerName,
            crop: cropName,
            state: stateCode,
            color: getRandomColor(),
            visible: true
        };

        // Adicionar à lista de camadas ativas
        const layer = {
            id: layerIdCounter++,
            ...layerData
        };

        activeLayers.push(layer);

        // Aplicar camada no mapa
        await loadCropLayerForLayer(layer);

        // Atualizar interface
        updateLayersList();

        // Mostrar card analítico
        showAnalyticsCard(layer);

        console.log(`Camada "${layerName}" adicionada pelo chatbot`);

    } catch (error) {
        console.error('Erro ao plotar no mapa:', error);
    }
}

// Gerar cor aleatória
function getRandomColor() {
    const colors = [
        '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', 
        '#F44336', '#607D8B', '#795548', '#009688'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Formatar números
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toLocaleString('pt-BR', {maximumFractionDigits: 1}) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toLocaleString('pt-BR', {maximumFractionDigits: 1}) + 'K';
    } else {
        return num.toLocaleString('pt-BR', {maximumFractionDigits: 0});
    }
}

function addMessage(message, isUser = false) {
            const messagesContainer = document.getElementById('chatbot-messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;

            if (isUser) {
                messageDiv.innerHTML = `<div class="message-content">${message}</div>`;
            } else {
                messageDiv.innerHTML = `
                    <div class="bot-avatar">🤖</div>
                    <div class="message-content">${message}</div>
                `;
            }

            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            return messageDiv;
        }

        // Function to export crop analysis to Excel
        async function exportCropAnalysis(cropName) {
            try {
                // Show loading state
                const button = event.target;
                const originalText = button.innerHTML;
                button.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Preparando...';
                button.disabled = true;

                // Make request to export endpoint
                const response = await fetch(`/api/export/crop-analysis/${encodeURIComponent(cropName)}`);

                if (!response.ok) {
                    throw new Error('Erro ao gerar planilha');
                }

                // Get the blob and create download link
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;

                // Generate filename
                const safeCropName = cropName.replace(/[/\\:*?"<>|]/g, '_');
                const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
                a.download = `analise_${safeCropName}_${timestamp}.xlsx`;

                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                // Show success message
                addMessage(`✅ Planilha da análise de <strong>${cropName}</strong> baixada com sucesso! O arquivo contém dados detalhados, resumo estatístico e ranking dos maiores produtores.`);

            } catch (error) {
                console.error('Erro no download:', error);
                addMessage(`❌ Erro ao baixar planilha: ${error.message}`);
            } finally {
                // Restore button
                const button = event.target;
                button.innerHTML = '<i class="fas fa-file-excel me-1"></i>Baixar Planilha Excel';
                button.disabled = false;
            }
        }

// Função para download de Excel via chatbot
async function downloadCropExcel(cropName, stateCode = null) {
    const button = event.target;
    const originalHTML = button.innerHTML;
    
    try {
        // Mostrar loading no botão
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparando...';
        button.disabled = true;
        button.style.opacity = '0.7';

        // Construir URL com parâmetro de estado se necessário
        let exportUrl = `/api/export/crop-analysis/${encodeURIComponent(cropName)}`;
        if (stateCode) {
            exportUrl += `?state=${stateCode}`;
        }

        // Fazer requisição para o endpoint de exportação
        const response = await fetch(exportUrl);

        if (!response.ok) {
            throw new Error('Erro ao gerar planilha');
        }

        // Obter o blob e criar link de download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;

        // Gerar nome do arquivo
        const safeCropName = cropName.replace(/[/\\:*?"<>|]/g, '_');
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        a.download = `analise_${safeCropName}_${timestamp}.xlsx`;

        document.body.appendChild(a);
        a.click();
        
        // Aguardar um pouco para garantir que o download foi iniciado
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Mostrar mensagem de sucesso no chat
        const stateInfo = stateCode ? ` do estado <strong>${stateCode}</strong>` : ' nacional';
        addChatMessage(`✅ Planilha da análise${stateInfo} de <strong>${cropName}</strong> baixada com sucesso! O arquivo contém dados detalhados, resumo estatístico e ranking dos maiores produtores.`, 'bot');

    } catch (error) {
        console.error('Erro no download:', error);
        addChatMessage(`❌ Erro ao baixar planilha: ${error.message}`, 'bot');
    } finally {
        // Restaurar botão sempre - garantir que seja executado
        button.innerHTML = '<i class="fas fa-file-excel"></i> Baixar Análise Completa (.xlsx)';
        button.disabled = false;
        button.style.opacity = '1';
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    initializeChatbot();
});

// Exportar funções globais
window.toggleChatbot = toggleChatbot;
window.sendChatbotMessage = sendChatbotMessage;
window.handleChatbotKeypress = handleChatbotKeypress;
window.downloadCropExcel = downloadCropExcel;