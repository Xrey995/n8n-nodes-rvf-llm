import { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
/**
 * LoadOptions для RVF LLM Chat Model.
 * По сути копия RvfLLMLoadOptions, но resource всегда = 'text'. [file:208]
 */
export declare class RvfLLMChatModelLoadOptions {
    static loadProviders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
    static loadModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
}
//# sourceMappingURL=loadOptions.d.ts.map