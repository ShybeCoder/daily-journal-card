import { normalizeEmail } from '../../../_lib/auth.js'
import { error, json } from '../../../_lib/response.js'
import { getSecurityQuestionLabel } from '../../../../shared/securityQuestions.js'

export async function onRequestPost(context) {
  const { email } = await context.request.json()

  if (!email?.trim()) {
    return error('Please enter your email first.')
  }

  const user = await context.env.DB.prepare(
    'SELECT security_question_key FROM users WHERE email = ?',
  )
    .bind(normalizeEmail(email))
    .first()

  if (!user?.security_question_key) {
    return error("We couldn't find a recovery question for that email.", 404)
  }

  return json({
    questionKey: user.security_question_key,
    questionLabel: getSecurityQuestionLabel(user.security_question_key),
  })
}
