import type { TranslationKey } from './locales/ja'
import type { RoleId } from '../logic/types'

export type Language = 'ja' | 'en'

export type TranslateFunction = (
  key: TranslationKey,
  params?: Record<string, string | number>,
) => string

/** agentName.{id} 形式のキーを型安全に生成する */
export type AgentNameKey = `agentName.${string}` & TranslationKey

/** roleName.{roleId} 形式のキーを型安全に生成する */
export type RoleNameKey = `roleName.${RoleId}` & TranslationKey

/**
 * ロジック層がUI層に返す構造化エラー。
 * ロジック層は翻訳済み文字列ではなくキー + パラメータを返し、
 * UI 層（コンポーネントまたはストア）が翻訳を担当する。
 */
export interface TranslatableMessage {
  key: TranslationKey
  params?: Record<string, string | number>
}
