import { SetMetadata } from '@nestjs/common'
//role decorator
export const Roles = (...roles: string[]) =>
    SetMetadata('roles', roles)