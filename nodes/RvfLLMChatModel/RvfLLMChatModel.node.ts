// /opt/beget/n8n/n8n_custom_nodes/nodes/RvfLLMChatModel/RvfLLMChatModel.node.ts

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
 * LangChain‑совместимая обёртка над RVF LLM /v1/chat/completions API.
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
	 * Явно объявляем поддержку Tools Calling для AI Agent.
	 */
	supportsToolCalling(): boolean {
		return true;
	}

	async _generate(
		messages: BaseMessage[],
		options?: { stop?: string[]; tools?: StructuredTool[] },
		_runManager?: CallbackManagerForLLMRun,
	): Promise<ChatResult> {
		const rvfMessages = messages.map((message) => {
			const roleType = message._getType();
			const role =
				roleType === 'human'
					? 'user'
					: roleType === 'ai'
					? 'assistant'
					: roleType === 'system'
					? 'system'
					: roleType === 'tool'
					? 'tool'
					: 'user';

			const baseMsg: any = {
				role,
				content: message.content as string,
			};

			if (message instanceof ToolMessage && (message as any).tool_call_id) {
				baseMsg.tool_call_id = (message as any).tool_call_id;
			}

			return baseMsg;
		});

		// ВАЖНО: используем ровно тот же эндпойнт, что и узел 1:
		// POST {baseUrl}/v1/chat/completions
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

		if (options?.tools && options.tools.length > 0) {
			body.tools = options.tools.map((tool) => ({
				type: 'function',
				function: {
					name: tool.name,
					description: tool.description,
					parameters: (tool as any).schema ?? {},
				},
			}));
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

		if (msg.tool_calls && msg.tool_calls.length > 0) {
			aiMessage = new AIMessage({
				content: msg.content || '',
				tool_calls: msg.tool_calls.map((toolCall: any) => ({
					id: toolCall.id,
					name: toolCall.function?.name,
					args: (() => {
						try {
							return JSON.parse(toolCall.function?.arguments || '{}');
						} catch {
							return {};
						}
					})(),
				})),
			});
		} else {
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
	 * Заглушка bindTools, достаточная, чтобы AI Agent считал модель tool‑callable.
	 */
	bindTools(_tools: StructuredTool[]): this {
		return this;
	}
}

/**
 * RVF LLM Chat Model – кастомный Language Model‑узел для AI Agent.
 */
export class RvfLLMChatModel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RVF LLM Chat Model',
		name: 'rvfLLMChatModel',
		icon: 'file:RvfLLM.svg',
		group: ['transform'],
		version: 1,
		description: 'Use RVF LLM text models as chat models in your AI chains.',
		defaults: {
			name: 'RVF LLM Chat Model',
		},
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
