import type {
  Chapter,
  CharacterId,
  CharacterProfile,
  ChoiceId,
  Decision,
  DecisionId,
  DecisionOption,
  DialogueLine,
  HistoricalProduct,
} from './types'

export const SIMULATED_LABEL = 'SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT'
export const SALES_AS_OF = 'As of June 30, 2026'

export const CHARACTERS: Record<CharacterId, CharacterProfile> = {
  mori: {
    id: 'mori',
    name: 'Mori',
    species: 'Owl',
    role: 'Consumer Insight',
    color: '#b88967',
    accent: '#f2d4b4',
    detail: 'Watches who is missing from the table.',
    voice: { wave: 'triangle', base: 310, range: 75, pace: 0.95 },
  },
  pip: {
    id: 'pip',
    name: 'Pip',
    species: 'Fox',
    role: 'Marketing',
    color: '#d9774e',
    accent: '#ffd1a7',
    detail: 'Sells the feeling before the spec sheet.',
    voice: { wave: 'triangle', base: 440, range: 115, pace: 1.15 },
  },
  bolt: {
    id: 'bolt',
    name: 'Bolt',
    species: 'Beaver',
    role: 'Engineering',
    color: '#7c5840',
    accent: '#e4b77a',
    detail: 'Builds it, then tells you what will break.',
    voice: { wave: 'sawtooth', base: 205, range: 55, pace: 1.05 },
  },
  grumble: {
    id: 'grumble',
    name: 'Grumble',
    species: 'Bear',
    role: 'Finance',
    color: '#63504b',
    accent: '#c9ad94',
    detail: 'Counts the cost of every applause line.',
    voice: { wave: 'sine', base: 128, range: 33, pace: 0.78 },
  },
  shell: {
    id: 'shell',
    name: 'Chair Shell',
    species: 'Tortoise',
    role: 'Big Boss',
    color: '#58765c',
    accent: '#d9c27d',
    detail: 'Keeper of the sealed archive.',
    voice: { wave: 'sine', base: 162, range: 36, pace: 0.65 },
  },
  narrator: {
    id: 'narrator',
    name: 'Boardroom',
    species: '',
    role: '',
    color: '#8f93a8',
    accent: '#e9e1d3',
    detail: '',
    voice: { wave: 'sine', base: 240, range: 20, pace: 0.8 },
  },
}

export const OPENING_LINES: readonly DialogueLine[] = [
  {
    speaker: 'narrator',
    text: 'This is a fictional boardroom with five original animal executives and one sealed archive. The products are real; the meeting is a teaching story.',
    mood: 'neutral',
  },
  {
    speaker: 'shell',
    text: 'Welcome to the board. Oh, good, you’re all here. Three launches, four votes, and one archive with a very stubborn lock. I have time. The clock does not.',
    mood: 'pleased',
  },
  {
    speaker: 'mori',
    text: 'I was up late again. I kept thinking about the people who never pick up a controller. Could we start with them?',
    mood: 'thoughtful',
  },
  {
    speaker: 'shell',
    text: 'Your prototypes are make-believe. History stays under seal until the last page. Shall we see what you build?',
    mood: 'neutral',
  },
]

const choice = (option: DecisionOption): DecisionOption => option

const D1_OPTIONS = [
  choice({
    id: 'A',
    title: 'The Power Race',
    shortTitle: 'Power Race',
    detail:
      'Build the most capable machine on the shelf: advanced graphics, media features, and a familiar two-handed controller.',
    benefit: 'A clear appeal to established enthusiasts and big-budget game partners.',
    tradeoff: 'A costly head-to-head fight on ground where rivals already set the pace.',
    conceptTitle: 'The Power Tower',
    conceptDescription:
      'A wide, vented console built for horsepower, paired with a familiar controller for the committed player.',
    prototypeVariant: 'power-tower',
    feedback: {
      speaker: 'grumble',
      text: 'A bigger box. More vents. A controller shaped like the last one. Enthusiasts will nod. My budget just fainted.',
      mood: 'concerned',
    },
    boss: 'You chose the clearest fight. A faster machine may win the shelf. Will it win a place at a family’s table?',
  }),
  choice({
    id: 'B',
    title: 'Open the Living Room',
    shortTitle: 'Living Room',
    detail:
      'Put approachable controls and active family play at the center of the system.',
    benefit: 'Invites households and lapsed players into the same room.',
    tradeoff: 'Core players may shrug; gestures are difficult to make effortless.',
    conceptTitle: 'The Hearth Box',
    conceptDescription:
      'A small, friendly console and a gesture wand designed for a first minute of play — not a manual.',
    prototypeVariant: 'social-box',
    feedback: {
      speaker: 'mori',
      text: 'A room you understand in five minutes. I like that. The family has to feel play before anyone reads a manual.',
      mood: 'pleased',
    },
    boss: 'You’re inviting a new room to play. Can you make the first minute fun before anyone asks for the manual?',
  }),
  choice({
    id: 'C',
    title: 'Play Anywhere',
    shortTitle: 'Anywhere',
    detail:
      'Merge portable and home play now, with one screen that travels and can connect to a TV.',
    benefit: 'A single library that could follow the player between the couch and the road.',
    tradeoff:
      '2005-era batteries, displays, and processors make this a speculative, expensive bet — the right idea may be a decade early.',
    conceptTitle: 'The Pocket Dock',
    conceptDescription:
      'A chunky handheld with a tiny dock: a bold early attempt to make one library follow the player.',
    prototypeVariant: 'early-handheld',
    feedback: {
      speaker: 'bolt',
      text: 'One library in one hand. I love it. In 2005, the battery and the heat send you the bill before the fun starts.',
      mood: 'concerned',
    },
    boss: 'You’d carry the living room in one hand. Is the technology ready, or just early?',
  }),
] as const satisfies readonly DecisionOption[]

const D2_OPTIONS = [
  choice({
    id: 'A',
    title: 'Join the HD Race',
    shortTitle: 'HD Race',
    detail:
      'Raise the technical specifications and court dedicated console enthusiasts with premium games.',
    benefit: 'Meets premium-console expectations and speaks to the core audience.',
    tradeoff: 'Costly direct competition and less room for a distinctive story.',
    conceptTitle: 'The Benchmark Box',
    conceptDescription:
      'A tall, serious chassis with high-end components and a controller built for conventional blockbusters.',
    prototypeVariant: 'hd-console',
    feedback: {
      speaker: 'pip',
      text: 'The HD race is easy to explain. It’s also a race where the other runners know the track. I can sell it. I can’t make us faster.',
      mood: 'thoughtful',
    },
    boss: 'A premium machine speaks to players who already know the language. Can it give the rest of the house a reason to listen?',
  }),
  choice({
    id: 'B',
    title: 'Reinvent the Second Screen',
    shortTitle: 'Second Screen',
    detail:
      'Make a tablet-like controller the heart of shared living-room play, with off-TV use near the console.',
    benefit: 'Creates asymmetric play and lets the TV be shared or freed.',
    tradeoff: 'More hardware to charge and explain; off-TV play stays tied to the base console.',
    conceptTitle: 'The Together Screen',
    conceptDescription:
      'A base console paired with an oversized touch controller. The extra screen is the headline, not an accessory.',
    prototypeVariant: 'second-screen',
    feedback: {
      speaker: 'bolt',
      text: 'I can build the second screen. The catch is making a whole family understand it at a glance. Otherwise it’s a very expensive coaster.',
      mood: 'thoughtful',
    },
    boss: 'The extra screen is memorable. Will a family remember why they needed it, or only that it needed charging?',
  }),
  choice({
    id: 'C',
    title: 'Go Fully Portable',
    shortTitle: 'Portable',
    detail:
      'Combine handheld portability with a broader game library and leave the stationary box behind.',
    benefit: 'Offers mobility and convenience for every play session.',
    tradeoff: 'Cost, battery, graphics, and software portfolio complications arrive together.',
    conceptTitle: 'The Carry Console',
    conceptDescription:
      'A single handheld with a large screen and console ambitions, designed to go everywhere by itself.',
    prototypeVariant: 'portable',
    feedback: {
      speaker: 'grumble',
      text: 'One portable library. Nice. Paying for premium expectations inside that shell is where the arithmetic starts growling.',
      mood: 'concerned',
    },
    boss: 'You chose freedom over the living room. Is that a new market, or a smaller one with better scenery?',
  }),
] as const satisfies readonly DecisionOption[]

const D3_OPTIONS = [
  choice({
    id: 'A',
    title: 'TV-First',
    shortTitle: 'TV-First',
    detail: 'Design a home console around the living-room screen.',
    benefit: 'Focused design and sustained living-room performance.',
    tradeoff: 'Tethered to a television and a room.',
    conceptTitle: 'The Living Room Core',
    conceptDescription: 'A focused home machine with a fixed connection to the biggest screen in the house.',
    prototypeVariant: 'tv',
    feedback: {
      speaker: 'pip',
      text: 'A home-first machine can be sharp and focused. It also asks the whole household to come to it. That’s a lot of walking.',
      mood: 'thoughtful',
    },
    boss: 'A home console can be the best seat in the house. What happens when the house empties?',
  }),
  choice({
    id: 'B',
    title: 'Handheld-First',
    shortTitle: 'Handheld',
    detail: 'Design one portable system with no dock or home-console mode.',
    benefit: 'Convenience, travel use, and one screen that is always with you.',
    tradeoff: 'Gives up the effortless big-screen experience.',
    conceptTitle: 'The Pocket Screen',
    conceptDescription: 'A self-contained handheld that asks the player to bring the screen, not find one.',
    prototypeVariant: 'handheld',
    feedback: {
      speaker: 'mori',
      text: 'Portability meets people where they are. It also leaves the shared room to other screens. I wonder which one gets lonely.',
      mood: 'thoughtful',
    },
    boss: 'One screen, always with you. A clean promise. Who gets left out when everyone plays alone?',
  }),
  choice({
    id: 'C',
    title: 'Hybrid',
    shortTitle: 'Hybrid',
    detail: 'Design one system that docks to a TV and travels as a handheld.',
    benefit: 'One library and one identity across both modes of play.',
    tradeoff: 'Performance, battery, and form-factor compromises are unavoidable.',
    conceptTitle: 'The Take-Anywhere Dock',
    conceptDescription:
      'One screen that lives in a dock at home and leaves with the player, carrying the same library between modes.',
    prototypeVariant: 'hybrid',
    feedback: {
      speaker: 'bolt',
      text: 'One library in two places. I can build that. The handoff has to feel invisible, or every dock becomes a chore.',
      mood: 'pleased',
    },
    boss: 'You’ve asked one device to live in two places. Will the experience travel as smoothly as the hardware?',
  }),
] as const satisfies readonly DecisionOption[]

const D4_OPTIONS = [
  choice({
    id: 'A',
    title: 'Maximum Performance',
    shortTitle: 'Performance',
    detail: 'Prioritize advanced graphics, high-end features, and conventional benchmarks.',
    benefit: 'A stronger conventional performance story.',
    tradeoff: 'Cost, energy, and size pressure — especially severe in portable modes.',
    conceptTitle: 'Performance Edition',
    conceptDescription: 'A chunky, high-spec controller and power module signal raw capability first.',
    accessoryVariant: 'performance',
    feedback: {
      speaker: 'grumble',
      text: 'Performance gives the converted a number to admire. It also puts every extra watt on someone’s bill.',
      mood: 'concerned',
    },
    boss: 'Performance gives the converted a number to admire. What gives a newcomer a reason to pick up the controller?',
  }),
  choice({
    id: 'B',
    title: 'Instant Shared Play',
    shortTitle: 'Shared Play',
    detail: 'Prioritize split controllers, local multiplayer, and flexible play modes.',
    benefit: 'Low-friction social participation: a spectator can become a player in seconds.',
    tradeoff: 'Controller durability, added complexity, and tighter design constraints.',
    conceptTitle: 'Shared Play Edition',
    conceptDescription:
      'Two compact side controllers detach from the system, turning one screen into an instant two-player setup.',
    accessoryVariant: 'split-controls',
    feedback: {
      speaker: 'pip',
      text: 'Two controllers from one. A spectator becomes a player before the commercial ends. That’s the demo. That’s the whole commercial.',
      mood: 'pleased',
    },
    boss: 'Two controllers from one is a generous invitation. Will the pieces still feel simple after a hundred family game nights?',
  }),
  choice({
    id: 'C',
    title: 'Motion-First Revival',
    shortTitle: 'Motion',
    detail: 'Maximize gesture-based group play as the defining interaction.',
    benefit: 'Distinctive, accessible physical play that can energize a room.',
    tradeoff: 'May narrow the audience and pull focus from a broad core library.',
    conceptTitle: 'Motion Edition',
    conceptDescription: 'A gesture wand and spacious motion play put bodies, not buttons, at the center.',
    accessoryVariant: 'motion',
    feedback: {
      speaker: 'bolt',
      text: 'Motion can fill a room with laughter. It can also make the controller feel like a school fitness test.',
      mood: 'thoughtful',
    },
    boss: 'Motion can fill a room with laughter. Can it also keep the players who want a quiet evening?',
  }),
] as const satisfies readonly DecisionOption[]

export const DECISIONS: Record<DecisionId, Decision> = {
  d1: {
    id: 'd1',
    prompt: 'Where should the next platform compete?',
    context: 'Each direction trades a different kind of reach for a different kind of risk.',
    options: D1_OPTIONS,
  },
  d2: {
    id: 'd2',
    prompt: 'What should the successor emphasize?',
    context: 'A distinctive feature is not yet a value proposition. The household has to understand it.',
    options: D2_OPTIONS,
  },
  d3: {
    id: 'd3',
    prompt: 'Where does gaming happen?',
    context: 'First vote of two. This choice sets the chassis and the system’s relationship to place.',
    options: D3_OPTIONS,
  },
  d4: {
    id: 'd4',
    prompt: 'What should design resources prioritize?',
    context: 'Second vote of two. This choice sets the controller and the social invitation.',
    options: D4_OPTIONS,
  },
}

export const CHAPTERS: readonly Chapter[] = [
  {
    id: 'c2005',
    number: 1,
    year: 2005,
    eyebrow: '2005 · THE LIVING ROOM',
    title: 'The Console Wars',
    lead: 'The next home console must compete in a market obsessed with more power.',
    brief:
      'Rival machines are racing toward richer graphics, bigger media features, and the same devoted players. Nintendo’s previous home system reached fewer buyers, while many households still find controllers and game conventions intimidating.',
    watchFor: [
      'The benchmark: richer graphics, processing muscle, premium games.',
      'Who is not at the table? Families and lapsed players who see games as somebody else’s hobby.',
      'The constraint: a head-on spending race favors the market leader.',
      'The Blue Ocean lens: who is a noncustomer, and what could be eliminated, reduced, raised, or created?',
    ],
    decisions: ['d1'],
    advisorLines: [
      {
        speaker: 'mori',
        text: 'I visited three families who don’t own a console. Two shrugged. One asked, ‘Could my dad play too?’ I wrote that down.',
        mood: 'thoughtful',
      },
      {
        speaker: 'pip',
        text: 'Oh! Picture the commercial. Grandma bowls, Dad cheers, nobody asks about polygons. I can see the poster already. Retailers will ask what’s inside, though.',
        mood: 'pleased',
      },
      {
        speaker: 'grumble',
        text: 'Cute poster, Pip. Now show me the bill for motion sensors and the six-word slogan you call a forecast.',
        mood: 'concerned',
      },
      {
        speaker: 'bolt',
        text: 'I can build a wand a kid can wave. Probably. The trick is making every wild swing count without hitting Grumble’s coffee.',
        mood: 'pleased',
      },
      {
        speaker: 'mori',
        text: 'Who’s missing from the room? The parent who slips out when the console turns on. I keep thinking about her.',
        mood: 'thoughtful',
      },
    ],
    bossClosing: 'No peeking. Keep your reasoning warm. History can answer for itself.',
    transition: {
      eyebrow: 'A FEW YEARS LATER',
      title: 'The room changes',
      text: 'The next system brought a different kind of household into the conversation. A few years later, new alternatives began competing for that attention.',
      nextLabel: 'Continue to Chapter 2 · 2011',
    },
  },
  {
    id: 'c2011',
    number: 2,
    year: 2011,
    eyebrow: '2011 · SUCCESS CREATES A NEW PROBLEM',
    title: 'The Follow-Up Problem',
    lead:
      'In the real timeline, a distinctive interactive system reached beyond the core. Momentum is now contested.',
    brief:
      'Smartphones and tablets have changed what a screen can be and where attention goes. The follow-up must make a new value case — without assuming that last time’s magic will repeat.',
    watchFor: [
      'The risk: a feature can be distinctive and still be hard to explain.',
      'The value test: does the extra screen solve a customer problem, or add a chore?',
      'The pressure: premium hardware raises both cost and expectations.',
    ],
    decisions: ['d2'],
    advisorLines: [
      {
        speaker: 'pip',
        text: 'Okay, hear me out. Phones own the pocket and the spare minute. We need a living-room trick a glowing rectangle can’t do.',
        mood: 'thoughtful',
      },
      {
        speaker: 'grumble',
        text: 'I like the poster, Pip. I don’t like the bill for two screens, two chargers, and one house already buried in cables. I brought a snack.',
        mood: 'concerned',
      },
      {
        speaker: 'bolt',
        text: 'Second screen in the controller? I can build that. Battery, latency, and price all want the same seat. Somebody’s getting shoved.',
        mood: 'thoughtful',
      },
      {
        speaker: 'mori',
        text: 'One mother told me she loved playing together. Then she hid the second screen in a drawer. Did anyone ask her why?',
        mood: 'thoughtful',
      },
      {
        speaker: 'pip',
        text: 'Premium is the language retailers speak. Skipping it is a gamble. I hate that I’m the one saying this.',
        mood: 'thoughtful',
      },
    ],
    bossClosing: 'Still sealed. Four votes must be in before we compare our room with the company’s road.',
    transition: {
      eyebrow: 'THE NEXT RECKONING',
      title: 'A category up for grabs',
      text: 'The real successor struggled to sustain the earlier system’s momentum. Nintendo now faced another chance to reconsider the entire category.',
      nextLabel: 'Continue to Chapter 3 · 2016',
    },
  },
  {
    id: 'c2016',
    number: 3,
    year: 2016,
    eyebrow: '2016 · REDEFINE THE PLATFORM',
    title: 'The Category Is Up for Grabs',
    lead: 'A recent successor underperformed. The next launch needs a value proposition that spans where and how games are played.',
    brief:
      'Smartphones normalized constant access. Households still gather, but attention is scattered across devices. The next system cannot simply add another box; it must make a coherent promise about time, place, and people.',
    watchFor: [
      'Two connected votes: one for where play happens, one for how people join.',
      'One factory sequence will combine both choices into a single concept.',
      'No combination is a forecast. The archive will compare reasoning, not score it.',
    ],
    decisions: ['d3', 'd4'],
    advisorLines: [
      {
        speaker: 'mori',
        text: 'I asked people where they play. A train. A lunch break. A friend’s kitchen table. Nobody said the living room.',
        mood: 'thoughtful',
      },
      {
        speaker: 'bolt',
        text: 'I can build a dock, a battery, and detachable controls. Each one steals space from the other two, which is the fun part and the problem.',
        mood: 'concerned',
      },
      {
        speaker: 'pip',
        text: 'One screen, two players, no setup. That’s six words, and I want it on every wall.',
        mood: 'pleased',
      },
      {
        speaker: 'grumble',
        text: 'Pip’s poster is six words. The invoice has more pages. Show me what a customer gets for every extra gram.',
        mood: 'concerned',
      },
      {
        speaker: 'grumble',
        text: 'Performance still sells. Ignoring it leaves money on the table, and I dislike leaving money anywhere.',
        mood: 'concerned',
      },
    ],
    bossClosing: 'The archive has waited long enough. Let’s set your reasoning beside the record.',
    transition: {
      eyebrow: 'THE ARCHIVE IS READY',
      title: 'The room goes quiet',
      text: 'Your four votes are recorded. Three fictional prototypes exist on the line. The historical record has waited long enough.',
      nextLabel: 'Open the sealed archive',
    },
  },
]

export const DECISION_ORDER: readonly DecisionId[] = ['d1', 'd2', 'd3', 'd4']

export function getOption(decisionId: DecisionId, choiceId: ChoiceId | undefined): DecisionOption | undefined {
  if (!choiceId) return undefined
  return DECISIONS[decisionId].options.find((option) => option.id === choiceId)
}

export function getDecisionLabel(decisionId: DecisionId, choiceId: ChoiceId | undefined): string {
  const option = getOption(decisionId, choiceId)
  return option ? `${option.id} · ${option.shortTitle}` : 'Not voted'
}

const COHERENCE_LINES: Record<string, DialogueLine> = {
  'tv:performance': {
    speaker: 'grumble',
    text: 'Home box, big numbers, family in the front room. Comfortable pitch. Narrow invitation.',
    mood: 'thoughtful',
  },
  'tv:split-controls': {
    speaker: 'pip',
    text: 'Living-room demo: one screen, two controllers, a friend joining before the commercial ends. Please use sturdy hinges.',
    mood: 'pleased',
  },
  'tv:motion': {
    speaker: 'bolt',
    text: 'A gesture-first home machine gets the whole room moving. Every game then answers to one unusual controller. Big ask.',
    mood: 'concerned',
  },
  'handheld:performance': {
    speaker: 'bolt',
    text: 'Top performance in a handheld fights battery, heat, and your hand. You can win the spec sheet and lose the commute.',
    mood: 'concerned',
  },
  'handheld:split-controls': {
    speaker: 'mori',
    text: 'A portable with two detachable controls invites a friend to join anywhere. It also asks everyone to keep track of more pieces. I’d lose one in a week.',
    mood: 'thoughtful',
  },
  'handheld:motion': {
    speaker: 'pip',
    text: 'A gesture handheld turns one player into a tiny stage. Cute. The reason to carry it has to be louder than the wiggle.',
    mood: 'thoughtful',
  },
  'hybrid:performance': {
    speaker: 'grumble',
    text: 'Dock, screen, battery, high-end chip. Four mouths at one table. This package needs a price story, and I haven’t heard one.',
    mood: 'concerned',
  },
  'hybrid:split-controls': {
    speaker: 'mori',
    text: 'One machine for the TV, two controls for a friend. That’s a whole picture of when, where, and with whom people play.',
    mood: 'pleased',
  },
  'hybrid:motion': {
    speaker: 'bolt',
    text: 'The hybrid promise is already a mouthful. Making motion the centre adds spectacle and one more thing to explain before play.',
    mood: 'concerned',
  },
}

export function getFeedbackLines(
  chapterIndex: number,
  choices: Partial<Record<DecisionId, ChoiceId>>,
): DialogueLine[] {
  if (chapterIndex === 0) {
    const option = getOption('d1', choices.d1)
    return option ? [option.feedback] : []
  }
  if (chapterIndex === 1) {
    const option = getOption('d2', choices.d2)
    return option ? [option.feedback] : []
  }
  if (chapterIndex === 2) {
    const d3 = getOption('d3', choices.d3)
    const d4 = getOption('d4', choices.d4)
    const lines: DialogueLine[] = []
    if (d3) lines.push(d3.feedback)
    if (d4) lines.push(d4.feedback)
    const d3Option = DECISIONS.d3.options.find((option) => option.id === choices.d3)
    const d4Option = DECISIONS.d4.options.find((option) => option.id === choices.d4)
    if (d3Option?.prototypeVariant && d4Option?.accessoryVariant) {
      const line = COHERENCE_LINES[`${d3Option.prototypeVariant}:${d4Option.accessoryVariant}`]
      if (line) lines.push(line)
    }
    return lines
  }
  return []
}

export function getBossLines(
  chapterIndex: number,
  choices: Partial<Record<DecisionId, ChoiceId>>,
): DialogueLine[] {
  const chapter = CHAPTERS[chapterIndex]
  if (!chapter) return []
  let substantive: string
  if (chapterIndex === 2) {
    const d3Option = DECISIONS.d3.options.find((option) => option.id === choices.d3)
    const d4Option = DECISIONS.d4.options.find((option) => option.id === choices.d4)
    // The synthesis line already appears once, in the factory feedback phase.
    // The Chair must challenge the two decisions in their own terms here, not
    // repeat that line under a different speaker.
    const lines: DialogueLine[] = []
    if (d3Option) lines.push({ speaker: 'shell', text: d3Option.boss, mood: 'thoughtful' })
    if (d4Option) lines.push({ speaker: 'shell', text: d4Option.boss, mood: 'thoughtful' })
    if (lines.length === 0) {
      lines.push({
        speaker: 'shell',
        text: 'Two votes, one machine, one bet about how play fits into a life.',
        mood: 'thoughtful',
      })
    }
    lines.push({
      speaker: 'shell',
      text: 'A strategy is the parts agreeing on one promise. More features only make the box heavier.',
      mood: 'neutral',
    })
    lines.push({ speaker: 'shell', text: chapter.bossClosing, mood: 'neutral' })
    return lines
  }
  const decisionId: DecisionId = chapterIndex === 0 ? 'd1' : 'd2'
  const option = getOption(decisionId, choices[decisionId])
  substantive = option?.boss ?? 'You’ve picked a direction. Now make it a promise a family can repeat at breakfast.'
  return [
    { speaker: 'shell', text: substantive, mood: 'thoughtful' },
    { speaker: 'shell', text: chapter.bossClosing, mood: 'neutral' },
  ]
}

export const FINALE_INTRO = {
  eyebrow: 'FINAL REPORT · THE SEALED ARCHIVE',
  title: 'The sealed archive',
  lead:
    'Your votes shaped fictional prototypes. They did not change what happened. Behind this seal: the actual platforms Nintendo released, with their official lifetime figures.',
  note:
    'Commercial scale is not proof that one strategy caused success. Use a Blue Ocean lens: what was eliminated, reduced, raised, or created — and who was a noncustomer before the move?',
}

export const ACTUAL_HISTORY: readonly HistoricalProduct[] = [
  {
    id: 'wii',
    name: 'Wii',
    launchYear: 2006,
    proposition: 'An accessible motion controller and shared living-room play.',
    detail:
      'Wii Sports made gesture and spectatorship part of the demonstration. Nintendo aimed Wii beyond the traditional core console audience; the INSEAD case examines that noncustomer story.',
    units: '101.63 million',
    unitsNote: 'lifetime hardware units',
    comparison: 'Compared with your Chapter 1 vote',
    caution: 'Franchises, software, price, and brand also mattered; one strategic idea is not the whole explanation.',
  },
  {
    id: 'wii-u',
    name: 'Wii U',
    launchYear: 2012,
    proposition: 'A tablet-like GamePad with asymmetric play and off-TV use.',
    detail:
      'Off-TV play worked near the base console; the GamePad was not a standalone portable. Distinctive hardware did not overcome weak commercial adoption or messaging difficulties.',
    units: '13.56 million',
    unitsNote: 'lifetime hardware units',
    comparison: 'Compared with your Chapter 2 vote',
    caution: 'A striking feature did not automatically become a clear customer value proposition.',
  },
  {
    id: 'switch',
    name: 'Original Nintendo Switch',
    launchYear: 2017,
    proposition: 'A home-and-handheld hybrid with detachable Joy-Con controllers.',
    detail:
      'The system combined modes, software, and controls so one library could move between the TV and handheld play. Portable and home gaming existed before; the coherent combination was the strategic move.',
    units: '156.59 million',
    unitsNote: 'lifetime hardware units, as of June 30, 2026',
    comparison: 'Compared with your Chapter 3 votes',
    caution: 'Many causes contributed to its success, including a strong software slate, timing, and Nintendo’s franchises.',
  },
]

export const SALES_SOURCE = {
  label: 'Nintendo Investor Relations — Dedicated Video Game Sales Units',
  url: 'https://www.nintendo.co.jp/ir/en/finance/hard_soft/index.html',
  asOf: SALES_AS_OF,
}

export const INTERPRETIVE_SOURCES = [
  {
    label: 'INSEAD: Nintendo Wii — lessons learned from noncustomers',
    url: 'https://publishing.insead.edu/case/nintendo-wii-lessons-learned-noncustomers',
  },
  {
    label: 'INSEAD: Nintendo Switch — shifting markets, creating strategy',
    url: 'https://publishing.insead.edu/case/nintendo-switch-shifting-market-competing-market-creating-strategy',
  },
  {
    label: 'Nintendo 2006 strategic remarks (contemporary transcript)',
    url: 'https://nintendoworldreport.net/news/11480/nintendo-media-briefing-speech',
  },
  {
    label: 'Nintendo 2009 investor presentation on the gaming population',
    url: 'https://www.nintendo.co.jp/ir/en/events/090508/02.html',
  },
  {
    label: 'Nintendo Switch launch release, January 2017',
    url: 'https://www.nintendo.co.jp/corporate/release/en/2017/170113.html',
  },
] as const

export const FINAL_CAVEAT =
  'Figures are worldwide cumulative hardware shipments reported by Nintendo. They are not unique players, noncustomer counts, revenue, or proof of causal strategy. All audience outcomes in this experience are fictional teaching simulations.'

export const SOURCE_NOTE =
  'INSEAD case abstracts informed the interpretive framing; no paid case text is reproduced. Assigned reading: Kim & Mauborgne, “Blue Ocean Strategy,” Harvard Business Review, October 2004.'

export const DISCUSSION_QUESTION =
  'Did Nintendo win by building a better machine, or by changing what people wanted from a machine?'

export const DISCUSSION_FOLLOWUP =
  'Why didn’t its first success automatically guarantee the next?'

export const PROTOTYPE_PRIORITIES: Record<string, { priorities: string; risks: string }> = {
  'power-tower': {
    priorities: 'Raw capability, media presence, and a familiar premium-controller promise.',
    risks: 'High cost, crowded competition, and little direct invitation to nonplayers.',
  },
  'social-box': {
    priorities: 'Approachable gesture play and a machine a whole household can understand quickly.',
    risks: 'Motion execution, core-audience skepticism, and the need for a perfect first minute.',
  },
  'early-handheld': {
    priorities: 'One library that travels and a TV connection for shared play.',
    risks: '2005-era batteries, heat, screen cost, and a software library stretched across two modes.',
  },
  'hd-console': {
    priorities: 'Premium performance and the expectations of dedicated console players.',
    risks: 'Expensive direct competition and a less distinctive reason to choose the system.',
  },
  'second-screen': {
    priorities: 'Asymmetric living-room play and freeing the television without leaving the console.',
    risks: 'Cost, latency, charging, and a value proposition that must be explained in one glance.',
  },
  portable: {
    priorities: 'Mobility, one library, and a screen that is always at hand.',
    risks: 'Battery, performance, price, and the loss of effortless shared-screen play.',
  },
  tv: {
    priorities: 'Focused home performance and the largest screen in the house.',
    risks: 'Tethered to a TV and a room, leaving portable play to other devices.',
  },
  handheld: {
    priorities: 'A single portable screen, convenience, and one library on the move.',
    risks: 'Giving up the big-screen moment and squeezing capability into a handheld.',
  },
  hybrid: {
    priorities: 'One identity and one library across TV and handheld modes.',
    risks: 'Battery, thermals, performance, size, and making the transition feel invisible.',
  },
  performance: {
    priorities: 'Benchmark performance, advanced features, and a premium technical story.',
    risks: 'Cost, energy use, size, and a pitch aimed mainly at already-convinced players.',
  },
  'split-controls': {
    priorities: 'Low-friction local multiplayer and a spectator-to-player moment measured in seconds.',
    risks: 'Durability, extra pieces to manage, and controller complexity.',
  },
  motion: {
    priorities: 'Physical, demonstrative group play and an immediately visible invitation.',
    risks: 'A narrower audience, calibration frustration, and less focus on a broad core library.',
  },
}
