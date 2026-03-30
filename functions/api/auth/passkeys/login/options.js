import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { getRelyingParty, storePasskeyChallenge } from '../../../../_lib/auth.js'
import { json } from '../../../../_lib/response.js'

export async function onRequestPost(context) {
  const { rpID } = getRelyingParty(context)
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
  })

  const challenge = await storePasskeyChallenge(context, {
    challenge: options.challenge,
    purpose: 'passkey-login',
  })

  return json(
    { options },
    {
      headers: challenge.headers,
    },
  )
}
