import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'users' })
export class UserOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'uuid' })
  public id: string;

  @Column({ name: 'email', type: 'varchar', length: 320 })
  public email: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  public createdAt: Date;
}
