import { IExecuteFunctions, ILoadOptionsFunctions, INodeExecutionData, INodePropertyOptions, INodeType, INodeTypeDescription } from 'n8n-workflow';
export declare class RvfLLM implements INodeType {
    description: INodeTypeDescription;
    methods: {
        loadOptions: {
            loadProviders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
            loadModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
        };
    };
    execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
}
//# sourceMappingURL=RvfLLM.node.d.ts.map