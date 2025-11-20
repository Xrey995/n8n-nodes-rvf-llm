import axios from 'axios';

export class RvfLLMOperations {
  static async sendRequest(
    method: string,
    endpoint: string,
    data: any,
    credentials: any,
  ): Promise<any> {
    try {
      const baseUrl = credentials.baseUrl || 'https://rvlautoai.ru/webhook';
      const url = `${baseUrl}${endpoint}`;

      const config = {
        method: method as any,
        url,
        headers: {
          Authorization: `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json',
        },
        data: method !== 'GET' ? data : undefined,
      };

      const response = await axios(config);
      return response.data;
    } catch (error: any) {
      throw new Error(
        `API request failed: ${error.response?.data?.error?.message || error.message}`,
      );
    }
  }

  static formatResponse(response: any, simplifyOutput: boolean): any {
    if (simplifyOutput && response.choices && response.choices.length > 0) {
      return {
        text: response.choices[0]?.message?.content || '',
        role: response.choices[0]?.message?.role || 'assistant',
        finishReason: response.choices[0]?.finish_reason || 'stop',
      };
    }
    return response;
  }

  static handleError(error: any): string {
    if (error.response) {
      return `Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
    }
    return `Error: ${error.message}`;
  }
}
