/**
 * 日本語ロケール — 翻訳キーの正規ソース。
 * 新しいキーはここに追加し、en.ts にも同じキーを追加すること。
 */
export const ja = {
  // ---- UI: App ----
  'ui.pickButton': 'ランダムピック！',
  'ui.repickButton': 'もう一度ピック',
  'ui.shareButton': 'Xでシェア',
  'ui.backButton': '← 条件を変更する',
  'ui.addPlayer': 'プレイヤーを追加',
  'ui.addPlayerSymbol': '＋',
  'ui.mobileConfiguring': '▶ 設定中',
  'ui.mobileTap': 'タップ',

  // ---- UI: Header ----
  'header.subtitle': 'Valorantエージェントをランダムに選択',
  'header.ariaLabel': 'サイトヘッダー',
  'header.languageToggle': '言語を英語に切り替える',

  // ---- UI: Footer ----
  'footer.copyright': '© 2025–{{year}} fesyukijp',
  'footer.bugReport': 'バグ報告・要望',
  'footer.twitter': 'X (Twitter)',
  'footer.bugReportAriaLabel': 'バグ報告・要望（新しいタブで開く）',
  'footer.twitterAriaLabel': 'X (Twitter)（新しいタブで開く）',
  'footer.ariaLabel': 'サイトフッター',

  // ---- UI: Player ----
  'player.defaultName': 'プレイヤー{{n}}',
  'player.deleteAriaLabel': 'プレイヤーを削除',
  'player.nameAriaLabel': '{{name}}の名前',
  'player.roleSettings': 'ロール設定',
  'player.agentSettings': 'エージェント設定',
  'player.notPicked': 'エージェント未抽選',
  'player.reroll': '再抽選',

  // ---- UI: Role Settings ----
  'role.selectAtLeastOne': 'ロールを1つ以上選択してください',
  'role.allOn': 'すべてオン',
  'role.allOff': 'すべてオフ',
  'role.allOnAriaLabel': 'すべてのロールをオンにする',
  'role.allOffAriaLabel': 'すべてのロールをオフにする',
  'role.toggleOnAriaLabel': '{{role}}ロールをオフにする',
  'role.toggleOffAriaLabel': '{{role}}ロールをオンにする',

  // ---- UI: Agent Settings ----
  'agent.allOn': 'すべてオン',
  'agent.allOff': 'すべてオフ',
  'agent.allOnAriaLabel': 'すべてのエージェントをオンにする',
  'agent.allOffAriaLabel': 'すべてのエージェントをオフにする',

  // ---- UI: Party Settings ----
  'party.title': '全体設定',
  'party.allowDuplicates': '同じエージェントの重複を許可',
  'party.roleLimits': 'ロール人数制限',
  'party.reset': 'リセット',
  'party.roleLimitsResetAriaLabel': 'ロール人数制限をリセット',
  'party.min': '最小',
  'party.max': '最大',
  'party.agentConstraints': 'エージェント制約',
  'party.agentConstraintsResetAriaLabel': 'エージェント制約をリセット',
  'party.constraintBanned': '除外',
  'party.constraintAllowed': '対象',
  'party.constraintRequired': '必須',
  'party.constraintDescription':
    '除外: ピックから外す / 対象: ピックプールに含む / 必須: 必ずピックされる',
  'party.roleConstraintAriaLabel': '{{role}}の全エージェントを{{label}}に設定',
  'party.agentConstraintAriaLabel': '{{agent}}を{{label}}に設定',

  // ---- UI: Error Boundary ----
  'error.unexpected': '予期しないエラーが発生しました',
  'error.unexpectedDescription':
    '予期しないエラーが発生しました。ページを再読み込みしてください。',
  'error.reload': 'ページを再読み込み',

  // ---- X Share ----
  'share.header': '今日のVALORANTエージェントはこれで決まり！🎲',
  'share.hashtags': '#VALORANT #ヴァロラント',
  'share.unknownAgent': '？',
  'share.xAriaLabel': '結果をXでシェア（新しいタブで開きます）',

  // ---- Store errors ----
  'store.rerollRequiresResults': '再抽選するには先に抽選を実行してください',

  // ---- Validation errors ----
  'validation.roleMinExceedsMax':
    '{{role}}の最小人数が最大人数を超えています。最小を減らすか、最大を増やしてください',
  'validation.totalMinExceedsPlayers':
    'ロールの最小人数の合計（{{totalMin}}人）がプレイヤー数（{{n}}人）を超えています。各ロールの最小人数を減らしてください',
  'validation.requiredExceedsPlayers':
    '必須エージェント数（{{count}}体）がプレイヤー数（{{n}}人）を超えています。必須エージェントを減らしてください',
  'validation.totalMaxBelowPlayers':
    'ロールの最大人数の合計（{{totalMax}}人）がプレイヤー数（{{n}}人）未満です。いずれかのロールの上限を増やしてください',
  'validation.noRolesSelected': '{{name}}のロールを1つ以上選択してください',
  'validation.noCandidates':
    '{{name}}の条件に合うエージェントがいません。除外設定を見直してください',
  'validation.requiredUnreachable':
    '{{agentId}}を必須にしていますが、誰の候補にも含まれていません。除外設定を見直してください',
  'validation.requiredExceedsRoleMax':
    '{{role}}の必須エージェントが{{count}}体ですが、上限は{{max}}人です。必須エージェントを減らすか、{{role}}の上限を増やしてください',
  'validation.noDuplicatesInsufficientAgents':
    '重複不可の状態で、全プレイヤーに割り当てられるエージェントの種類が足りません。除外設定を緩めるか、重複を許可してください',

  // ---- Pick errors ----
  'pick.tooManyPlayers':
    'プレイヤー数（{{n}}人）がビットパッキング上限（15人）を超えています',
  'pick.noValidCombination':
    '現在の条件では有効な組み合わせが見つかりません。条件を緩和してください',

  // ---- Reroll errors ----
  'reroll.playerNotFound': '対象プレイヤーが見つかりません',
  'reroll.noResults':
    '全プレイヤー分の結果が揃っていません。先に抽選を実行してください',
  'reroll.incompleteResults': '全プレイヤーの結果が含まれていません',

  // ---- Role names ----
  'roleName.duelist': 'デュエリスト',
  'roleName.initiator': 'イニシエーター',
  'roleName.controller': 'コントローラー',
  'roleName.sentinel': 'センチネル',

  // ---- Agent names ----
  'agentName.jett': 'ジェット',
  'agentName.phoenix': 'フェニックス',
  'agentName.raze': 'レイズ',
  'agentName.reyna': 'レイナ',
  'agentName.yoru': 'ヨル',
  'agentName.neon': 'ネオン',
  'agentName.iso': 'アイソ',
  'agentName.waylay': 'ウェイレイ',
  'agentName.sova': 'ソーヴァ',
  'agentName.breach': 'ブリーチ',
  'agentName.skye': 'スカイ',
  'agentName.kayo': 'KAY/O',
  'agentName.fade': 'フェイド',
  'agentName.gekko': 'ゲッコー',
  'agentName.tejo': 'テホ',
  'agentName.brimstone': 'ブリムストーン',
  'agentName.viper': 'ヴァイパー',
  'agentName.omen': 'オーメン',
  'agentName.astra': 'アストラ',
  'agentName.harbor': 'ハーバー',
  'agentName.clove': 'クローヴ',
  'agentName.miks': 'ミクス',
  'agentName.sage': 'セージ',
  'agentName.cypher': 'サイファー',
  'agentName.killjoy': 'キルジョイ',
  'agentName.chamber': 'チェンバー',
  'agentName.deadlock': 'デッドロック',
  'agentName.vyse': 'ヴァイス',
  'agentName.veto': 'ヴィトー',
} as const

export type TranslationKey = keyof typeof ja
