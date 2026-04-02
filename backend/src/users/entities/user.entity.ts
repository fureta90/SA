import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Role } from '../../roles/entities/role.entity'
import { UserPermission } from '../../roles/entities/user-permission.entity'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  email: string

  @Column({ select: false })
  password: string

  @Column({ nullable: true })
  firstName: string

  @Column({ nullable: true })
  lastName: string

  @Column({ nullable: true })
  empresa: string

  @Column({ nullable: true, unique: true })
  usuario: string

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  photoUrl: string

  @Column({ default: true })
  isActive: boolean

  // ── Facturación ───────────────────────────────────────────────────────────

  /** Precio por minuto transcripto que se le cobra a este cliente */
  @Column({ type: 'float', nullable: true })
  pricePerMinute: number | null

  /** Límite global de minutos por período para TODAS las campañas del cliente */
  @Column({ type: 'int', nullable: true })
  globalMinutesLimit: number | null

  // ── Período de renovación ─────────────────────────────────────────────────

  /**
   * Fecha de inicio del período actual.
   * null = sin período configurado (los minutos no se resetean).
   * El cron corre cada noche y renueva cuando now >= periodStartDate + periodDays.
   */
  @Column({ type: 'datetime', nullable: true })
  periodStartDate: Date | null

  /**
   * Duración del período en días (default: 30).
   * Permite configurar períodos de 28, 30 o 31 días según el cliente.
   */
  @Column({ type: 'int', default: 30 })
  periodDays: number

  @ManyToMany(() => Role, { eager: false })
  @JoinTable({
    name: 'user_roles',
    joinColumn:        { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[]

  @OneToMany(() => UserPermission, (up) => up.user, { cascade: true, eager: true })
  userPermissions: UserPermission[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}