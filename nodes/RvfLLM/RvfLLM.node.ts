// /opt/beget/n8n/n8n_custom_nodes/nodes/RvfLLM/RvfLLM.node.ts

import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeConnectionTypes, // Импортируем типы коннекторов
} from 'n8n-workflow';

import { RVF_LLM_PROPERTIES } from './description';
import { RvfLLMLoadOptions } from './methods/loadOptions';
import { RvfLLMOperations } from './methods/operations';

export class RvfLLM implements INodeType {
	description: INodeTypeDescription = {
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
				type: NodeConnectionTypes.Main,
			},
			{
				displayName: 'Tools',
				type: NodeConnectionTypes.AiTool,
				maxConnections: 10, // Разрешаем несколько инструментов
                required: false // Инструменты не обязательны
			},
		],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'rvfLLMApi',
				required: true,
			},
		],
		properties: RVF_LLM_PROPERTIES,
	};

	methods = {
		loadOptions: {
			async loadProviders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return RvfLLMLoadOptions.loadProviders.call(this);
			},
			async loadModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return RvfLLMLoadOptions.loadModels.call(this);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('rvfLLMApi');

		if (!credentials) {
			throw new Error('RVF LLM credentials not configured');
		}

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				if (operation !== 'generate') {
					throw new Error(`Unsupported operation: ${operation}`);
				}

				const provider = this.getNodeParameter('provider', i) as string;
				const model = this.getNodeParameter('model', i) as string;
				const messages =
					(this.getNodeParameter('messages.message', i, []) as Array<{
						role: string;
						content: string;
					}>) || [];

				const options = this.getNodeParameter('options', i, {}) as {
					temperature?: number;
					maxTokens?: number;
					topP?: number;
					simplifyOutput?: boolean;
					stream?: boolean;
					frequencyPenalty?: number;
					presencePenalty?: number;
				};

				// Обработка встроенных инструментов
				const builtInTools = this.getNodeParameter('builtInTools', i, {}) as {
					webSearch?: boolean;
					fileSearch?: boolean;
					codeInterpreter?: boolean;
				};

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

				const requestBody: any = {
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
				if (
					builtInTools.webSearch ||
					builtInTools.fileSearch ||
					builtInTools.codeInterpreter
				) {
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
				const apiResponse = await RvfLLMOperations.sendRequest(
					'POST',
					endpoint,
					requestBody,
					credentials,
				);

				const formatted = RvfLLMOperations.formatResponse(apiResponse, simplifyOutput);

				returnData.push({
					json: formatted,
				});
			} catch (error: any) {
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
