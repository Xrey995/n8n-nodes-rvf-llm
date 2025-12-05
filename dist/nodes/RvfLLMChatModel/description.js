"use strict";
// /opt/beget/n8n/n8n_custom_nodes/nodes/RvfLLMChatModel/description.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.RVF_LLM_CHAT_MODEL_PROPERTIES = void 0;
exports.RVF_LLM_CHAT_MODEL_PROPERTIES = [
    // 1. Провайдер (как в узле 1)
    {
        displayName: 'Provider',
        name: 'provider',
        type: 'options',
        noDataExpression: true,
        typeOptions: {
            loadOptionsMethod: 'loadProviders',
        },
        required: true,
        default: '',
        placeholder: 'Select a provider...',
        description: 'AI provider loaded from RVF LLM API. Only text-capable providers are shown.',
    },
    // 2. Модель (как в узле 1)
    {
        displayName: 'Model',
        name: 'model',
        type: 'options',
        noDataExpression: true,
        typeOptions: {
            loadOptionsMethod: 'loadModels',
            loadOptionsDependsOn: ['provider'],
        },
        required: true,
        default: '',
        placeholder: 'Select a model...',
        description: 'Model loaded from RVF LLM API, filtered by provider and text capability.',
    },
    // 3. Use Responses API (аналог OpenAI Chat Model)
    {
        displayName: 'Use Responses API',
        name: 'useResponsesApi',
        type: 'boolean',
        default: true,
        description: 'If enabled, use the OpenAI-compatible /v1/responses endpoint instead of /v1/chat/completions.',
    },
    // 4. Built-in Tools – Web Search / File Search / Code Interpreter
    {
        displayName: 'Built-in Tools',
        name: 'builtInTools',
        type: 'collection',
        placeholder: 'Add Built-in Tool',
        default: {},
        options: [
            {
                displayName: 'Web Search',
                name: 'webSearch',
                type: 'boolean',
                default: false,
                description: 'Enable web search tool for the model.',
            },
            {
                displayName: 'File Search',
                name: 'fileSearch',
                type: 'boolean',
                default: false,
                description: 'Enable file / knowledge base search tool.',
            },
            {
                displayName: 'Code Interpreter',
                name: 'codeInterpreter',
                type: 'boolean',
                default: false,
                description: 'Enable code interpreter tool for advanced reasoning.',
            },
        ],
    },
    // 5. Options – подмножество опций из узла 1 + флаг stream
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        options: [
            {
                displayName: 'Temperature',
                name: 'temperature',
                type: 'number',
                typeOptions: {
                    minValue: 0,
                    maxValue: 2,
                    numberPrecision: 0.1,
                },
                default: 0.7,
                description: 'Controls randomness of the output (0 = deterministic, 2 = very random).',
            },
            {
                displayName: 'Max Tokens',
                name: 'maxTokens',
                type: 'number',
                typeOptions: {
                    minValue: 1,
                    maxValue: 200000,
                },
                default: 2000,
                description: 'Maximum number of tokens in the response.',
            },
            {
                displayName: 'Top P',
                name: 'topP',
                type: 'number',
                typeOptions: {
                    minValue: 0,
                    maxValue: 1,
                    numberPrecision: 0.1,
                },
                default: 1,
                description: 'Nucleus sampling parameter.',
            },
            {
                displayName: 'Frequency Penalty',
                name: 'frequencyPenalty',
                type: 'number',
                typeOptions: {
                    minValue: -2,
                    maxValue: 2,
                    numberPrecision: 0.1,
                },
                default: 0,
            },
            {
                displayName: 'Presence Penalty',
                name: 'presencePenalty',
                type: 'number',
                typeOptions: {
                    minValue: -2,
                    maxValue: 2,
                    numberPrecision: 0.1,
                },
                default: 0,
            },
            {
                displayName: 'Stream Response',
                name: 'stream',
                type: 'boolean',
                default: false,
                description: 'Stream the response if supported by the provider (server-side streaming).',
            },
            {
                displayName: 'Simplify Output',
                name: 'simplifyOutput',
                type: 'boolean',
                default: true,
                description: 'Return only the main message text instead of the full raw response.',
            },
        ],
    },
];
//# sourceMappingURL=description.js.map