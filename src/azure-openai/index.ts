export type SapAiCoreModelId =
  | 'sap-aicore/gpt-4o'
  | 'sap-aicore/gpt-4o-mini'
  | 'sap-aicore/gpt-4.1'
  | 'sap-aicore/gpt-4.1-nano'
  | 'sap-aicore/gpt-4.1-mini'
  | 'sap-aicore/o3'
  | 'sap-aicore/o3-mini'
  | 'sap-aicore/o1'
  | 'sap-aicore/o4-mini'
  | (string & {});

export const OPENAI_MODEL_IDS: SapAiCoreModelId[] = [
  'sap-aicore/gpt-4o',
  'sap-aicore/gpt-4o-mini',
  'sap-aicore/gpt-4.1',
  'sap-aicore/gpt-4.1-nano',
  'sap-aicore/gpt-4.1-mini'
];
