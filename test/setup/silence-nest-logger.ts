import { Logger } from '@nestjs/common';

// Unit tests assert behaviour, not log output; the Nest logger would only add noise.
Logger.overrideLogger(false);
