import { describe, it, expect } from 'vitest'
import { AGENTS, ROLES } from '../../../src/data/agents'
import { ja } from '../../../src/i18n/locales/ja'
import { en } from '../../../src/i18n/locales/en'
import type { TranslationKey } from '../../../src/i18n/locales/ja'

describe('agent/role locale key coverage', () => {
  it('every agent has a corresponding agentName key in ja', () => {
    for (const agent of AGENTS) {
      const key = `agentName.${agent.id}` as TranslationKey
      expect(ja[key], `missing ja key for agent "${agent.id}"`).toBeDefined()
      expect(ja[key]).not.toBe('')
    }
  })

  it('every agent has a corresponding agentName key in en', () => {
    for (const agent of AGENTS) {
      const key = `agentName.${agent.id}` as TranslationKey
      expect(en[key], `missing en key for agent "${agent.id}"`).toBeDefined()
      expect(en[key]).not.toBe('')
    }
  })

  it('every role has a corresponding roleName key in ja', () => {
    for (const role of ROLES) {
      const key = `roleName.${role.id}` as TranslationKey
      expect(ja[key], `missing ja key for role "${role.id}"`).toBeDefined()
      expect(ja[key]).not.toBe('')
    }
  })

  it('every role has a corresponding roleName key in en', () => {
    for (const role of ROLES) {
      const key = `roleName.${role.id}` as TranslationKey
      expect(en[key], `missing en key for role "${role.id}"`).toBeDefined()
      expect(en[key]).not.toBe('')
    }
  })

  it('ja agentName values match agents.ts name field', () => {
    for (const agent of AGENTS) {
      const key = `agentName.${agent.id}` as TranslationKey
      expect(ja[key], `ja agentName mismatch for "${agent.id}"`).toBe(
        agent.name,
      )
    }
  })

  it('ja roleName values match ROLES name field', () => {
    for (const role of ROLES) {
      const key = `roleName.${role.id}` as TranslationKey
      expect(ja[key], `ja roleName mismatch for "${role.id}"`).toBe(role.name)
    }
  })
})
