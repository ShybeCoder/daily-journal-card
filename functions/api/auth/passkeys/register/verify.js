import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { isoBase64URL } from '@simplewebauthn/server/helpers'
import {
  clearPasskeyChallenge,
  getPasskeyChallenge,
  getRelyingParty,
  getUserById,
  requireUser,
} from '../../../../_lib/auth.js'
import { error, json } from '../../../../_lib/response.js'

export async function onRequestPost(context) {
  const session = await requireUser(context)
  if (session.response) {
    return session.response
  }

  const { response } = await context.request.json()
  if (!response?.id) {
    return error('That passkey response was incomplete.')
  }

  const challenge = await getPasskeyChallenge(context, 'passkey-register')
  if (!challenge || challenge.user_id !== session.user.id) {
    return error('That passkey request expired. Please try again.')
  }

  const { origin, rpID } = getRelyingParty(context)
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  })

  if (!verification.verified || !verification.registrationInfo) {
    return error("We couldn't save that passkey.", 400)
  }

  await context.env.DB.prepare(
    `INSERT INTO passkeys (
      id,
      user_id,
      credential_id,
      public_key,
      counter,
      transports,
      device_type,
      backed_up,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      session.user.id,
      verification.registrationInfo.credential.id,
      isoBase64URL.fromBuffer(verification.registrationInfo.credential.publicKey),
      verification.registrationInfo.credential.counter,
      JSON.stringify(response.response.transports ?? []),
      verification.registrationInfo.credentialDeviceType,
      verification.registrationInfo.credentialBackedUp ? 1 : 0,
      new Date().toISOString(),
      new Date().toISOString(),
    )
    .run()

  const headers = await clearPasskeyChallenge(context, challenge.id)

  return json(
    {
      success: true,
      user: await getUserById(context, session.user.id),
      message: 'Passkey added.',
    },
    {
      headers,
    },
  )
}
