"use strict";
// /opt/beget/n8n/n8n_custom_nodes/nodes/RvfLLM/methods/loadOptions.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RvfLLMLoadOptions = void 0;
const axios_1 = __importDefault(require("axios"));
class RvfLLMLoadOptions {
    static async loadProviders() {
        // В методах loadOptions getNodeParameter возвращает текущее значение параметра из UI.
        // Не передаем второй аргумент (itemIndex), так как работаем с настройками узла, а не с данными.
        let resource;
        try {
            resource = this.getNodeParameter('resource');
        }
        catch (error) {
            // Если параметр еще не задан или ошибка доступа, берем дефолт
            resource = 'text';
        }
        const credentials = await this.getCredentials('rvfLLMApi');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cred = credentials;
        const baseUrl = cred?.baseUrl || 'https://rvlautoai.ru/webhook';
        try {
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
                // Страховка
                if (!p.capabilities)
                    return false;
                // Фильтруем по выбранному ресурсу (text, image, audio, video)
                return p.capabilities[resource] === true;
            })
                .sort((a, b) => (a.performance?.avg_latency_ms || 0) - (b.performance?.avg_latency_ms || 0))
                .map((p) => ({
                name: p.name || p.id,
                value: p.id, // Используем ID как value
            }));
            return result;
        }
        catch (error) {
            console.error('Error loading providers:', error);
            return [];
        }
    }
    static async loadModels() {
        let resource;
        let provider;
        try {
            resource = this.getNodeParameter('resource');
            provider = this.getNodeParameter('provider');
        }
        catch (error) {
            // Если параметры не заданы, модели загрузить нельзя
            return [];
        }
        if (!provider)
            return [];
        const credentials = await this.getCredentials('rvfLLMApi');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cred = credentials;
        const baseUrl = cred?.baseUrl || 'https://rvlautoai.ru/webhook';
        try {
            const response = await axios_1.default.get(`${baseUrl}/v1/models`, {
                // Передаем provider как query параметр, если API это поддерживает фильтрацию
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
                // Строгая фильтрация: категория должна совпадать с ресурсом, провайдер - с выбранным
                return m.category === resource && m.provider === provider;
            })
                .sort((a, b) => (a.latency_ms || 0) - (b.latency_ms || 0))
                .map((m) => ({
                name: m.id, // Отображаемое имя
                value: m.id, // Значение (ID модели)
            }));
            return result;
        }
        catch (error) {
            console.error('Error loading models:', error);
            return [];
        }
    }
}
exports.RvfLLMLoadOptions = RvfLLMLoadOptions;
//# sourceMappingURL=loadOptions.js.map