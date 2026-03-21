export interface JwtPayload {
    userId: string
    login: string
    role?: string
}

export interface RequestWithUser {
    user: JwtPayload
}
