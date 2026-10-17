import { SetMetadata } from '@nestjs/common'
//role decorator2
export const Roles = (...roles: string[]) =>
    SetMetadata('roles', roles)