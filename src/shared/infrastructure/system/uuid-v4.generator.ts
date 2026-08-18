import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import type { UuidGeneratorPort } from '../../application/ports';

@Injectable()
export class UuidV4Generator implements UuidGeneratorPort {
  public generate(): string {
    return uuidv4();
  }
}
