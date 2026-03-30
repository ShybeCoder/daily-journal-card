import {
  getUserById,
  hashSecurityAnswer,
  requireUser,
} from '../../../_lib/auth.js'
import { error, json } from '../../../_lib/response.js'
import { SECURITY_QUESTIONS_BY_KEY } from '../../../../shared/securityQuestions.js'

export async function onRequestPost(context) {
  const session = await requireUser(context)
  if (session.response) {
    return session.response
  }

  const { securityQuestionKey, securityAnswer } = await context.request.json()

  if (!SECURITY_QUESTIONS_BY_KEY[securityQuestionKey]) {
    return error('Please choose a security question.')
  }

  if (!securityAnswer?.trim()) {
    return error('Please answer your security question.')
  }

  await context.env.DB.prepare(
    'UPDATE users SET security_question_key = ?, security_answer_hash = ? WHERE id = ?',
  )
    .bind(
      securityQuestionKey,
      await hashSecurityAnswer(securityAnswer),
      session.user.id,
    )
    .run()

  return json({
    success: true,
    user: await getUserById(context, session.user.id),
    message: 'Your recovery question has been updated.',
  })
}
