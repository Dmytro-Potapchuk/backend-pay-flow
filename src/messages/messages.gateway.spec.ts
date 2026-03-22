import { JwtService } from '@nestjs/jwt'

import { MessagesGateway } from './messages.gateway'

describe('MessagesGateway', () => {
    let gateway: MessagesGateway
    let jwtService: { verifyAsync: jest.Mock }

    beforeEach(() => {
        jwtService = {
            verifyAsync: jest.fn(),
        }

        gateway = new MessagesGateway(jwtService as unknown as JwtService)
    })

    it('should be defined', () => {
        expect(gateway).toBeDefined()
    })

    describe('handleConnection', () => {
        it('should authenticate with token from auth payload', async () => {
            const socket = {
                handshake: {
                    auth: { token: 'Bearer token-123' },
                    headers: {},
                },
                data: {},
                join: jest.fn(),
                disconnect: jest.fn(),
            }
            jwtService.verifyAsync.mockResolvedValue({ userId: 'user-1' })

            await gateway.handleConnection(socket as never)

            expect(jwtService.verifyAsync).toHaveBeenCalledWith('token-123')
            expect(socket.data.user).toEqual({ userId: 'user-1' })
            expect(socket.join).toHaveBeenCalledWith('user:user-1')
            expect(socket.disconnect).not.toHaveBeenCalled()
        })

        it('should authenticate with token from authorization header', async () => {
            const socket = {
                handshake: {
                    auth: {},
                    headers: { authorization: 'Bearer header-token' },
                },
                data: {},
                join: jest.fn(),
                disconnect: jest.fn(),
            }
            jwtService.verifyAsync.mockResolvedValue({ userId: 'user-2' })

            await gateway.handleConnection(socket as never)

            expect(jwtService.verifyAsync).toHaveBeenCalledWith('header-token')
            expect(socket.join).toHaveBeenCalledWith('user:user-2')
        })

        it('should disconnect socket when token verification fails', async () => {
            const socket = {
                handshake: {
                    auth: {},
                    headers: {},
                },
                data: {},
                join: jest.fn(),
                disconnect: jest.fn(),
            }
            jwtService.verifyAsync.mockRejectedValue(new Error('invalid token'))

            await gateway.handleConnection(socket as never)

            expect(socket.disconnect).toHaveBeenCalledWith(true)
            expect(socket.join).not.toHaveBeenCalled()
        })
    })

    describe('conversation rooms', () => {
        it('should join conversation room when id exists', () => {
            const socket = { join: jest.fn() }

            gateway.handleJoinConversation(socket as never, {
                conversationId: 'conv-1',
            })

            expect(socket.join).toHaveBeenCalledWith('conversation:conv-1')
        })

        it('should ignore join when conversation id is missing', () => {
            const socket = { join: jest.fn() }

            gateway.handleJoinConversation(socket as never, {})

            expect(socket.join).not.toHaveBeenCalled()
        })

        it('should leave conversation room when id exists', () => {
            const socket = { leave: jest.fn() }

            gateway.handleLeaveConversation(socket as never, {
                conversationId: 'conv-2',
            })

            expect(socket.leave).toHaveBeenCalledWith('conversation:conv-2')
        })

        it('should ignore leave when conversation id is missing', () => {
            const socket = { leave: jest.fn() }

            gateway.handleLeaveConversation(socket as never, {})

            expect(socket.leave).not.toHaveBeenCalled()
        })
    })

    describe('emitConversationUpdate', () => {
        it('should do nothing when server is unavailable', () => {
            gateway.emitConversationUpdate(['user-1'], 'conv-1', 'created')
        })

        it('should emit updates to each participant room', () => {
            const emit = jest.fn()
            const to = jest.fn().mockReturnValue({ emit })
            gateway.server = { to } as never

            gateway.emitConversationUpdate(
                ['user-1', 'user-2'],
                'conv-1',
                'message',
                'msg-1',
            )

            expect(to).toHaveBeenNthCalledWith(1, 'user:user-1')
            expect(to).toHaveBeenNthCalledWith(2, 'user:user-2')
            expect(emit).toHaveBeenCalledWith('messages:conversation-updated', {
                conversationId: 'conv-1',
                action: 'message',
                messageId: 'msg-1',
            })
        })
    })
})
