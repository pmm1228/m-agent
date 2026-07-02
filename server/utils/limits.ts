export const MAX_CHAT_MESSAGE_LENGTH = 4000
export const MAX_TODO_TITLE_LENGTH = 120
export const MAX_CONVERSATION_TITLE_LENGTH = 80
export const AI_REQUEST_TIMEOUT_MS = 60_000

export function assertMaxLength(value: string, maxLength: number, label: string) {
  if (value.length > maxLength) {
    throw createError({
      statusCode: 400,
      statusMessage: `${label}不能超过 ${maxLength} 个字符`
    })
  }
}
