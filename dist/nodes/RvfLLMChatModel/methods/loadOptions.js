"use strict";
// /opt/beget/n8n/n8n_custom_nodes/nodes/RvfLLMChatModel/methods/loadOptions.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RvfLLMChatModelLoadOptions = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * LoadOptions для RVF LLM Chat Model.
 * По сути копия RvfLLMLoadOptions, но resource всегда = 'text'. [file:208]
 */
class RvfLLMChatModelLoadOptions {
    static async loadProviders() {
        // Для Chat Model работаем только с текстовыми моделями.
        const resource = 'text';
        const credentials = await this.getCredentials('rvfLLMApi');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cred = credentials;
        const baseUrl = cred?.baseUrl || 'https://rvlautoai.ru/webhook';
        const response = await axios_1.default.get(`${baseUrl}/v1/providers`, {
            headers: {
                'Content-Type': 'application/json',
                ...(cred?.apiKey
                    ? {
                        Authorization: `Bearer ${cred.apiKey}`,
                    }
                    : {}),
                'X-API-Version': '1.0',
            },
        });
        const providers = response.data?.data ?? [];
        const result = providers
            .filter((p) => {
            if (!p.capabilities)
                return false;
            // Только те, кто умеет text. [file:208]
            return p.capabilities[resource] === true;
        })
            .sort((a, b) => (a.performance?.avg_latency_ms || 0) -
            (b.performance?.avg_latency_ms || 0))
            .map((p) => ({
            name: p.name || p.id,
            value: p.name || p.id,
        }));
        return result;
    }
    static async loadModels() {
        const resource = 'text';
        const provider = this.getNodeParameter('provider', 0);
        if (!provider)
            return [];
        const credentials = await this.getCredentials('rvfLLMApi');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cred = credentials;
        const baseUrl = cred?.baseUrl || 'https://rvlautoai.ru/webhook';
        const response = await axios_1.default.get(`${baseUrl}/v1/models`, {
            params: { provider },
            headers: {
                'Content-Type': 'application/json',
                ...(cred?.apiKey
                    ? {
                        Authorization: `Bearer ${cred.apiKey}`,
                    }
                    : {}),
                'X-API-Version': '1.0',
            },
        });
        const models = response.data?.data ?? [];
        const result = models
            .filter((m) => {
            if (!m.category || !m.provider)
                return false;
            return m.category === resource && m.provider === provider;
        })
            .sort((a, b) => (a.latency_ms || 0) - (b.latency_ms || 0))
            .map((m) => ({
            name: m.id,
            value: m.id,
        }));
        return result;
    }
}
exports.RvfLLMChatModelLoadOptions = RvfLLMChatModelLoadOptions;
//# sourceMappingURL=loadOptions.js.map