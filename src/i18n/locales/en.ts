import type { TranslationKey } from './ja'

/**
 * 英語ロケール — ja.ts と同じキーセットを持つ必要がある。
 * キーが不足すると TypeScript コンパイルエラーになる。
 */
export const en: Record<TranslationKey, string> = {
  // ---- UI: App ----
  'ui.pickButton': 'Random Pick!',
  'ui.repickButton': 'Pick Again',
  'ui.shareButton': 'Share on X',
  'ui.backButton': '← Change Settings',
  'ui.addPlayer': 'Add Player',
  'ui.addPlayerSymbol': '+',
  'ui.mobileConfiguring': '▶ Active',
  'ui.mobileTap': 'Tap',

  // ---- UI: Header ----
  'header.subtitle': 'Randomly pick Valorant agents',
  'header.ariaLabel': 'Site header',
  'header.languageToggle': 'Switch language to Japanese',

  // ---- UI: Footer ----
  'footer.copyright': '© 2025–{{year}} fesyukijp',
  'footer.bugReport': 'Bug Reports & Feedback',
  'footer.twitter': 'X (Twitter)',
  'footer.bugReportAriaLabel': 'Bug reports & feedback (opens in new tab)',
  'footer.twitterAriaLabel': 'X (Twitter) (opens in new tab)',
  'footer.ariaLabel': 'Site footer',

  // ---- UI: Player ----
  'player.defaultName': 'Player {{n}}',
  'player.deleteAriaLabel': 'Remove player',
  'player.nameAriaLabel': "{{name}}'s name",
  'player.roleSettings': 'Role Settings',
  'player.agentSettings': 'Agent Settings',
  'player.notPicked': 'Not picked yet',
  'player.reroll': 'Reroll',

  // ---- UI: Role Settings ----
  'role.selectAtLeastOne': 'Select at least one role',
  'role.allOn': 'All On',
  'role.allOff': 'All Off',
  'role.allOnAriaLabel': 'Enable all roles',
  'role.allOffAriaLabel': 'Disable all roles',
  'role.toggleOnAriaLabel': 'Disable {{role}} role',
  'role.toggleOffAriaLabel': 'Enable {{role}} role',

  // ---- UI: Agent Settings ----
  'agent.allOn': 'All On',
  'agent.allOff': 'All Off',
  'agent.allOnAriaLabel': 'Enable all agents',
  'agent.allOffAriaLabel': 'Disable all agents',

  // ---- UI: Party Settings ----
  'party.title': 'Party Settings',
  'party.allowDuplicates': 'Allow duplicate agents',
  'party.roleLimits': 'Role Limits',
  'party.reset': 'Reset',
  'party.roleLimitsResetAriaLabel': 'Reset role limits',
  'party.min': 'Min',
  'party.max': 'Max',
  'party.agentConstraints': 'Agent Constraints',
  'party.agentConstraintsResetAriaLabel': 'Reset agent constraints',
  'party.constraintBanned': 'Ban',
  'party.constraintAllowed': 'Allow',
  'party.constraintRequired': 'Req',
  'party.constraintDescription':
    'Ban: exclude from pool / Allow: include in pool / Req: must be picked',
  'party.roleConstraintAriaLabel': 'Set all {{role}} agents to {{label}}',
  'party.agentConstraintAriaLabel': 'Set {{agent}} to {{label}}',

  // ---- UI: Error Boundary ----
  'error.unexpected': 'An unexpected error occurred',
  'error.unexpectedDescription':
    'An unexpected error occurred. Please reload the page.',
  'error.reload': 'Reload Page',

  // ---- X Share ----
  'share.header': "Today's VALORANT agents are decided! 🎲",
  'share.hashtags': '#VALORANT',
  'share.unknownAgent': '?',
  'share.xAriaLabel': 'Share results on X (opens in new tab)',

  // ---- Store errors ----
  'store.rerollRequiresResults': 'Run a pick first before rerolling',

  // ---- Validation errors ----
  'validation.roleMinExceedsMax':
    '{{role}} minimum exceeds maximum. Decrease the minimum or increase the maximum.',
  'validation.totalMinExceedsPlayers':
    'Total role minimums ({{totalMin}}) exceed player count ({{n}}). Reduce role minimums.',
  'validation.requiredExceedsPlayers':
    'Required agents ({{count}}) exceed player count ({{n}}). Remove some required agents.',
  'validation.totalMaxBelowPlayers':
    'Total role maximums ({{totalMax}}) are less than player count ({{n}}). Increase some role maximums.',
  'validation.noRolesSelected': 'Select at least one role for {{name}}.',
  'validation.noCandidates':
    "No agents match {{name}}'s settings. Review exclusion settings.",
  'validation.requiredUnreachable':
    "{{agentId}} is required but not in any player's candidate pool. Review exclusion settings.",
  'validation.requiredExceedsRoleMax':
    '{{role}} has {{count}} required agents but the maximum is {{max}}. Remove required agents or increase the {{role}} maximum.',
  'validation.noDuplicatesInsufficientAgents':
    'Not enough unique agents for all players with duplicates disabled. Reduce exclusions or allow duplicates.',

  // ---- Pick errors ----
  'pick.tooManyPlayers': 'Player count ({{n}}) exceeds bit packing limit (15)',
  'pick.noValidCombination':
    'No valid combination found with current settings. Relax the constraints.',

  // ---- Reroll errors ----
  'reroll.playerNotFound': 'Target player not found',
  'reroll.noResults': 'Results for all players are required. Run a pick first.',
  'reroll.incompleteResults': 'Results for all players are not available',

  // ---- Role names ----
  'roleName.duelist': 'Duelist',
  'roleName.initiator': 'Initiator',
  'roleName.controller': 'Controller',
  'roleName.sentinel': 'Sentinel',

  // ---- Agent names (Valorant official English names) ----
  'agentName.jett': 'Jett',
  'agentName.phoenix': 'Phoenix',
  'agentName.raze': 'Raze',
  'agentName.reyna': 'Reyna',
  'agentName.yoru': 'Yoru',
  'agentName.neon': 'Neon',
  'agentName.iso': 'Iso',
  'agentName.waylay': 'Waylay',
  'agentName.sova': 'Sova',
  'agentName.breach': 'Breach',
  'agentName.skye': 'Skye',
  'agentName.kayo': 'KAY/O',
  'agentName.fade': 'Fade',
  'agentName.gekko': 'Gekko',
  'agentName.tejo': 'Tejo',
  'agentName.brimstone': 'Brimstone',
  'agentName.viper': 'Viper',
  'agentName.omen': 'Omen',
  'agentName.astra': 'Astra',
  'agentName.harbor': 'Harbor',
  'agentName.clove': 'Clove',
  'agentName.miks': 'Miks',
  'agentName.sage': 'Sage',
  'agentName.cypher': 'Cypher',
  'agentName.killjoy': 'Killjoy',
  'agentName.chamber': 'Chamber',
  'agentName.deadlock': 'Deadlock',
  'agentName.vyse': 'Vyse',
  'agentName.veto': 'Veto',
}
