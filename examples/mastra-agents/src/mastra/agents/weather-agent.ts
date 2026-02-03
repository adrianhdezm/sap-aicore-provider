import { sapAiCore } from '@ai-foundry/sap-aicore-provider';
import { stepCountIs } from 'ai';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { weatherInfo } from '../tools/weather-tool.js';

export const weatherAgent = new Agent({
  id: 'weather-agent',
  name: 'Weather Agent v6',
  instructions: `Your goal is to provide weather information for cities when requested`,
  description: `An agent that can help you get weather information for a given city`,
  model: sapAiCore('sap-aicore/gpt-4o'),
  defaultOptions: {
    stopWhen: stepCountIs(1)
  },
  tools: {
    weatherInfo
  },
  memory: new Memory()
});
