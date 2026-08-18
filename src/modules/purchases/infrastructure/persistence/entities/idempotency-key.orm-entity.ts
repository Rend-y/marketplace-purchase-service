import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'idempotency_keys' })
export class IdempotencyKeyOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'uuid' })
  public id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  public userId: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 255 })
  public idempotencyKey: string;

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  public resourceId: string | null;

  /** Canonical application result, filled in the same transaction that claimed the key. */
  @Column({ name: 'result', type: 'jsonb', nullable: true })
  public result: object | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  public createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  public completedAt: Date | null;
}
