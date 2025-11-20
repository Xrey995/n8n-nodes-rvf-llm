// /opt/beget/n8n/n8n_custom_nodes/nodes/RvfLLM/methods/loadOptions.ts

import axios from 'axios';
import { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

export class RvfLLMLoadOptions {
	static async loadProviders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		// В методах loadOptions getNodeParameter возвращает текущее значение параметра из UI.
		// Не передаем второй аргумент (itemIndex), так как работаем с настройками узла, а не с данными.
		let resource: string;
		try {
			resource = this.getNodeParameter('resource') as string;
		} catch (error) {
			// Если параметр еще не задан или ошибка доступа, берем дефолт
			resource = 'text';
		}

		const credentials = await this.getCredentials('rvfLLMApi');
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const cred: any = credentials;

		const baseUrl = cred?.baseUrl || 'https://rvlautoai.ru/webhook';

		try {
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
					// Страховка
					if (!p.capabilities) return false;
					// Фильтруем по выбранному ресурсу (text, image, audio, video)
					return p.capabilities[resource] === true;
				})
				.sort(
					(a: any, b: any) =>
						(a.performance?.avg_latency_ms || 0) - (b.performance?.avg_latency_ms || 0),
				)
				.map(
					(p: any): INodePropertyOptions => ({
						name: p.name || p.id,
						value: p.id, // Используем ID как value
					}),
				);

			return result;
		} catch (error) {
			console.error('Error loading providers:', error);
			return [];
		}
	}

	static async loadModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		let resource: string;
		let provider: string;

		try {
			resource = this.getNodeParameter('resource') as string;
			provider = this.getNodeParameter('provider') as string;
		} catch (error) {
			// Если параметры не заданы, модели загрузить нельзя
			return [];
		}

		if (!provider) return [];

		const credentials = await this.getCredentials('rvfLLMApi');
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const cred: any = credentials;

		const baseUrl = cred?.baseUrl || 'https://rvlautoai.ru/webhook';

		try {
			const response = await axios.get(`${baseUrl}/v1/models`, {
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

			const result: INodePropertyOptions[] = models
				.filter((m: any) => {
					if (!m.category || !m.provider) return false;
					// Строгая фильтрация: категория должна совпадать с ресурсом, провайдер - с выбранным
					return m.category === resource && m.provider === provider;
				})
				.sort((a: any, b: any) => (a.latency_ms || 0) - (b.latency_ms || 0))
				.map(
					(m: any): INodePropertyOptions => ({
						name: m.id, // Отображаемое имя
						value: m.id, // Значение (ID модели)
					}),
				);

			return result;
		} catch (error) {
			console.error('Error loading models:', error);
			return [];
		}
	}
}
