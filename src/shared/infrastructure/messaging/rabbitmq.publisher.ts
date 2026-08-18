import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import * as amqp from 'amqplib';
import type { ChannelModel, ConfirmChannel } from 'amqplib';

import { rabbitmqConfig } from '../../../config';
import { serializeError } from '../logger/serialize-error';
import type { MessagePublisherPort, OutboundMessage } from '../../application/ports';

const RECONNECT_DELAY_MS = 2_000;
const CONTENT_TYPE_JSON = 'application/json';

@Injectable()
export class RabbitmqPublisher
  implements MessagePublisherPort, OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(RabbitmqPublisher.name);

  private connection?: ChannelModel;
  private channel?: ConfirmChannel;
  private reconnectTimer?: NodeJS.Timeout;
  private shuttingDown = false;

  constructor(
    @Inject(rabbitmqConfig.KEY) private readonly config: ConfigType<typeof rabbitmqConfig>,
  ) {}

  public async onModuleInit(): Promise<void> {
    // A broker outage must not prevent the service from starting: readiness reports it instead,
    // and the outbox retains every event until the connection is restored.
    await this.connect().catch((error: unknown) => {
      this.logger.error({
        message: 'Initial RabbitMQ connection failed, retrying in background',
        err: serializeError(error),
      });
      this.scheduleReconnect();
    });
  }

  public async onApplicationShutdown(): Promise<void> {
    this.shuttingDown = true;

    if (this.reconnectTimer !== undefined) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch (error: unknown) {
      this.logger.warn({
        message: 'Error while closing the RabbitMQ connection',
        err: serializeError(error),
      });
    } finally {
      this.channel = undefined;
      this.connection = undefined;
    }
  }

  public isConnected(): boolean {
    return this.channel !== undefined;
  }

  public async publish(message: OutboundMessage): Promise<void> {
    const channel = this.channel;

    if (channel === undefined) {
      throw new Error('RabbitMQ channel is not available');
    }

    const content = Buffer.from(JSON.stringify(message.payload), 'utf-8');

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Publisher confirm timed out after ${this.config.publishTimeoutMs}ms`));
      }, this.config.publishTimeoutMs);

      channel.publish(
        this.config.exchange,
        message.routingKey,
        content,
        {
          persistent: true,
          contentType: CONTENT_TYPE_JSON,
          messageId: message.messageId,
          type: message.type,
          timestamp: message.occurredAt.getTime(),
        },
        (error: unknown) => {
          clearTimeout(timeout);

          if (error !== null && error !== undefined) {
            reject(error instanceof Error ? error : new Error(serializeError(error).message));
            return;
          }

          resolve();
        },
      );
    });
  }

  private async connect(): Promise<void> {
    const connection = await amqp.connect(this.config.url);
    const channel = await connection.createConfirmChannel();

    await channel.assertExchange(this.config.exchange, 'topic', { durable: true });

    connection.on('error', (error: unknown) => {
      this.logger.error({ message: 'RabbitMQ connection error', err: serializeError(error) });
    });

    connection.on('close', () => {
      this.channel = undefined;
      this.connection = undefined;

      if (!this.shuttingDown) {
        this.logger.warn('RabbitMQ connection closed, scheduling reconnect');
        this.scheduleReconnect();
      }
    });

    this.connection = connection;
    this.channel = channel;

    this.logger.log('Connected to RabbitMQ');
  }

  private scheduleReconnect(): void {
    if (this.shuttingDown || this.reconnectTimer !== undefined) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;

      void this.connect().catch((error: unknown) => {
        this.logger.error({
          message: 'RabbitMQ reconnect attempt failed',
          err: serializeError(error),
        });
        this.scheduleReconnect();
      });
    }, RECONNECT_DELAY_MS);

    this.reconnectTimer.unref();
  }
}
