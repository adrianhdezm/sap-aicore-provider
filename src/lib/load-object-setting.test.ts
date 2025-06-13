import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadObjectSetting } from './load-object-setting';
import { LoadSettingError } from '@ai-sdk/provider';

interface TestConfig {
  foo?: string;
  bar?: string;
}

const envMap = {
  foo: 'TEST_FOO',
  bar: 'TEST_BAR'
} as const;

beforeEach(() => {
  delete process.env.TEST_FOO;
  delete process.env.TEST_BAR;
});

afterEach(() => {
  delete process.env.TEST_FOO;
  delete process.env.TEST_BAR;
});

describe('loadObjectSetting', () => {
  it('returns provided object', () => {
    const config = loadObjectSetting<TestConfig>({
      settingValue: { foo: 'a', bar: 'b' },
      environmentVariableMap: envMap,
      settingName: 'test',
      description: 'Test'
    });
    expect(config).toStrictEqual({ foo: 'a', bar: 'b' });
  });

  it('throws when provided value is not an object', () => {
    expect(() =>
      loadObjectSetting<TestConfig>({
        settingValue: 'wrong' as any,
        environmentVariableMap: envMap,
        settingName: 'test',
        description: 'Test'
      })
    ).toThrow(LoadSettingError);
  });

  it('loads configuration from environment variables', () => {
    process.env.TEST_FOO = 'foo';
    const config = loadObjectSetting<TestConfig>({
      settingValue: undefined,
      environmentVariableMap: envMap,
      settingName: 'test',
      description: 'Test'
    });
    expect(config).toStrictEqual({ foo: 'foo' });
  });

  it('throws when no environment variables are provided', () => {
    expect(() =>
      loadObjectSetting<TestConfig>({
        settingValue: undefined,
        environmentVariableMap: envMap,
        settingName: 'test',
        description: 'Test'
      })
    ).toThrow(LoadSettingError);
  });
});
