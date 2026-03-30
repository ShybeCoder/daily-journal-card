import {
  buildAuthResponse,
  hashPassword,
  hashSecurityAnswer,
  normalizeEmail,
} from '../../_lib/auth.js'
import { ensureSeedData } from '../../_lib/journal.js'
import { error } from '../../_lib/response.js'
import { SECURITY_QUESTIONS_BY_KEY } from '../../../shared/securityQuestions.js'

export async function onRequestPost(context) {
  const { email, password, securityQuestionKey, securityAnswer } = await context.request.json()
  if (!email || !password) return error('Please enter an email and password.')
  if (password.length < 8) return error('Use at least 8 characters for your password.')
  if (!SECURITY_QUESTIONS_BY_KEY[securityQuestionKey]) {
    return error('Please choose a security question.')
  }
  if (!securityAnswer?.trim()) {
    return error('Please answer your security question.')
  }

  const normalizedEmail = normalizeEmail(email)
  const existingUser = await context.env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(normalizedEmail)
    .first()

  if (existingUser) return error('That email is already in use.')

  const userId = crypto.randomUUID()
  await context.env.DB.prepare(
    `INSERT INTO users (
      id,
      email,
      password_hash,
      security_question_key,
      security_answer_hash
    ) VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(
      userId,
      normalizedEmail,
      await hashPassword(password),
      securityQuestionKey,
      await hashSecurityAnswer(securityAnswer),
    )
    .run()

  await ensureSeedData(context, userId)
  return buildAuthResponse(context, userId, 201)
}
