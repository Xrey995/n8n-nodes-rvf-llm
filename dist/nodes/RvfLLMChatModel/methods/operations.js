"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RvfLLMOperations = void 0;
const axios_1 = __importDefault(require("axios"));
class RvfLLMOperations {
    static async sendRequest(method, endpoint, data, credentials) {
        try {
            const baseUrl = credentials.baseUrl || 'https://rvlautoai.ru/webhook';
            const url = `${baseUrl}${endpoint}`;
            const config = {
                method: method,
                url,
                headers: {
                    Authorization: `Bearer ${credentials.apiKey}`,
                    'Content-Type': 'application/json',
                },
                data: method !== 'GET' ? data : undefined,
            };
            const response = await (0, axios_1.default)(config);
            return response.data;
        }
        catch (error) {
            throw new Error(`API request failed: ${error.response?.data?.error?.message || error.message}`);
        }
    }
    static formatResponse(response, simplifyOutput) {
        if (simplifyOutput && response.choices && response.choices.length > 0) {
            return {
                text: response.choices[0]?.message?.content || '',
                role: response.choices[0]?.message?.role || 'assistant',
                finishReason: response.choices[0]?.finish_reason || 'stop',
            };
        }
        return response;
    }
    static handleError(error) {
        if (error.response) {
            return `Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
        }
        return `Error: ${error.message}`;
    }
}
exports.RvfLLMOperations = RvfLLMOperations;
//# sourceMappingURL=operations.js.map