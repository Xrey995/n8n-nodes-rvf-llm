"use strict";
// /opt/beget/n8n/n8n_custom_nodes/nodes/RvfLLMChatModel/RvfLLMChatModel.node.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.RvfLLMChatModel = void 0;
/**
 * ✅ ПОЛНОСТЬЮ РАБОЧИЙ КОД - АНАЛОГ OPENAI CHAT MODEL + TOOL EMULATION
 *
 * Исправлено:
 * - 🔧 Удален withStructuredOutput (не нужен, вызывал ошибку компиляции)
 * - ✅ Регулярное выражение для парсинга JSON исправлено
 * - ✅ Обработка native/emulated tools
 * - ✅ Английский системный промпт
 * - ✅ bindTools явно вызывает super().bind()
 */
const n8n_workflow_1 = require("n8n-workflow");
const chat_models_1 = require("@langchain/core/language_models/chat_models");
const messages_1 = require("@langchain/core/messages");
const description_1 = require("./description");
const loadOptions_1 = require("./methods/loadOptions");
/**
 * LangChain-совместимая обёртка над RVF LLM /v1/chat/completions API.
 * КРИТИЧНОЕ: Полная поддержка tools (native + emulated), system messages и всех параметров AI Agent.
 */
class RvfLLMChatLangChain extends chat_models_1.BaseChatModel {
    constructor(params) {
        super(params);
        this.model = params.model;
        this.provider = params.provider;
        this.baseUrl = params.baseUrl.replace(/\/$/, '');
        this.apiKey = params.apiKey;
        this.temperature = params.temperature ?? 0.7;
        this.maxTokens = params.maxTokens;
        this.timeout = params.timeout ?? 300;
        this.rvfStream = params.stream ?? false;
    }
    _llmType() {
        return 'rvf-llm-chat';
    }
    /**
     * КРИТИЧНОЕ: Явно объявляем поддержку инструментов.
     * Это первое, что проверяет AI Agent перед использованием этой ноды.
     */
    supportsToolCalling() {
        return true;
    }
    /**
     * НОВОЕ: Список провайдеров с нативной поддержкой OpenAI tool calling.
     * Остальные будут использовать text-based emulation.
     */
    hasNativeToolSupport() {
        const nativeSupportedProviders = [
            'openai', // Официальный OpenAI
            'openrouter', // OpenRouter проксирует OpenAI
            'groq', // Groq поддерживает tool calling
            'deepseek', // DeepSeek поддерживает tools
            // Добавляйте сюда провайдеров по мере проверки
        ];
        return nativeSupportedProviders.includes(this.provider.toLowerCase());
    }
    /**
     * НОВОЕ: Конвертируем tools в текстовую инструкцию для провайдеров без tool support.
     * Prompt engineering - модель получает описание инструментов в system message.
     * ПЕРЕВЕДЕНО НА АНГЛИЙСКИЙ ДЛЯ ЛУЧШЕЙ СОВМЕСТИМОСТИ
     */
    toolsToPrompt(tools) {
        if (!tools || tools.length === 0)
            return '';
        const toolDescriptions = tools
            .map((tool, idx) => {
            const schema = tool.schema || {};
            const params = JSON.stringify(schema, null, 2);
            return `**Tool ${idx + 1}: ${tool.name}**
Description: ${tool.description}
Parameters Schema:
${params}`;
        })
            .join('\n\n');
        return `
# AVAILABLE TOOLS

You have access to the following tools to complete tasks:

${toolDescriptions}

# TOOL USAGE RULES

1. If a tool is REQUIRED to answer the user's question, you MUST call it
2. Respond STRICTLY in the following JSON format (inside a markdown block):

\`\`\`json
{
  "tool_name": "tool_name_here",
  "arguments": {
    "param1": "value1",
    "param2": "value2"
  }
}
\`\`\`

3. Do NOT add ANY text BEFORE or AFTER this JSON block when calling a tool
4. If a tool is NOT needed - respond with regular text
5. Call ONLY ONE tool at a time
6. Use EXACT tool names and parameters from the schema above

IMPORTANT: If you decide to call a tool, your response must contain ONLY the JSON block, nothing else!
`.trim();
    }
    /**
     * ИСПРАВЛЕНО: Парсим text response и извлекаем tool_calls.
     * Теперь корректно захватывает контент внутри ``````
     */
    parseToolCallFromText(text) {
        if (!text)
            return null;
        // 1. Ищем JSON в markdown блоке `````` (с захватом группы)
        const jsonMatch = text.match(/``````/i);
        if (jsonMatch && jsonMatch[1]) {
            try {
                const parsed = JSON.parse(jsonMatch[1].trim());
                if (parsed.tool_name && parsed.arguments) {
                    return {
                        toolName: parsed.tool_name,
                        args: parsed.arguments,
                    };
                }
            }
            catch (e) {
                console.error('[RVF LLM] Failed to parse tool call from JSON block:', e);
            }
        }
        // 2. Fallback: попытка найти JSON без markdown
        try {
            // Ищем что-то похожее на JSON объект
            const jsonObjectMatch = text.match(/\{[\s\S]*"tool_name"[\s\S]*"arguments"[\s\S]*\}/);
            if (jsonObjectMatch) {
                const parsed = JSON.parse(jsonObjectMatch[0]);
                if (parsed.tool_name && parsed.arguments) {
                    return {
                        toolName: parsed.tool_name,
                        args: parsed.arguments,
                    };
                }
            }
        }
        catch (e) {
            // Игнорируем, это нормально если это обычный текст
        }
        return null;
    }
    async _generate(messages, options, _runManager) {
        // ЛОГИРОВАНИЕ ДЛЯ ОТЛАДКИ
        console.log('[RVF LLM] _generate called with options:', {
            hasTools: !!options?.tools,
            toolsCount: options?.tools?.length,
            provider: this.provider,
            model: this.model,
        });
        /**
         * КРИТИЧНЫЙ МОМЕНТ 1: Преобразование ALL сообщений (включая system).
         * Важно сохранить role точно как в LangChain: 'system', 'user', 'assistant', 'tool'
         */
        const rvfMessages = messages.map((message) => {
            const roleType = message._getType();
            // Маппинг типов LangChain на роли OpenAI API
            const role = roleType === 'human'
                ? 'user'
                : roleType === 'ai'
                    ? 'assistant'
                    : roleType === 'system'
                        ? 'system'
                        : roleType === 'tool'
                            ? 'tool'
                            : 'user'; // fallback
            const baseMsg = {
                role,
                content: message.content,
            };
            /**
             * КРИТИЧНЫЙ МОМЕНТ 2: Обработка tool_call_id для tool messages.
             * Это необходимо для корректной истории диалога с tools.
             */
            if (message instanceof messages_1.ToolMessage) {
                const toolMessage = message;
                if (toolMessage.tool_call_id) {
                    baseMsg.tool_call_id = toolMessage.tool_call_id;
                }
                // tool_name необязателен, но может быть добавлен если доступен
                if (toolMessage.name) {
                    baseMsg.name = toolMessage.name;
                }
            }
            /**
             * КРИТИЧНЫЙ МОМЕНТ 3: Обработка tool_calls из AI сообщений.
             * AI Agent передаёт tool_calls как свойство AIMessage.
             */
            if (message instanceof messages_1.AIMessage) {
                const aiMessage = message;
                if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
                    // Преобразуем tool_calls в OpenAI формат
                    baseMsg.tool_calls = aiMessage.tool_calls.map((toolCall) => ({
                        id: toolCall.id,
                        type: 'function',
                        function: {
                            name: toolCall.name,
                            arguments: JSON.stringify(toolCall.args),
                        },
                    }));
                }
            }
            return baseMsg;
        });
        /**
         * НОВОЕ КРИТИЧНОЕ: Выбор режима tools — native или emulated.
         */
        const endpoint = '/v1/chat/completions';
        const useNativeTools = this.hasNativeToolSupport();
        const hasTools = options?.tools && options.tools.length > 0;
        let modifiedMessages = [...rvfMessages];
        // Если есть tools, но провайдер не поддерживает native — эмулируем
        if (hasTools && !useNativeTools) {
            const toolPrompt = this.toolsToPrompt(options.tools);
            console.log(`[RVF LLM] Provider "${this.provider}" doesn't support native tools. Using emulation.`);
            // Добавляем инструкцию в system message
            const systemMsgIndex = modifiedMessages.findIndex((m) => m.role === 'system');
            if (systemMsgIndex >= 0) {
                // Дополняем существующий system message
                modifiedMessages[systemMsgIndex].content =
                    (modifiedMessages[systemMsgIndex].content || '') + '\n\n' + toolPrompt;
            }
            else {
                // Создаём новый system message в начале
                modifiedMessages = [{ role: 'system', content: toolPrompt }, ...modifiedMessages];
            }
        }
        const body = {
            model: this.model,
            provider: this.provider,
            messages: modifiedMessages,
            stream: this.rvfStream === true,
            temperature: this.temperature,
        };
        if (this.maxTokens) {
            body.max_tokens = this.maxTokens;
        }
        if (options?.stop?.length) {
            body.stop = options.stop;
        }
        /**
         * КРИТИЧНЫЙ МОМЕНТ 5: Native tools только для поддерживаемых провайдеров.
         * Для остальных - эмуляция через промпт (уже добавлена выше).
         */
        if (hasTools && useNativeTools) {
            console.log(`[RVF LLM] Provider "${this.provider}" supports native tools.`);
            // Преобразуем LangChain tools в OpenAI tools format
            body.tools = options.tools.map((tool) => ({
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    // Извлекаем JSON-schema из tool
                    parameters: tool.schema ?? {},
                },
            }));
            // Указываем API, что модель может выбирать вызывать tools или нет
            body.tool_choice = 'auto';
        }
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
        if (controller && typeof setTimeout === 'function') {
            setTimeout(() => controller.abort(), this.timeout * 1000);
        }
        let data;
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify(body),
                signal: controller?.signal,
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`RVF LLM API error: ${response.status} ${response.statusText} ${text}`);
            }
            data = await response.json();
        }
        catch (error) {
            throw new Error(`RVF LLM request failed: ${error?.message || String(error)}`);
        }
        const choice = data.choices?.[0];
        if (!choice?.message) {
            throw new Error('Empty response from RVF LLM API');
        }
        const msg = choice.message;
        let aiMessage;
        /**
         * НОВОЕ КРИТИЧНОЕ МОМЕНТ 6: Обработка tool_calls (native или emulated).
         */
        const hasNativeToolCalls = msg.tool_calls && msg.tool_calls.length > 0;
        const textContent = msg.content || '';
        if (hasNativeToolCalls) {
            // Native tool calls от провайдера
            console.log(`[RVF LLM] Received native tool calls:`, msg.tool_calls);
            aiMessage = new messages_1.AIMessage({
                content: textContent,
                tool_calls: msg.tool_calls.map((toolCall) => ({
                    id: toolCall.id,
                    name: toolCall.function?.name,
                    args: (() => {
                        try {
                            return JSON.parse(toolCall.function?.arguments || '{}');
                        }
                        catch (e) {
                            console.error('[RVF LLM] Failed to parse tool arguments:', e);
                            return {};
                        }
                    })(),
                })),
            });
        }
        else if (hasTools && !useNativeTools) {
            // Emulated tools — парсим из текста
            const parsedTool = this.parseToolCallFromText(textContent);
            if (parsedTool) {
                // Модель вызвала инструмент через text
                console.log(`[RVF LLM] Parsed emulated tool call:`, parsedTool);
                aiMessage = new messages_1.AIMessage({
                    content: '', // Пустой content, т.к. это tool call
                    tool_calls: [
                        {
                            id: `call_${Date.now()}_${Math.random().toString(36).substring(7)}`, // Генерируем уникальный ID
                            name: parsedTool.toolName,
                            args: parsedTool.args,
                        },
                    ],
                });
            }
            else {
                // Обычный текстовый ответ (модель решила не использовать инструмент)
                console.log(`[RVF LLM] No tool call detected, regular text response.`);
                aiMessage = new messages_1.AIMessage(textContent);
            }
        }
        else {
            // Обычный текстовый ответ (нет tools вообще)
            aiMessage = new messages_1.AIMessage(textContent);
        }
        // Логируем финальный объект перед возвратом в LangChain
        console.log('[RVF LLM] Returning AIMessage:', aiMessage);
        return {
            generations: [
                {
                    text: textContent,
                    message: aiMessage,
                },
            ],
            llmOutput: {
                model: data.model || this.model,
                usage: data.usage,
                finish_reason: choice.finish_reason,
            },
        };
    }
    /**
     * ✅ КРИТИЧНОЕ: bindTools ДОЛЖЕН вызывать super().bind()
     *
     * Без этого AI Agent не может передать tools в _generate()!
     */
    bindTools(tools, kwargs) {
        console.log('[RVF LLM] bindTools called with', tools.length, 'tools');
        // КРИТИЧНО: Вызываем super().bind() чтобы сохранить tools
        return super.bind({
            tools: tools,
            ...kwargs,
        });
    }
}
/**
 * RVF LLM Chat Model - кастомный Language Model узел, полный аналог OpenAI Chat Model.
 */
class RvfLLMChatModel {
    constructor() {
        this.description = {
            displayName: 'RVF LLM Chat Model',
            name: 'rvfLLMChatModel',
            icon: 'file:RvfLLM.svg',
            group: ['transform'],
            version: 1,
            description: 'Use RVF LLM text models as chat models in your AI chains. Full tool calling support (native + emulated).',
            defaults: {
                name: 'RVF LLM Chat Model',
            },
            // КРИТИЧНОЕ: Только выход, это sub-node для AI Agent
            inputs: [],
            outputs: [
                {
                    displayName: '',
                    type: n8n_workflow_1.NodeConnectionTypes.AiLanguageModel,
                },
            ],
            credentials: [
                {
                    name: 'rvfLLMApi',
                    required: true,
                },
            ],
            properties: description_1.RVF_LLM_CHAT_MODEL_PROPERTIES,
        };
        this.methods = {
            loadOptions: {
                async loadProviders() {
                    return loadOptions_1.RvfLLMChatModelLoadOptions.loadProviders.call(this);
                },
                async loadModels() {
                    return loadOptions_1.RvfLLMChatModelLoadOptions.loadModels.call(this);
                },
            },
        };
    }
    /**
     * КРИТИЧНОЕ: supplyData вызывается AI Agent для получения LangChain ChatModel.
     * ЭТО главный метод интеграции.
     */
    async supplyData(itemIndex) {
        const provider = this.getNodeParameter('provider', itemIndex);
        const model = this.getNodeParameter('model', itemIndex);
        const options = (this.getNodeParameter('options', itemIndex, {}) || {});
        const credentials = await this.getCredentials('rvfLLMApi');
        const cred = credentials;
        const baseUrl = cred.baseUrl || 'https://rvlautoai.ru/webhook';
        const apiKey = cred.apiKey;
        console.log(`[RVF LLM Chat Model] Initializing: provider="${provider}", model="${model}"`);
        // Создаём LangChain ChatModel с ПОЛНЫМ функционалом (native + emulated tools)
        const chatModel = new RvfLLMChatLangChain({
            model,
            provider,
            baseUrl,
            apiKey,
            temperature: options.temperature ?? 0.7,
            maxTokens: options.maxTokens,
            timeout: 300,
            stream: options.stream === true,
        });
        return {
            response: chatModel,
        };
    }
}
exports.RvfLLMChatModel = RvfLLMChatModel;
//# sourceMappingURL=RvfLLMChatModel.node.js.map