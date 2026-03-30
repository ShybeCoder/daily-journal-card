import { isoBase64URL } from '@simplewebauthn/server/helpers'

export function parseTransports(value) {
  try {
    return JSON.parse(value ?? '[]')
  } catch {
    return []
  }
}

export function buildCredential(record) {
  return {
    id: record.credential_id,
    publicKey: isoBase64URL.toBuffer(record.public_key),
    counter: Number(record.counter ?? 0),
    transports: parseTransports(record.transports),
  }
}

export function formatPasskey(record) {
  return {
    id: record.id,
    createdAt: record.created_at,
    transports: parseTransports(record.transports),
  }
}
