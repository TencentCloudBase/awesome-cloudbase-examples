import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(path: string) {
    return {
      message: 'Hello World from Nest.js HTTP Function!',
      path,
      timestamp: new Date().toISOString(),
    };
  }
}
