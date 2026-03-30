import {
  buildAuthResponse,
  hashPassword,
  normalizeEmail,
  verifySecurityAnswer,
} from '../../../_lib/auth.js'
import { error } from '../../../_lib/response.js'

export async function onRequestPost(context) {
  const { email, answer, newPassword, confirmPassword } = await context.request.json()

  if (!email?.trim()) {
    return error('Please enter your email first.')
  }

  if (!answer?.trim()) {
    return error('Please answer your security question.')
  }

  if (!newPassword || !confirmPassword) {
    return error('Please enter your new password twice.')
  }

  if (newPassword.length < 8) {
    return error('Use at least 8 characters for your new password.')
  }

  if (newPassword !== confirmPassword) {
    return error('Those new passwords do not match.')
  }

  const user = await context.env.DB.prepare(
    `SELECT id, security_answer_hash
     FROM users
     WHERE email = ?`,
  )
    .bind(normalizeEmail(email))
    .first()

  if (!user?.security_answer_hash) {
    return error("We couldn't verify that answer.", 401)
  }

  if (!(await verifySecurityAnswer(answer, user.security_answer_hash))) {
    return error("We couldn't verify that answer.", 401)
  }

  await context.env.DB.prepare(
    'UPDATE users SET password_hash = ? WHERE id = ?',
  )
    .bind(await hashPassword(newPassword), user.id)
    .run()

  await context.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id).run()

  return buildAuthResponse(context, user.id)
}
