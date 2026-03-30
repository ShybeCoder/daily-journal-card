import { hashPassword, requireUser } from '../../_lib/auth.js'
import { error, json } from '../../_lib/response.js'

export async function onRequestPost(context) {
  const session = await requireUser(context)
  if (session.response) {
    return session.response
  }

  const { newPassword, confirmPassword } = await context.request.json()

  if (!newPassword || !confirmPassword) {
    return error('Please enter your new password twice.')
  }

  if (newPassword.length < 8) {
    return error('Use at least 8 characters for your new password.')
  }

  if (newPassword !== confirmPassword) {
    return error('Those new passwords do not match.')
  }

  await context.env.DB.prepare(
    'UPDATE users SET password_hash = ? WHERE id = ?',
  )
    .bind(await hashPassword(newPassword), session.user.id)
    .run()

  return json({
    success: true,
    user: session.user,
    message: 'Your password has been updated.',
  })
}
