import { generateKeyPairSync, sign } from 'node:crypto'

const SEQUENCE = 0x30
const SET = 0x31
const INTEGER = 0x02
const BIT_STRING = 0x03
const UTF8_STRING = 0x0c
const UTC_TIME = 0x17
// The object identifiers of an ECDSA signature over SHA-256 and of a name's common name, DER-encoded.
const ECDSA_WITH_SHA256 = Buffer.from('06082a8648ce3d040302', 'hex')
const COMMON_NAME = Buffer.from('0603550403', 'hex')
const DAY_MS = 86_400_000
const PEM_LINE_LENGTH = 64

// One DER value: its tag, its length and its content.
const der = (tag: number, ...content: readonly Buffer[]): Buffer => {
  const body = Buffer.concat(content)
  const lengthBytes: number[] = []
  for (let rest = body.length; rest > 0; rest = Math.floor(rest / 256)) {
    lengthBytes.unshift(rest % 256)
  }
  const isShort = body.length < 128
  const length = isShort ? [body.length] : [128 + lengthBytes.length, ...lengthBytes]
  return Buffer.concat([Buffer.from([tag, ...length]), body])
}

const utcTime = (date: Date): Buffer =>
  der(UTC_TIME, Buffer.from(`${date.toISOString().replace(/[-:T]/g, '').slice(2, 14)}Z`))

// A certificate no authority vouches for, with its private key, made new on each call: what a local
// or staging site serves. Nothing is read from or written to disk.
export const createSelfSignedCertificate = (
  host: string
): { readonly key: string; readonly cert: string } => {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
  const algorithm = der(SEQUENCE, ECDSA_WITH_SHA256)
  const name = der(
    SEQUENCE,
    der(SET, der(SEQUENCE, COMMON_NAME, der(UTF8_STRING, Buffer.from(host))))
  )
  const now = Date.now()
  const validity = der(SEQUENCE, utcTime(new Date(now - DAY_MS)), utcTime(new Date(now + DAY_MS)))
  const certificateBody = der(
    SEQUENCE,
    der(INTEGER, Buffer.from([1])),
    algorithm,
    name,
    validity,
    name,
    publicKey.export({ type: 'spki', format: 'der' })
  )
  const signature = der(BIT_STRING, Buffer.from([0]), sign('sha256', certificateBody, privateKey))
  const certificate = der(SEQUENCE, certificateBody, algorithm, signature).toString('base64')
  const lines = certificate.match(new RegExp(`.{1,${String(PEM_LINE_LENGTH)}}`, 'g')) ?? []
  return {
    key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    cert: `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----\n`
  }
}
