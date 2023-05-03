import { CollectionConfiguration } from './base';
import fs from 'fs';

export const loadConfiguration = (assetsPath: string): CollectionConfiguration => {
  console.log(`Loading collection configuration from ${assetsPath}`);
  const config = JSON.parse(
    fs.readFileSync(`${assetsPath}configuration.json`, 'utf-8')
  );

  return <CollectionConfiguration>config;
};