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

  @ManyToMany(() => Role, { eager: false })
  @JoinTable({
    name: 'user_roles',
    joinColumn:        { name: 'user_id',  referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id',  referencedColumnName: 'id' },
  })
  roles: Role[]

  @OneToMany(() => UserPermission, (up) => up.user, { cascade: true, eager: true })
  userPermissions: UserPermission[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}