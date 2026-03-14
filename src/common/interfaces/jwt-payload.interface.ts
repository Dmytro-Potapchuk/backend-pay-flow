export interface JwtPayload {
    userId: string
    login: string
}

export interface RequestWithUser {
    user: JwtPayload
}
