import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'outbox_messages' })
export class OutboxMessageOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'uuid' })
  public id: string;

  @Column({ name: 'aggregate_type', type: 'varchar', length: 64 })
  public aggregateType: string;

  @Column({ name: 'aggregate_id', type: 'uuid' })
  public aggregateId: string;

  @Column({ name: 'event_type', type: 'varchar', length: 128 })
  public eventType: string;

  @Column({ name: 'payload', type: 'jsonb' })
  public payload: object;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  public occurredAt: Date;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  public publishedAt: Date | null;

  @Column({ name: 'attempts', type: 'integer', default: 0 })
  public attempts: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  public lastError: string | null;
}
