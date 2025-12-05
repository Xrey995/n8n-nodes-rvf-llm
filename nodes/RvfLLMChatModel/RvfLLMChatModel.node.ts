// /opt/beget/n8n/n8n_custom_nodes/nodes/RvfLLMChatModel/RvfLLMChatModel.node.ts
// ПОЛНОСТЬЮ ПЕРЕРАБОТАННЫЙ КОД - АНАЛОГ OPENAI CHAT MODEL
// Правильно обрабатывает: system messages, tools, tool_calls, все параметры от AI Agent

import {
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
	NodeConnectionTypes,
} from 'n8n-workflow';

import {
	BaseChatModel,
	type BaseChatModelParams,
} from '@langchain/core/language_models/chat_models';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { BaseMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import { ChatResult } from '@langchain/core/outputs';
import type { StructuredTool } from '@langchain/core/tools';

import { RVF_LLM_CHAT_MODEL_PROPERTIES } from './description';
import { RvfLLMChatModelLoadOptions } from './methods/loadOptions';

/**
 * LangChain-совместимая обёртка над RVF LLM /v1/chat/completions API.
 * КРИТИЧНОЕ: Полная поддержка tools, system messages и всех параметров AI Agent.
 */
class RvfLLMChatLangChain extends BaseChatModel {
	model: string;
	provider: string;
	baseUrl: string;
	apiKey: string;
	temperature: number;
	maxTokens?: number;
	timeout: number;
	private rvfStream: boolean;

	constructor(params: {
		model: string;
		provider: string;
		baseUrl: string;
		apiKey: string;
		temperature?: number;
		maxTokens?: number;
		timeout?: number;
		stream?: boolean;
	} & BaseChatModelParams) {
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

	_llmType(): string {
		return 'rvf-llm-chat';
	}

	/**
	 * КРИТИЧНОЕ: Явно объявляем поддержку инструментов.
	 * Это первое, что проверяет AI Agent перед использованием этой ноды.
	 */
	supportsToolCalling(): boolean {
		return true;
	}

	async _generate(
		messages: BaseMessage[],
		options?: { stop?: string[]; tools?: StructuredTool[] },
		_runManager?: CallbackManagerForLLMRun,
	): Promise<ChatResult> {
		/**
		 * КРИТИЧНЫЙ МОМЕНТ 1: Преобразование ALL сообщений (включая system).
		 * Важно сохранить role точно как в LangChain: 'system', 'user', 'assistant', 'tool'
		 */
		const rvfMessages = messages.map((message) => {
			const roleType = message._getType();
			
			// Маппинг типов LangChain на роли OpenAI API
			const role =
				roleType === 'human'
					? 'user'
					: roleType === 'ai'
					? 'assistant'
					: roleType === 'system'
					? 'system'
					: roleType === 'tool'
					? 'tool'
					: 'user'; // fallback

			const baseMsg: any = {
				role,
				content: message.content as string,
			};

			/**
			 * КРИТИЧНЫЙ МОМЕНТ 2: Обработка tool_call_id для tool messages.
			 * Это необходимо для корректной истории диалога с tools.
			 */
			if (message instanceof ToolMessage) {
				const toolMessage = message as any;
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
			if (message instanceof AIMessage) {
				const aiMessage = message as any;
				if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
					// Преобразуем tool_calls в OpenAI формат
					baseMsg.tool_calls = aiMessage.tool_calls.map((toolCall: any) => ({
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
		 * КРИТИЧНЫЙ МОМЕНТ 4: Строим тело запроса с ДНИ tools.
		 * Это главное отличие от текущей неработающей реализации.
		 */
		const endpoint = '/v1/chat/completions';

		const body: any = {
			model: this.model,
			provider: this.provider,
			messages: rvfMessages,
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
		 * КРИТИЧНЫЙ МОМЕНТ 5: ВОТ ГЛАВНОЕ - отправляем tools в API!
		 * Текущий код это не делает, поэтому AI Agent не может вызывать инструменты.
		 */
		if (options?.tools && options.tools.length > 0) {
			// Преобразуем LangChain tools в OpenAI tools format
			body.tools = options.tools.map((tool) => ({
				type: 'function',
				function: {
					name: tool.name,
					description: tool.description,
					// Извлекаем JSON-schema из tool
					parameters: (tool as any).schema ?? {},
				},
			}));
			
			// Указываем API, что модель может выбирать вызывать tools или нет
			body.tool_choice = 'auto';
		}

		const controller =
			typeof AbortController !== 'undefined' ? new AbortController() : undefined;

		if (controller && typeof setTimeout === 'function') {
			setTimeout(() => controller.abort(), this.timeout * 1000);
		}

		let data: any;

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
				throw new Error(
					`RVF LLM API error: ${response.status} ${response.statusText} ${text}`,
				);
			}

			data = await response.json();
		} catch (error: any) {
			throw new Error(
				`RVF LLM request failed: ${error?.message || String(error)}`,
			);
		}

		const choice = data.choices?.[0];
		if (!choice?.message) {
			throw new Error('Empty response from RVF LLM API');
		}

		const msg = choice.message;
		let aiMessage: AIMessage;

		/**
		 * КРИТИЧНЫЙ МОМЕНТ 6: Обработка tool_calls в ответе.
		 * Если модель решила вызвать инструмент, мы ДОЛЖНЫ это обработать.
		 */
		if (msg.tool_calls && msg.tool_calls.length > 0) {
			// Преобразуем OpenAI tool_calls в LangChain формат
			aiMessage = new AIMessage({
				content: msg.content || '', // Обычно пусто, когда есть tool_calls
				tool_calls: msg.tool_calls.map((toolCall: any) => ({
					id: toolCall.id,
					name: toolCall.function?.name,
					args: (() => {
						try {
							// Парсим JSON-аргументы инструмента
							return JSON.parse(toolCall.function?.arguments || '{}');
						} catch (e) {
							console.error('Failed to parse tool arguments:', e);
							return {};
						}
					})(),
				})),
			});
		} else {
			// Обычный текстовый ответ (нет вызова инструментов)
			aiMessage = new AIMessage(msg.content || '');
		}

		return {
			generations: [
				{
					text: msg.content || '',
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
	 * КРИТИЧНЫЙ МОМЕНТ 7: bindTools должен корректно работать.
	 * LangChain вызывает этот метод, когда tools передаются в цепочку.
	 * Наша реализация просто возвращает `this` (нет смены конфига).
	 * Это нормально - все tools обрабатываются в _generate().
	 */
	bindTools(_tools: StructuredTool[]): this {
		// bindTools в нашем случае просто возвращает текущий экземпляр.
		// Tools будут переданы в _generate() напрямую через options.tools.
		return this;
	}
}

/**
 * RVF LLM Chat Model - кастомный Language Model узел, полный аналог OpenAI Chat Model.
 */
export class RvfLLMChatModel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RVF LLM Chat Model',
		name: 'rvfLLMChatModel',
		icon: 'file:RvfLLM.svg',
		group: ['transform'],
		version: 1,
		description: 'Use RVF LLM text models as chat models in your AI chains. Full tool calling support.',
		defaults: {
			name: 'RVF LLM Chat Model',
		},
		// КРИТИЧНОЕ: Только выход, это sub-node для AI Agent
		inputs: [],
		outputs: [
			{
				displayName: '',
				type: NodeConnectionTypes.AiLanguageModel,
			},
		],
		credentials: [
			{
				name: 'rvfLLMApi',
				required: true,
			},
		],
		properties: RVF_LLM_CHAT_MODEL_PROPERTIES,
	};

	methods = {
		loadOptions: {
			async loadProviders(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				return RvfLLMChatModelLoadOptions.loadProviders.call(this);
			},
			async loadModels(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				return RvfLLMChatModelLoadOptions.loadModels.call(this);
			},
		},
	};

	/**
	 * КРИТИЧНОЕ: supplyData вызывается AI Agent для получения LangChain ChatModel.
	 * ЭТО главный метод интеграции.
	 */
	async supplyData(
		this: ISupplyDataFunctions,
		itemIndex: number,
	): Promise<SupplyData> {
		const provider = this.getNodeParameter('provider', itemIndex) as string;
		const model = this.getNodeParameter('model', itemIndex) as string;

		const options = (this.getNodeParameter('options', itemIndex, {}) || {}) as {
			temperature?: number;
			maxTokens?: number;
			stream?: boolean;
		};

		const credentials = await this.getCredentials('rvfLLMApi');
		const cred: any = credentials;

		const baseUrl = cred.baseUrl || 'https://rvlautoai.ru/webhook';
		const apiKey = cred.apiKey;

		// Создаём LangChain ChatModel с ПОЛНЫМ функционалом
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