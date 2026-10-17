import { ClientSession, Connection } from 'mongoose'

export async function runMoneyTransaction<T>(
    connection: Connection,
    work: (session: ClientSession | null) => Promise<T>,
): Promise<T> {
    if (topologySupportsTransactions(connection) === false) {
        return work(null)
    }

    let session: ClientSession
    try {
        session = await connection.startSession()
    } catch (error) {
        if (isTransactionsUnsupported(error)) {
            return work(null)
        }
        throw error
    }

    try {
        session.startTransaction()
        const result = await work(session)
        await session.commitTransaction()
        return result
    } catch (error) {
        await session.abortTransaction().catch(() => undefined)
        if (isTransactionsUnsupported(error)) {
            return work(null)
        }
        throw error
    } finally {
        await session.endSession()
    }
}

function topologySupportsTransactions(connection: Connection): boolean | null {
    const client = connection.getClient?.() as {
        topology?: { description?: { type?: string } }
    } | undefined
    const type = client?.topology?.description?.type

    if (!type || type === 'Unknown') {
        return null
    }

    return type === 'ReplicaSetWithPrimary'
        || type === 'Sharded'
        || type === 'LoadBalanced'
}

function isTransactionsUnsupported(error: unknown): boolean {
    const message = errorText(error)
    return (
        message.includes('Transaction numbers are only allowed') ||
        message.includes('replica set member') ||
        message.includes('transactions are not supported')
    )
}

function errorText(error: unknown): string {
    if (!error || typeof error !== 'object') {
        return String(error)
    }

    const record = error as {
        message?: string
        errmsg?: string
        errorResponse?: { errmsg?: string }
        cause?: unknown
    }

    return [
        record.message,
        record.errmsg,
        record.errorResponse?.errmsg,
        record.cause ? errorText(record.cause) : '',
    ].filter(Boolean).join(' ')
}
