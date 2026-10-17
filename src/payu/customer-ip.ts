import { isIP } from 'net'

type HeaderValue = string | string[] | undefined

export function resolveCustomerIp(request: {
    ip?: string
    headers: Record<string, HeaderValue>
}): string {
    const forwarded = request.headers['x-forwarded-for']
    const headerValue = Array.isArray(forwarded) ? forwarded[0] : forwarded
    const candidates = [
        ...(headerValue ? headerValue.split(',') : []),
        request.ip ?? '',
    ]

    for (const candidate of candidates) {
        const normalized = candidate.trim().replace(/^::ffff:/, '')
        if (!isIP(normalized) || normalized === '127.0.0.1' || normalized === '::1') {
            continue
        }
        return normalized
    }

    return '127.0.0.1'
}
