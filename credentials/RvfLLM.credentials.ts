// /opt/beget/n8n/n8n_custom_nodes/credentials/RvfLLM.credentials.ts

import {
	ICredentialType,
	INodeProperties,
	IAuthenticateGeneric,
	Icon,
} from 'n8n-workflow';

export class RvfLLM implements ICredentialType {
	// Идентификатор типа кредов, по нему обращается нода
	name = 'rvfLLMApi';

	displayName = 'RVF LLM API';

	documentationUrl = 'https://docs.rvlautoai.ru/api';

	icon: Icon = 'file:RvfLLM.svg';

	properties: INodeProperties[] = [
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

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: any = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/v1/providers',
			method: 'GET',
		},
	};
}
