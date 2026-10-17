import { createHash, timingSafeEqual } from 'crypto'
import { UnauthorizedException } from '@nestjs/common'

const HASH_BY_ALGORITHM: Record<string, string> = {
    MD5: 'md5',
    'SHA-256': 'sha256',
    SHA256: 'sha256',
}

export function assertPayuNotificationSignature(
    rawBody: Buffer | undefined,
    signatureHeader: string | string[] | undefined,
    secondKey: string,
): void {
    if (!rawBody?.length || !secondKey) {
        throw new UnauthorizedException('Invalid PayU signature')
    }

    const header = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader
    const parts = header ? parseSignatureHeader(header) : {}
    const algorithm = (parts.algorithm ?? '').toUpperCase()
    const hashName = HASH_BY_ALGORITHM[algorithm]
    const signature = (parts.signature ?? '').toLowerCase()

    if (!hashName || !/^[0-9a-f]+$/i.test(signature)) {
        throw new UnauthorizedException('Invalid PayU signature')
    }

    const calculated = createHash(hashName)
        .update(rawBody)
        .update(secondKey)
        .digest('hex')
    const actual = Buffer.from(calculated, 'hex')
    const expected = Buffer.from(signature, 'hex')

    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
        throw new UnauthorizedException('Invalid PayU signature')
    }
}

function parseSignatureHeader(header: string): Record<string, string> {
    const result: Record<string, string> = {}

    for (const part of header.split(';')) {
        const separator = part.indexOf('=')
        if (separator === -1) {
            continue
        }

        const key = part.slice(0, separator).trim().toLowerCase()
        result[key] = part.slice(separator + 1).trim()
    }

    return result
}
