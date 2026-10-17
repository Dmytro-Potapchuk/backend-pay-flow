import { Connection } from 'mongoose'
import { runMoneyTransaction } from './mongo-transaction'

describe('runMoneyTransaction', () => {
    it('skips a session on a standalone MongoDB deployment', async () => {
        const connection = {
            getClient: () => ({
                topology: { description: { type: 'Single' } },
            }),
            startSession: jest.fn(),
        }

        const result = await runMoneyTransaction(
            connection as unknown as Connection,
            async (session) => {
                expect(session).toBeNull()
                return 'saved'
            },
        )

        expect(result).toBe('saved')
        expect(connection.startSession).not.toHaveBeenCalled()
    })

    it('retries without a session when the server rejects transactions', async () => {
        const session = {
            startTransaction: jest.fn(),
            commitTransaction: jest.fn(),
            abortTransaction: jest.fn().mockResolvedValue(undefined),
            endSession: jest.fn().mockResolvedValue(undefined),
        }
        const connection = {
            getClient: () => ({
                topology: { description: { type: 'Unknown' } },
            }),
            startSession: jest.fn().mockResolvedValue(session),
        }
        const work = jest.fn(async (activeSession: unknown) => {
            if (activeSession) {
                throw new Error(
                    'Transaction numbers are only allowed on a replica set member or mongos',
                )
            }
            return 'saved-without-session'
        })

        await expect(
            runMoneyTransaction(connection as unknown as Connection, work),
        ).resolves.toBe('saved-without-session')
        expect(work).toHaveBeenCalledTimes(2)
        expect(session.abortTransaction).toHaveBeenCalled()
        expect(session.endSession).toHaveBeenCalled()
    })
})