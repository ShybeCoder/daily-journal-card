export const SECURITY_QUESTIONS = [
  {
    key: 'mother_maiden_name',
    label: "Your mother's maiden name",
  },
  {
    key: 'birth_city',
    label: 'What city were you born in',
  },
  {
    key: 'first_pet',
    label: 'The name of your first pet',
  },
]

export const SECURITY_QUESTIONS_BY_KEY = Object.fromEntries(
  SECURITY_QUESTIONS.map((question) => [question.key, question]),
)

export function getSecurityQuestionLabel(key) {
  return SECURITY_QUESTIONS_BY_KEY[key]?.label ?? 'Security question'
}
