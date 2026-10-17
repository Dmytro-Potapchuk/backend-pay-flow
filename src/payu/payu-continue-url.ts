const PUBLIC_FRONTEND_URL = 'https://dom.payflow.waw.pl'
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])
const APP_SCHEMES = new Set(['payflow:', 'exp:', 'exps:'])

export function resolvePayuContinueUrl(requested?: string): string {
    if (requested && isAllowedPayuContinueUrl(requested)) {
        return requested
    }

    const configured = process.env.FRONTEND_PUBLIC_URL || PUBLIC_FRONTEND_URL
    return `${configured.replace(/\/$/, '')}/payu-result`
}

export function isAllowedPayuContinueUrl(value: string): boolean {
    let url: URL
    try {
        url = new URL(value)
    } catch {
        return false
    }

    if (APP_SCHEMES.has(url.protocol)) {
        const path = `${url.hostname}${url.pathname}`.toLowerCase()
        return path.includes('payu-result')
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return false
    }

    const path = url.pathname.replace(/\/$/, '')
    if (!path.endsWith('/payu-result')) {
        return false
    }

    if (LOCAL_HOSTS.has(url.hostname)) {
        return url.port !== ''
    }

    return allowedPublicOrigins().includes(url.origin)
}

function allowedPublicOrigins(): string[] {
    return [process.env.FRONTEND_PUBLIC_URL, PUBLIC_FRONTEND_URL]
        .filter((value): value is string => Boolean(value))
        .map((value) => {
            try {
                return new URL(value).origin
            } catch {
                return ''
            }
        })
        .filter(Boolean)
}
