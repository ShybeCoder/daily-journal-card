import { logoutResponse } from '../../_lib/auth.js'

export async function onRequestPost(context) {
  return logoutResponse(context)
}
