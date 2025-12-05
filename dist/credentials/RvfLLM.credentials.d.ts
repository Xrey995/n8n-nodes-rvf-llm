import { ICredentialType, INodeProperties, IAuthenticateGeneric, Icon } from 'n8n-workflow';
export declare class RvfLLM implements ICredentialType {
    name: string;
    displayName: string;
    documentationUrl: string;
    icon: Icon;
    properties: INodeProperties[];
    authenticate: IAuthenticateGeneric;
    test: any;
}
//# sourceMappingURL=RvfLLM.credentials.d.ts.map