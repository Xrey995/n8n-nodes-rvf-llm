"use strict";
// /opt/beget/n8n/n8n_custom_nodes/nodes/RvfLLM/RvfLLM.node.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.RvfLLM = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const description_1 = require("./description");
const loadOptions_1 = require("./methods/loadOptions");
const operations_1 = require("./methods/operations");
class RvfLLM {
    constructor() {
        this.description = {
            displayName: 'RVF LLM',
            name: 'rvfLLM',
            icon: 'file:RvfLLM.svg',
            group: ['transform'],
            version: 1,
            description: 'Generate text, images, audio, or video using RVF LLM API',
            defaults: {
                name: 'RVF LLM',
            },
            // ВАЖНО: Добавляем AiTool во входы, чтобы появился коннектор Tools
            inputs: [
                {
                    displayName: '',
                    type: n8n_workflow_1.NodeConnectionTypes.Main,
                },
                {
                    displayName: 'Tools',
                    type: n8n_workflow_1.NodeConnectionTypes.AiTool,
                    maxConnections: 10, // Разрешаем несколько инструментов
                    required: false // Инструменты не обязательны
                },
            ],
            outputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            credentials: [
                {
                    name: 'rvfLLMApi',
                    required: true,
                },
            ],
            properties: description_1.RVF_LLM_PROPERTIES,
        };
        this.methods = {
            loadOptions: {
                async loadProviders() {
                    return loadOptions_1.RvfLLMLoadOptions.loadProviders.call(this);
                },
                async loadModels() {
                    return loadOptions_1.RvfLLMLoadOptions.loadModels.call(this);
                },
            },
        };
    }
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const credentials = await this.getCredentials('rvfLLMApi');
        if (!credentials) {
            throw new Error('RVF LLM credentials not configured');
        }
        for (let i = 0; i < items.length; i++) {
            try {
                const resource = this.getNodeParameter('resource', i);
                const operation = this.getNodeParameter('operation', i);
                if (operation !== 'generate') {
                    throw new Error(`Unsupported operation: ${operation}`);
                }
                const provider = this.getNodeParameter('provider', i);
                const model = this.getNodeParameter('model', i);
                const messages = this.getNodeParameter('messages.message', i, []) || [];
                const options = this.getNodeParameter('options', i, {});
                // Обработка встроенных инструментов
                const builtInTools = this.getNodeParameter('builtInTools', i, {});
                // Обработка подключенных Tools (через коннектор)
                // В рамках Action-ноды мы не можем напрямую вызывать эти тулзы так, как это делает Agent.
                // Обычно Action-нода просто отправляет определения тулзов в API.
                // Но для совместимости с OpenAI Action, мы можем получить данные о тулзах, если они подключены.
                // В текущей реализации API /v1/chat/completions поддерживает tools definitions.
                // Получение подключенных инструментов требует использования getConnectedTools (если доступно)
                // или специфической логики, но для Action ноды (не Агента) это редко используется напрямую.
                // Однако, наличие входа AiTool выполнит требование по визуальному коннектору.
                const temperature = options.temperature ?? 0.7;
                const maxTokens = options.maxTokens ?? 2000;
                const topP = options.topP ?? 1;
                const simplifyOutput = options.simplifyOutput ?? true;
                const requestBody = {
                    resource,
                    provider,
                    model,
                    messages: messages.map((m) => ({
                        role: m.role,
                        content: m.content,
                    })),
                    temperature,
                    max_tokens: maxTokens,
                    top_p: topP,
                };
                if (options.frequencyPenalty !== undefined) {
                    requestBody.frequency_penalty = options.frequencyPenalty;
                }
                if (options.presencePenalty !== undefined) {
                    requestBody.presence_penalty = options.presencePenalty;
                }
                if (options.stream) {
                    requestBody.stream = true;
                }
                // Формируем built_in_tools
                if (builtInTools.webSearch ||
                    builtInTools.fileSearch ||
                    builtInTools.codeInterpreter) {
                    requestBody.built_in_tools = {
                        web_search: !!builtInTools.webSearch,
                        file_search: !!builtInTools.fileSearch,
                        code_interpreter: !!builtInTools.codeInterpreter,
                    };
                }
                // Здесь можно добавить логику для сбора определений подключенных Tools,
                // если API RVF поддерживает прием кастомных tools JSON схем.
                // Пока оставляем только встроенные, но коннектор уже есть.
                const endpoint = '/v1/chat/completions';
                const apiResponse = await operations_1.RvfLLMOperations.sendRequest('POST', endpoint, requestBody, credentials);
                const formatted = operations_1.RvfLLMOperations.formatResponse(apiResponse, simplifyOutput);
                returnData.push({
                    json: formatted,
                });
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: error.message } });
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
exports.RvfLLM = RvfLLM;
//# sourceMappingURL=RvfLLM.node.js.map