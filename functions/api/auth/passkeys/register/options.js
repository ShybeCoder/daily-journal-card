import { generateRegistrationOptions } from '@simplewebauthn/server'
import { getRelyingParty, requireUser, storePasskeyChallenge } from '../../../../_lib/auth.js'
import { parseTransports } from '../../../../_lib/passkeys.js'
import { json } from '../../../../_lib/response.js'

export async function onRequestPost(context) {
  const session = await requireUser(context)
  if (session.response) {
    return session.response
  }

  const existingPasskeys =
    (await context.env.DB.prepare(
      `SELECT credential_id, transports
       FROM passkeys
       WHERE user_id = ?`,
    )
      .bind(session.user.id)
      .all()).results ?? []

  const { rpID, rpName } = getRelyingParty(context)
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new TextEncoder().encode(session.user.id),
    userName: session.user.email,
    userDisplayName: session.user.email,
    attestationType: 'none',
    excludeCredentials: existingPasskeys.map((passkey) => ({
      id: passkey.credential_id,
      transports: parseTransports(passkey.transports),
    })),
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'preferred',
    },
  })

  const challenge = await storePasskeyChallenge(context, {
    challenge: options.challenge,
    purpose: 'passkey-register',
    userId: session.user.id,
    email: session.user.email,
  })

  return json(
    { options },
    {
      headers: challenge.headers,
    },
  )
}
