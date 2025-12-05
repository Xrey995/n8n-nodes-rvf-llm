"use strict";
// /opt/beget/n8n/n8n_custom_nodes/nodes/RvfLLM/RvfLLM.node.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RvfLLM = void 0;
var n8n_workflow_1 = require("n8n-workflow");
var description_1 = require("./description");
var loadOptions_1 = require("./methods/loadOptions");
var operations_1 = require("./methods/operations");
var RvfLLM = /** @class */ (function () {
    function RvfLLM() {
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
                loadProviders: function () {
                    return __awaiter(this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/, loadOptions_1.RvfLLMLoadOptions.loadProviders.call(this)];
                        });
                    });
                },
                loadModels: function () {
                    return __awaiter(this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/, loadOptions_1.RvfLLMLoadOptions.loadModels.call(this)];
                        });
                    });
                },
            },
        };
    }
    RvfLLM.prototype.execute = function () {
        return __awaiter(this, void 0, void 0, function () {
            var items, returnData, credentials, i, resource, operation, provider, model, messages, options, builtInTools, temperature, maxTokens, topP, simplifyOutput, requestBody, endpoint, apiResponse, formatted, error_1;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        items = this.getInputData();
                        returnData = [];
                        return [4 /*yield*/, this.getCredentials('rvfLLMApi')];
                    case 1:
                        credentials = _e.sent();
                        if (!credentials) {
                            throw new Error('RVF LLM credentials not configured');
                        }
                        i = 0;
                        _e.label = 2;
                    case 2:
                        if (!(i < items.length)) return [3 /*break*/, 7];
                        _e.label = 3;
                    case 3:
                        _e.trys.push([3, 5, , 6]);
                        resource = this.getNodeParameter('resource', i);
                        operation = this.getNodeParameter('operation', i);
                        if (operation !== 'generate') {
                            throw new Error("Unsupported operation: ".concat(operation));
                        }
                        provider = this.getNodeParameter('provider', i);
                        model = this.getNodeParameter('model', i);
                        messages = this.getNodeParameter('messages.message', i, []) || [];
                        options = this.getNodeParameter('options', i, {});
                        builtInTools = this.getNodeParameter('builtInTools', i, {});
                        temperature = (_a = options.temperature) !== null && _a !== void 0 ? _a : 0.7;
                        maxTokens = (_b = options.maxTokens) !== null && _b !== void 0 ? _b : 2000;
                        topP = (_c = options.topP) !== null && _c !== void 0 ? _c : 1;
                        simplifyOutput = (_d = options.simplifyOutput) !== null && _d !== void 0 ? _d : true;
                        requestBody = {
                            resource: resource,
                            provider: provider,
                            model: model,
                            messages: messages.map(function (m) { return ({
                                role: m.role,
                                content: m.content,
                            }); }),
                            temperature: temperature,
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
                        endpoint = '/v1/chat/completions';
                        return [4 /*yield*/, operations_1.RvfLLMOperations.sendRequest('POST', endpoint, requestBody, credentials)];
                    case 4:
                        apiResponse = _e.sent();
                        formatted = operations_1.RvfLLMOperations.formatResponse(apiResponse, simplifyOutput);
                        returnData.push({
                            json: formatted,
                        });
                        return [3 /*break*/, 6];
                    case 5:
                        error_1 = _e.sent();
                        if (this.continueOnFail()) {
                            returnData.push({ json: { error: error_1.message } });
                            return [3 /*break*/, 6];
                        }
                        throw error_1;
                    case 6:
                        i++;
                        return [3 /*break*/, 2];
                    case 7: return [2 /*return*/, [returnData]];
                }
            });
        });
    };
    return RvfLLM;
}());
exports.RvfLLM = RvfLLM;
