import { createHmac } from 'crypto';

export class CosmosAuth {
  constructor(private masterKey: string) {}

  generateAuthToken(
    method: string,
    resourceType: string,
    resourceId: string,
    date: string
  ): string {
    const text = `${method.toLowerCase()}\n${resourceType.toLowerCase()}\n${resourceId}\n${date.toLowerCase()}\n\n`;
    
    const key = Buffer.from(this.masterKey, 'base64');
    const signature = createHmac('sha256', key)
      .update(text)
      .digest('base64');
    
    return encodeURIComponent(`type=master&ver=1.0&sig=${signature}`);
  }

  parseConnectionString(connectionString: string): {
    endpoint: string;
    key: string;
  } {
    const parts = connectionString.split(';');
    const config: any = {};

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key && value) {
        config[key.trim()] = value.trim();
      }
    }

    if (!config.AccountEndpoint || !config.AccountKey) {
      throw new Error('Invalid connection string format');
    }

    return {
      endpoint: config.AccountEndpoint,
      key: config.AccountKey
    };
  }
}

