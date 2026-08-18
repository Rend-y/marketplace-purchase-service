import { Injectable } from '@nestjs/common';

import type { ClockPort } from '../../application/ports';

@Injectable()
export class SystemClock implements ClockPort {
  public now(): Date {
    return new Date();
  }
}
