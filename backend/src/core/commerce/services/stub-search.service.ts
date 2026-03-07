import { Injectable } from '@nestjs/common';
import { SearchPort } from '../ports';

@Injectable()
export class StubSearchService extends SearchPort {
  queueProductIndex(): Promise<void> {
    return Promise.resolve();
  }
}
