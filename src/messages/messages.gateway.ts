import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets'
import { JwtService } from '@nestjs/jwt'
import { Server, Socket } from 'socket.io'

import type { JwtPayload } from '../common/interfaces/jwt-payload.interface'

@WebSocketGateway({
    cors: {
        origin: '*',
    },
    namespace: '/messages',
})
export class MessagesGateway implements OnGatewayConnection {
    @WebSocketServer()
    server: Server

    constructor(private jwtService: JwtService) {}

    private extractToken(socket: Socket) {
        const authToken = socket.handshake.auth?.token
        const headerToken = socket.handshake.headers.authorization

        const rawToken =
            (typeof authToken === 'string' && authToken) ||
            (typeof headerToken === 'string' && headerToken) ||
            ''

        return rawToken.replace(/^Bearer\s+/i, '')
    }

    async handleConnection(socket: Socket) {
        try {
            const token = this.extractToken(socket)
            const payload = await this.jwtService.verifyAsync<JwtPayload>(token)

            socket.data.user = payload
            socket.join(`user:${payload.userId}`)
        } catch {
            socket.disconnect(true)
        }
    }

    @SubscribeMessage('messages:join-conversation')
    handleJoinConversation(
        @ConnectedSocket() socket: Socket,
        @MessageBody() body: { conversationId?: string },
    ) {
        if (!body?.conversationId) {
            return
        }

        socket.join(`conversation:${body.conversationId}`)
    }

    @SubscribeMessage('messages:leave-conversation')
    handleLeaveConversation(
        @ConnectedSocket() socket: Socket,
        @MessageBody() body: { conversationId?: string },
    ) {
        if (!body?.conversationId) {
            return
        }

        socket.leave(`conversation:${body.conversationId}`)
    }

    emitConversationUpdate(
        participantIds: string[],
        conversationId: string,
        action: 'created' | 'message' | 'read' | 'deleted' | 'cleared',
        messageId?: string,
    ) {
        if (!this.server) {
            return
        }

        const payload = {
            conversationId,
            action,
            messageId,
        }

        participantIds.forEach((participantId) => {
            this.server.to(`user:${participantId}`).emit(
                'messages:conversation-updated',
                payload,
            )
        })
    }
}
