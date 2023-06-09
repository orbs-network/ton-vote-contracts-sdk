import _ from "lodash";
import { VotingPowerStrategy, VotingPowerStrategyType } from "../interfaces";
import * as fs from 'fs';
import * as path from 'path';


export function extractValueFromStrategy(votingPowerStrategies: VotingPowerStrategy[], strategyTypeFilter: VotingPowerStrategyType, nameFilter: string): string | undefined {

  const votingPowerStrategy = votingPowerStrategies.find((arg) => arg.type == strategyTypeFilter);
  if (!votingPowerStrategy) return;

  const nftArg = votingPowerStrategy.arguments.find((arg) => arg.name === nameFilter);
  return nftArg ? nftArg.value : undefined;
} 

function getEnumValueFromFileName(fileName: string): VotingPowerStrategyType {
  const enumKey = fileName.replace('-strategy.ts', '') as keyof typeof VotingPowerStrategyType;
  const enumValue = VotingPowerStrategyType[enumKey];

  return enumValue != undefined ? enumValue : VotingPowerStrategyType.UNDEFINED;
}


export async function loadAllStrategies() {

  let singleStrategies: { [key: string]: Function } = {};

  const files = fs.readdirSync('./');

  for (const file of files) {
    if (file.endsWith('-strategy.ts')) {
      const module = await import(path.join('.', file));
      const functionName = path.parse(file).name;
      singleStrategies[getEnumValueFromFileName(file)] = module[functionName];  
    }
  }

  return singleStrategies;
}