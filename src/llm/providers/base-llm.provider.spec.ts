import { BaseLLMProvider } from './base-llm.provider';

class TestProvider extends BaseLLMProvider {
  readonly name = 'test';
  readonly supportedModels = ['m'];
  async generateCompletion<T = any>(request: any): Promise<any> {
    return this.createResponse('ok', 'm', { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 });
  }
  validateConfig() { return true; }
  async isAvailable() { return true; }
}

describe('BaseLLMProvider', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeAll(() => {
    // Suppress console warnings during tests
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
  });

  afterAll(() => {
    // Restore console warnings after tests
    consoleWarnSpy.mockRestore();
  });

  it('validateRequest throws on empty prompt', () => {
    const p = new TestProvider() as any;
    expect(() => p.validateRequest({ prompt: '   ' } as any)).toThrow('Prompt is required and cannot be empty');
  });

  it('createResponse maps usage keys and provider name', async () => {
    const p = new TestProvider();
    const res = await p.generateCompletion({} as any);
    expect(res).toEqual({ data: 'ok', model: 'm', provider: 'test', usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 } });
  });

  it('retryWithBackoff retries then throws last error', async () => {
    const p = new TestProvider() as any;
    const op = jest.fn().mockRejectedValue(new Error('fail'));
    await expect(p.retryWithBackoff(op, 1, 0)).rejects.toThrow('fail'); // Use 0ms delay for tests
    expect(op).toHaveBeenCalledTimes(2);
  });
});


