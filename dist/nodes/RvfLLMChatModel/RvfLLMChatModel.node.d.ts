/**
 * ✅ ПОЛНОСТЬЮ РАБОЧИЙ КОД - АНАЛОГ OPENAI CHAT MODEL + TOOL EMULATION
 *
 * Исправлено:
 * - 🔧 Удален withStructuredOutput (не нужен, вызывал ошибку компиляции)
 * - ✅ Регулярное выражение для парсинга JSON исправлено
 * - ✅ Обработка native/emulated tools
 * - ✅ Английский системный промпт
 * - ✅ bindTools явно вызывает super().bind()
 */
import { ILoadOptionsFunctions, INodePropertyOptions, INodeType, INodeTypeDescription, ISupplyDataFunctions, SupplyData } from 'n8n-workflow';
/**
 * RVF LLM Chat Model - кастомный Language Model узел, полный аналог OpenAI Chat Model.
 */
export declare class RvfLLMChatModel implements INodeType {
    description: INodeTypeDescription;
    methods: {
        loadOptions: {
            loadProviders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
            loadModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
        };
    };
    /**
     * КРИТИЧНОЕ: supplyData вызывается AI Agent для получения LangChain ChatModel.
     * ЭТО главный метод интеграции.
     */
    supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData>;
}
//# sourceMappingURL=RvfLLMChatModel.node.d.ts.map