import { INodeProperties } from 'n8n-workflow';

export const RVF_LLM_PROPERTIES: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Text', value: 'text', description: 'Generate text responses' },
			{ name: 'Image', value: 'image', description: 'Generate images' },
			{ name: 'Audio', value: 'audio', description: 'Generate audio / TTS' },
			{ name: 'Video', value: 'video', description: 'Generate videos' },
		],
		required: true,
		default: 'text',
	},

	{
		displayName: 'Provider',
		name: 'provider',
		type: 'options',
		noDataExpression: true,
		typeOptions: {
			loadOptionsMethod: 'loadProviders',
			loadOptionsDependsOn: ['resource'], // ВАЖНО: перезагружать список при смене типа контента
		},
		required: true,
		default: '',
		placeholder: 'Select a provider...',
		description:
			'AI provider loaded from RVF LLM API. Only providers that support the selected resource are shown.',
	},

	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		noDataExpression: true,
		typeOptions: {
			loadOptionsMethod: 'loadModels',
			loadOptionsDependsOn: ['resource', 'provider'], // ВАЖНО: зависит и от типа, и от провайдера
		},
		required: true,
		default: '',
		placeholder: 'Select a model...',
		description:
			'Model loaded from RVF LLM API, filtered by provider and resource type.',
	},

	// 4. Операция (аналог Message a Model)
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Generate',
				value: 'generate',
				action: 'Generate a model response',
				description: 'Generate a completion using the selected model.',
			},
		],
		required: true,
		default: 'generate',
		displayOptions: {
			show: {
				resource: ['text', 'image', 'audio', 'video'],
			},
		},
	},

	// 5. Messages – как в OpenAI “Message a model”
	{
		displayName: 'Messages',
		name: 'messages',
		type: 'fixedCollection',
		placeholder: 'Add Message',
		typeOptions: {
			multipleValues: true,
		},
		default: {
			message: [
				{
					role: 'user',
					content: '',
				},
			],
		},
		options: [
			{
				name: 'message',
				displayName: 'Message',
				values: [
					{
						displayName: 'Role',
						name: 'role',
						type: 'options',
						options: [
							{ name: 'System', value: 'system' },
							{ name: 'User', value: 'user' },
							{ name: 'Assistant', value: 'assistant' },
						],
						default: 'user',
					},
					{
						displayName: 'Content',
						name: 'content',
						type: 'string',
						typeOptions: {
							rows: 4,
						},
						default: '',
					},
				],
			},
		],
		required: true,
		displayOptions: {
			show: {
				resource: ['text', 'image', 'audio'],
			},
		},
	},

	// 6. Options – все дополнительные параметры (Temperature, Max Tokens, Top P и др.)
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 2,
					numberPrecision: 0.1,
				},
				default: 0.7,
				description:
					'Controls randomness of the output (0 = deterministic, 2 = very random).',
			},
			{
				displayName: 'Max Tokens',
				name: 'maxTokens',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 200000,
				},
				default: 2000,
				description: 'Maximum number of tokens in the response.',
			},
			{
				displayName: 'Top P',
				name: 'topP',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberPrecision: 0.1,
				},
				default: 1,
				description: 'Nucleus sampling parameter.',
			},
			{
				displayName: 'Simplify Output',
				name: 'simplifyOutput',
				type: 'boolean',
				default: true,
				description:
					'Return only the main message text instead of the full raw response.',
			},
			{
				displayName: 'Stream Response',
				name: 'stream',
				type: 'boolean',
				default: false,
				description: 'Stream the response if supported by the provider.',
			},
			{
				displayName: 'Frequency Penalty',
				name: 'frequencyPenalty',
				type: 'number',
				typeOptions: {
					minValue: -2,
					maxValue: 2,
					numberPrecision: 0.1,
				},
				default: 0,
			},
			{
				displayName: 'Presence Penalty',
				name: 'presencePenalty',
				type: 'number',
				typeOptions: {
					minValue: -2,
					maxValue: 2,
					numberPrecision: 0.1,
				},
				default: 0,
			},
		],
	},

	// 7. Built-in Tools – кнопка “Add Built-in Tool” с меню, как у OpenAI
	{
		displayName: 'Built-in Tools',
		name: 'builtInTools',
		type: 'collection',
		placeholder: 'Add Built-in Tool',
		default: {},
		options: [
			{
				displayName: 'Web Search',
				name: 'webSearch',
				type: 'boolean',
				default: false,
				description: 'Enable web search tool for the model.',
			},
			{
				displayName: 'File Search',
				name: 'fileSearch',
				type: 'boolean',
				default: false,
				description: 'Enable file / knowledge base search tool.',
			},
			{
				displayName: 'Code Interpreter',
				name: 'codeInterpreter',
				type: 'boolean',
				default: false,
				description: 'Enable code interpreter tool for advanced reasoning.',
			},
		],
	},
];
