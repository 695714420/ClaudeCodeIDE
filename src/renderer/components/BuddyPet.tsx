import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useAppState } from '../store/AppContext'
import { t } from '../i18n'
import type { Lang } from '../i18n'
import './BuddyPet.css'

// ---- Exact algorithms from Claude Code source (src/buddy/companion.ts) ----

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i); h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const SPECIES = ['duck','goose','blob','cat','dragon','octopus','owl','penguin','turtle','snail','ghost','axolotl','capybara','cactus','robot','rabbit','mushroom','chonk'] as const
type Species = typeof SPECIES[number]
const RARITIES = ['common','uncommon','rare','epic','legendary'] as const
type Rarity = typeof RARITIES[number]
const RARITY_WEIGHTS: Record<Rarity, number> = { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 }
const RARITY_FLOOR: Record<Rarity, number> = { common: 5, uncommon: 15, rare: 25, epic: 35, legendary: 50 }
const RARITY_COLORS: Record<Rarity, string> = { common: '#888', uncommon: '#4ec94e', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b' }
const EYES = ['·','✦','×','★','@','°'] as const
const HATS = ['none','crown','tophat','propeller','halo','wizard','beanie','tinyduck'] as const
type Hat = typeof HATS[number]
const STAT_NAMES = ['DEBUGGING','PATIENCE','CHAOS','WISDOM','SNARK'] as const

const SALT = 'friend-2026-401'

function pick<T>(rng: () => number, arr: readonly T[]): T { return arr[Math.floor(rng() * arr.length)]! }
function rollRarity(rng: () => number): Rarity {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0)
  let roll = rng() * total
  for (const r of RARITIES) { roll -= RARITY_WEIGHTS[r]; if (roll < 0) return r }
  return 'common'
}

interface CompanionBones {
  rarity: Rarity; species: Species; eye: string; hat: Hat; shiny: boolean
  stats: Record<typeof STAT_NAMES[number], number>
}

function rollBones(userId: string): CompanionBones {
  const rng = mulberry32(hashString(userId + SALT))
  const rarity = rollRarity(rng)
  const species = pick(rng, SPECIES)
  const eye = pick(rng, EYES)
  const hat = rarity === 'common' ? 'none' as Hat : pick(rng, HATS)
  const shiny = rng() < 0.01
  const floor = RARITY_FLOOR[rarity]
  const peak = pick(rng, STAT_NAMES)
  let dump = pick(rng, STAT_NAMES)
  while (dump === peak) dump = pick(rng, STAT_NAMES)
  const stats = {} as Record<typeof STAT_NAMES[number], number>
  for (const name of STAT_NAMES) {
    if (name === peak) stats[name] = Math.min(100, floor + 50 + Math.floor(rng() * 30))
    else if (name === dump) stats[name] = Math.max(1, floor - 10 + Math.floor(rng() * 15))
    else stats[name] = floor + Math.floor(rng() * 40)
  }
  return { rarity, species, eye, hat, shiny, stats }
}

// ---- ASCII Art Sprites (from src/buddy/sprites.ts) ----
const E = '{E}'
const BODIES: Record<Species, string[][][]> = {
  duck: [[`            `,`    __      `,`  <(${E} )___  `,`   (  ._>   `,`    \`--´    `],[`            `,`    __      `,`  <(${E} )___  `,`   (  ._>   `,`    \`--´~   `],[`            `,`    __      `,`  <(${E} )___  `,`   (  .__>  `,`    \`--´    `]],
  goose: [[`            `,`     (${E}>    `,`     ||     `,`   _(__)_   `,`    ^^^^    `],[`            `,`    (${E}>     `,`     ||     `,`   _(__)_   `,`    ^^^^    `],[`            `,`     (${E}>>   `,`     ||     `,`   _(__)_   `,`    ^^^^    `]],
  blob: [[`            `,`   .----.   `,`  ( ${E}  ${E} )  `,`  (      )  `,`   \`----´   `],[`            `,`  .------.  `,` (  ${E}  ${E}  ) `,` (        ) `,`  \`------´  `],[`            `,`    .--.    `,`   (${E}  ${E})   `,`   (    )   `,`    \`--´    `]],
  cat: [[`            `,`   /\\_/\\    `,`  ( ${E}   ${E})  `,`  (  ω  )   `,`  (")_(")   `],[`            `,`   /\\_/\\    `,`  ( ${E}   ${E})  `,`  (  ω  )   `,`  (")_(")~  `],[`            `,`   /\\-/\\    `,`  ( ${E}   ${E})  `,`  (  ω  )   `,`  (")_(")   `]],
  dragon: [[`            `,`  /^\\  /^\\  `,` <  ${E}  ${E}  > `,` (   ~~   ) `,`  \`-vvvv-´  `],[`            `,`  /^\\  /^\\  `,` <  ${E}  ${E}  > `,` (        ) `,`  \`-vvvv-´  `],[`   ~    ~   `,`  /^\\  /^\\  `,` <  ${E}  ${E}  > `,` (   ~~   ) `,`  \`-vvvv-´  `]],
  octopus: [[`            `,`   .----.   `,`  ( ${E}  ${E} )  `,`  (______)  `,`  /\\/\\/\\/\\  `],[`            `,`   .----.   `,`  ( ${E}  ${E} )  `,`  (______)  `,`  \\/\\/\\/\\/  `],[`     o      `,`   .----.   `,`  ( ${E}  ${E} )  `,`  (______)  `,`  /\\/\\/\\/\\  `]],
  owl: [[`            `,`   /\\  /\\   `,`  ((${E})(${E}))  `,`  (  ><  )  `,`   \`----´   `],[`            `,`   /\\  /\\   `,`  ((${E})(${E}))  `,`  (  ><  )  `,`   .----.   `],[`            `,`   /\\  /\\   `,`  ((${E})(-))  `,`  (  ><  )  `,`   \`----´   `]],
  penguin: [[`            `,`  .---.     `,`  (${E}>${E})     `,` /(   )\\    `,`  \`---´     `],[`            `,`  .---.     `,`  (${E}>${E})     `,` |(   )|    `,`  \`---´     `],[`  .---.     `,`  (${E}>${E})     `,` /(   )\\    `,`  \`---´     `,`   ~ ~      `]],
  turtle: [[`            `,`   _,--._   `,`  ( ${E}  ${E} )  `,` /[______]\\ `,`  \`\`    \`\`  `],[`            `,`   _,--._   `,`  ( ${E}  ${E} )  `,` /[______]\\ `,`   \`\`  \`\`   `],[`            `,`   _,--._   `,`  ( ${E}  ${E} )  `,` /[======]\\ `,`  \`\`    \`\`  `]],
  snail: [[`            `,` ${E}    .--.  `,`  \\  ( @ )  `,`   \\_\`--´   `,`  ~~~~~~~   `],[`            `,`  ${E}   .--.  `,`  |  ( @ )  `,`   \\_\`--´   `,`  ~~~~~~~   `],[`            `,` ${E}    .--.  `,`  \\  ( @  ) `,`   \\_\`--´   `,`   ~~~~~~   `]],
  ghost: [[`            `,`   .----.   `,`  / ${E}  ${E} \\  `,`  |      |  `,`  ~\`~\`\`~\`~  `],[`            `,`   .----.   `,`  / ${E}  ${E} \\  `,`  |      |  `,`  \`~\`~~\`~\`  `],[`    ~  ~    `,`   .----.   `,`  / ${E}  ${E} \\  `,`  |      |  `,`  ~~\`~~\`~~  `]],
  axolotl: [[`            `,`}~(______)~{`,`}~(${E} .. ${E})~{`,`  ( .--. )  `,`  (_/  \\_)  `],[`            `,`~}(______){~`,`~}(${E} .. ${E}){~`,`  ( .--. )  `,`  (_/  \\_)  `],[`            `,`}~(______)~{`,`}~(${E} .. ${E})~{`,`  (  --  )  `,`  ~_/  \\_~  `]],
  capybara: [[`            `,`  n______n  `,` ( ${E}    ${E} ) `,` (   oo   ) `,`  \`------´  `],[`            `,`  n______n  `,` ( ${E}    ${E} ) `,` (   Oo   ) `,`  \`------´  `],[`    ~  ~    `,`  u______n  `,` ( ${E}    ${E} ) `,` (   oo   ) `,`  \`------´  `]],
  cactus: [[`            `,` n  ____  n `,` | |${E}  ${E}| | `,` |_|    |_| `,`   |    |   `],[`            `,`    ____    `,` n |${E}  ${E}| n `,` |_|    |_| `,`   |    |   `],[` n        n `,` |  ____  | `,` | |${E}  ${E}| | `,` |_|    |_| `,`   |    |   `]],
  robot: [[`            `,`   .[||].   `,`  [ ${E}  ${E} ]  `,`  [ ==== ]  `,`  \`------´  `],[`            `,`   .[||].   `,`  [ ${E}  ${E} ]  `,`  [ -==- ]  `,`  \`------´  `],[`     *      `,`   .[||].   `,`  [ ${E}  ${E} ]  `,`  [ ==== ]  `,`  \`------´  `]],
  rabbit: [[`            `,`   (\\__/)   `,`  ( ${E}  ${E} )  `,` =(  ..  )= `,`  (")__(")  `],[`            `,`   (|__/)   `,`  ( ${E}  ${E} )  `,` =(  ..  )= `,`  (")__(")  `],[`            `,`   (\\__/)   `,`  ( ${E}  ${E} )  `,` =( .  . )= `,`  (")__(")  `]],
  mushroom: [[`            `,` .-o-OO-o-. `,`(__________)`,`   |${E}  ${E}|   `,`   |____|   `],[`            `,` .-O-oo-O-. `,`(__________)`,`   |${E}  ${E}|   `,`   |____|   `],[`   . o  .   `,` .-o-OO-o-. `,`(__________)`,`   |${E}  ${E}|   `,`   |____|   `]],
  chonk: [[`            `,`  /\\    /\\  `,` ( ${E}    ${E} ) `,` (   ..   ) `,`  \`------´  `],[`            `,`  /\\    /|  `,` ( ${E}    ${E} ) `,` (   ..   ) `,`  \`------´  `],[`            `,`  /\\    /\\  `,` ( ${E}    ${E} ) `,` (   ..   ) `,`  \`------´~ `]],
}
const HAT_LINES: Record<Hat, string> = { none:'', crown:'   \\^^^/    ', tophat:'   [___]    ', propeller:'    -+-     ', halo:'   (   )    ', wizard:'    /^\\     ', beanie:'   (___)    ', tinyduck:'    ,>      ' }

function renderSprite(bones: CompanionBones, frame = 0): string[] {
  const frames = BODIES[bones.species]
  const body = frames[frame % frames.length].map(line => line.replaceAll('{E}', bones.eye))
  const lines = [...body]
  if (bones.hat !== 'none' && !lines[0]!.trim()) lines[0] = HAT_LINES[bones.hat]
  if (!lines[0]!.trim() && frames.every(f => !f[0]!.trim())) lines.shift()
  return lines
}

const FALLBACK_NAMES = ['Crumpet','Soup','Pickle','Biscuit','Moth','Gravy','Pixel','Byte','Spark','Glitch','Nova','Echo','Flux','Dash','Ziggy','Mochi','Waffle','Nugget','Sprout']

export function BuddyPet(): JSX.Element {
  const state = useAppState()
  const lang = (state.settings.language ?? 'en') as Lang
  const [frame, setFrame] = useState(0)
  const [visible, setVisible] = useState(true)
  const [showCard, setShowCard] = useState(false)
  const [isPetting, setIsPetting] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [pos, setPos] = useState({ x: 16, y: -1 }) // y=-1 means use default (bottom)
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

  // Load real userId from Claude Code config
  useEffect(() => {
    window.electronAPI.getBuddyUserId().then((id: string | null) => {
      setUserId(id || 'anon')
    }).catch(() => setUserId('anon'))
  }, [])

  const bones = useMemo(() => userId ? rollBones(userId) : null, [userId])
  const name = useMemo(() => {
    if (!bones) return ''
    const idx = (bones.species.charCodeAt(0) + bones.eye.charCodeAt(0)) % FALLBACK_NAMES.length
    return FALLBACK_NAMES[idx]
  }, [bones])

  useEffect(() => {
    const interval = setInterval(() => setFrame(f => f + 1), 600)
    return () => clearInterval(interval)
  }, [])

  const handlePet = useCallback(() => {
    setIsPetting(true)
    setTimeout(() => setIsPetting(false), 2500)
  }, [])

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y === -1 ? window.innerHeight - 120 : pos.y }
  }, [pos])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (!dragRef.current) return
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      setPos({ x: Math.max(0, dragRef.current.origX + dx), y: Math.max(0, dragRef.current.origY + dy) })
    }
    const handleMouseUp = (): void => { dragRef.current = null }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp) }
  }, [])

  if (!bones) return <></>

  const spriteLines = renderSprite(bones, frame)
  const color = RARITY_COLORS[bones.rarity]
  const posStyle = pos.y === -1
    ? { left: pos.x, bottom: 40 } as React.CSSProperties
    : { left: pos.x, top: pos.y } as React.CSSProperties

  if (!visible) {
    return <button className="buddy-show-btn" onClick={() => setVisible(true)} title={t('buddy.show', lang)}>🐾</button>
  }

  return (
    <>
      <div className={`buddy-container ${bones.shiny ? 'shiny' : ''} ${isPetting ? 'petting' : ''}`}
        style={posStyle} onMouseDown={handleMouseDown}
        title={`${name} — 点击查看`}>
        <pre className="buddy-ascii" style={{ color }} onClick={() => setShowCard(!showCard)}>{spriteLines.join('\n')}</pre>
        {isPetting && <div className="buddy-hearts">♥ ♥ ♥</div>}
        <div className="buddy-name-tag" style={{ color }}>{name}</div>
        <div className="buddy-actions-row">
          <button className="buddy-action-btn" onClick={(e) => { e.stopPropagation(); handlePet() }} title={t('buddy.pet', lang)}>🤚</button>
          <button className="buddy-action-btn" onClick={(e) => { e.stopPropagation(); setVisible(false) }} title={t('buddy.hide', lang)}>✕</button>
        </div>
      </div>

      {showCard && (
        <div className="buddy-card-overlay" onClick={() => setShowCard(false)}>
          <div className="buddy-card" onClick={e => e.stopPropagation()}>
            <div className="buddy-card-sprite">
              <pre style={{ color }}>{renderSprite(bones, 0).join('\n')}</pre>
            </div>
            <div className="buddy-card-info">
              <div className="buddy-card-name">{name}</div>
              <div className="buddy-card-species">{bones.species.toUpperCase()}</div>
              <div className="buddy-card-rarity" style={{ color }}>
                {bones.rarity.toUpperCase()}{bones.shiny ? ' ✨ SHINY' : ''}
              </div>
            </div>
            <div className="buddy-card-stats">
              {STAT_NAMES.map(s => (
                <div key={s} className="buddy-stat-row">
                  <span className="buddy-stat-label">{s}</span>
                  <div className="buddy-stat-bar"><div className="buddy-stat-fill" style={{ width: `${bones.stats[s]}%` }} /></div>
                  <span className="buddy-stat-val">{bones.stats[s]}</span>
                </div>
              ))}
            </div>
            <button className="buddy-card-close" onClick={() => setShowCard(false)}>{t('buddy.close', lang)}</button>
          </div>
        </div>
      )}
    </>
  )
}
