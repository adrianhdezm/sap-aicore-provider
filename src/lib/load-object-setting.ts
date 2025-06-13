import { LoadSettingError } from '@ai-sdk/provider';

/**
 * Loads an object setting from the environment or a parameter.
 *
 * @param settingValue - The setting value.
 * @param environmentVariableMap - Map of property names to environment variable names.
 * @param settingName - The setting name.
 * @param description - The description of the setting.
 * @returns The setting value.
 */
export function loadObjectSetting<T extends Record<string, any>>({
  settingValue,
  environmentVariableMap,
  settingName,
  description
}: {
  settingValue: T | undefined;
  environmentVariableMap: Record<keyof T, string>;
  settingName: string;
  description: string;
}): T {
  if (settingValue != null) {
    if (typeof settingValue !== 'object' || Array.isArray(settingValue)) {
      throw new LoadSettingError({
        message: `${description} setting must be an object.`
      });
    }
    return settingValue;
  }

  if (typeof process === 'undefined') {
    throw new LoadSettingError({
      message:
        `${description} setting is missing. ` +
        `Pass it using the '${settingName}' parameter. ` +
        `Environment variables is not supported in this environment.`
    });
  }

  const result: Record<string, any> = {};
  for (const [key, env] of Object.entries(environmentVariableMap)) {
    const value = process.env[env];
    if (value != null) {
      result[key] = value;
    }
  }

  if (Object.keys(result).length === 0) {
    throw new LoadSettingError({
      message:
        `${description} setting is missing. ` +
        `Pass it using the '${settingName}' parameter ` +
        `or the ${Object.values(environmentVariableMap).join(', ')} environment variables.`
    });
  }

  return result as T;
}
