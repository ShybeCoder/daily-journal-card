import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { clearPasskeyChallenge, buildAuthResponse, getPasskeyChallenge, getRelyingParty } from '../../../../_lib/auth.js'
import { buildCredential } from '../../../../_lib/passkeys.js'
import { error } from '../../../../_lib/response.js'

export async function onRequestPost(context) {
  const { response } = await context.request.json()
  if (!response?.id) {
    return error('That passkey response was incomplete.')
  }

  const challenge = await getPasskeyChallenge(context, 'passkey-login')
  if (!challenge) {
    return error('That passkey request expired. Please try again.')
  }

  const passkey = await context.env.DB.prepare(
    `SELECT
      passkeys.*,
      users.email
     FROM passkeys
     JOIN users ON users.id = passkeys.user_id
     WHERE passkeys.credential_id = ?`,
  )
    .bind(response.id)
    .first()

  if (!passkey) {
    return error("We couldn't match that passkey to an account.", 404)
  }

  const { origin, rpID } = getRelyingParty(context)
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: buildCredential(passkey),
  })

  if (!verification.verified) {
    return error("We couldn't verify that passkey.", 401)
  }

  await context.env.DB.prepare(
    `UPDATE passkeys
     SET counter = ?, device_type = ?, backed_up = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(
      verification.authenticationInfo.newCounter,
      verification.authenticationInfo.credentialDeviceType,
      verification.authenticationInfo.credentialBackedUp ? 1 : 0,
      new Date().toISOString(),
      passkey.id,
    )
    .run()

  const headers = await clearPasskeyChallenge(context, challenge.id)
  return buildAuthResponse(context, passkey.user_id, 200, headers)
}
