"use strict";
// /opt/beget/n8n/n8n_custom_nodes/credentials/RvfLLM.credentials.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.RvfLLM = void 0;
class RvfLLM {
    constructor() {
        // Идентификатор типа кредов, по нему обращается нода
        this.name = 'rvfLLMApi';
        this.displayName = 'RVF LLM API';
        this.documentationUrl = 'https://docs.rvlautoai.ru/api';
        this.icon = 'file:RvfLLM.svg';
        this.properties = [
            {
                displayName: 'API Key (Bearer Token)',
                name: 'apiKey',
                type: 'string',
                typeOptions: {
                    password: true,
                },
                required: true,
                default: '',
                description: 'Your RVF LLM Bearer Token (starts with rvf_)',
                placeholder: 'rvf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
            },
            {
                displayName: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                required: true,
                default: 'https://rvlautoai.ru/webhook',
                description: 'The base URL for RVF LLM API',
            },
        ];
        this.authenticate = {
            type: 'generic',
            properties: {
                headers: {
                    Authorization: '=Bearer {{$credentials.apiKey}}',
                },
            },
        };
        this.test = {
            request: {
                baseURL: '={{$credentials.baseUrl}}',
                url: '/v1/providers',
                method: 'GET',
            },
        };
    }
}
exports.RvfLLM = RvfLLM;
//# sourceMappingURL=RvfLLM.credentials.js.map