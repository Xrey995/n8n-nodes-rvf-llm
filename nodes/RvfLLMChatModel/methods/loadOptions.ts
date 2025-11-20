// /opt/beget/n8n/n8n_custom_nodes/nodes/RvfLLMChatModel/methods/loadOptions.ts

import axios from 'axios';
import { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

/**
 * LoadOptions для RVF LLM Chat Model.
 * По сути копия RvfLLMLoadOptions, но resource всегда = 'text'. [file:208]
 */
export class RvfLLMChatModelLoadOptions {
	static async loadProviders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		// Для Chat Model работаем только с текстовыми моделями.
		const resource = 'text';

		const credentials = await this.getCredentials('rvfLLMApi');
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const cred: any = credentials;

		const baseUrl = cred?.baseUrl || 'https://rvlautoai.ru/webhook';

		const response = await axios.get(`${baseUrl}/v1/providers`, {
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

		const result: INodePropertyOptions[] = providers
			.filter((p: any) => {
				if (!p.capabilities) return false;
				// Только те, кто умеет text. [file:208]
				return p.capabilities[resource] === true;
			})
			.sort(
				(a: any, b: any) =>
					(a.performance?.avg_latency_ms || 0) -
					(b.performance?.avg_latency_ms || 0),
			)
			.map(
				(p: any): INodePropertyOptions => ({
					name: p.name || p.id,
					value: p.name || p.id,
				}),
			);

		return result;
	}

	static async loadModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const resource = 'text';

		const provider = this.getNodeParameter('provider', 0) as string;
		if (!provider) return [];

		const credentials = await this.getCredentials('rvfLLMApi');
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const cred: any = credentials;

		const baseUrl = cred?.baseUrl || 'https://rvlautoai.ru/webhook';

		const response = await axios.get(`${baseUrl}/v1/models`, {
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

		const result: INodePropertyOptions[] = models
			.filter((m: any) => {
				if (!m.category || !m.provider) return false;
				return m.category === resource && m.provider === provider;
			})
			.sort(
				(a: any, b: any) =>
					(a.latency_ms || 0) - (b.latency_ms || 0),
			)
			.map(
				(m: any): INodePropertyOptions => ({
					name: m.id,
					value: m.id,
				}),
			);

		return result;
	}
}
