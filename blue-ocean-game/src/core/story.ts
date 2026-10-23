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

// Display names: Hootley (owl), Slyvester (fox), Damian (beaver), Pawson (bear),
// Chair Shelldon (turtle). Internal ids stay mori/pip/bolt/grumble/shell for
// save compatibility, tests, and the existing Tripo3D asset folders.
export const CHARACTERS: Record<CharacterId, CharacterProfile> = {
  mori: {
    id: 'mori',
    name: 'Hootley',
    species: 'Owl',
    role: 'Consumer Insight',
    color: '#b88967',
    accent: '#f2d4b4',
    detail: 'Keeps a notebook, stays up late, and notices when someone goes quiet.',
    voice: { wave: 'triangle', base: 310, range: 75, pace: 0.95 },
  },
  pip: {
    id: 'pip',
    name: 'Slyvester',
    species: 'Fox',
    role: 'Marketing',
    color: '#d9774e',
    accent: '#ffd1a7',
    detail: 'Gets excited, talks too fast, and usually has another idea ready.',
    voice: { wave: 'triangle', base: 440, range: 115, pace: 1.15 },
  },
  bolt: {
    id: 'bolt',
    name: 'Damian',
    species: 'Beaver',
    role: 'Engineering',
    color: '#7c5840',
    accent: '#e4b77a',
    detail: 'Loves making things and gets rather attached to the first version.',
    voice: { wave: 'sawtooth', base: 205, range: 55, pace: 1.05 },
  },
  grumble: {
    id: 'grumble',
    name: 'Pawson',
    species: 'Bear',
    role: 'Finance',
    color: '#63504b',
    accent: '#c9ad94',
    detail: 'Would rather be napping, but stays to make sure everyone is looked after.',
    voice: { wave: 'sine', base: 128, range: 33, pace: 0.78 },
  },
  shell: {
    id: 'shell',
    name: 'Shelldon',
    species: 'Turtle',
    role: 'Big Boss',
    color: '#58765c',
    accent: '#d9c27d',
    detail: 'Takes his time over tea and lets the room argue before he steps in.',
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
    text: 'Step into the Nintendo boardroom! The gaming world is changing, and the next big idea is yours to shape.',
    mood: 'neutral',
  },
  {
    speaker: 'narrator',
    text: 'Think differently, make bold choices, and chart your own path to a blue ocean!',
    mood: 'neutral',
  },
  {
    speaker: 'shell',
    text: 'Come in, come in. We could use a few more opinions before we decide what sort of game console to build.',
    mood: 'pleased',
  },
  {
    speaker: 'mori',
    text: 'Slyvester, your tail’s on the spare chair. Our guests need somewhere to sit.',
    mood: 'thoughtful',
  },
  {
    speaker: 'pip',
    text: 'Oh! Sorry, make yourselves comfortable. I’ll try to leave some room for your ideas too.',
    mood: 'pleased',
  },
  {
    speaker: 'shell',
    text: 'We’ll visit three different years and take four votes. At the grand finale, we’ll show you what Nintendo really chose.',
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
      'Build a powerful home console with impressive graphics, media features and familiar controls.',
    benefit: 'Gives keen players and makers of demanding games a reason to look at our console.',
    tradeoff: 'Expensive parts put us in direct competition with well-funded rivals.',
    conceptTitle: 'The Power Tower',
    conceptDescription:
      'A wide console with cooling vents and a familiar two-handed controller, designed for demanding games.',
    prototypeVariant: 'power-tower',
    feedback: {
      speaker: 'grumble',
      text: 'That’s a serious cooling fan. I can see why keen players would want this one; I’d like to see the parts bill too.',
      mood: 'concerned',
    },
    boss: 'We’d be asking people to compare us with other powerful consoles. Which games would make them choose ours?',
  }),
  choice({
    id: 'B',
    title: 'Open the Living Room',
    shortTitle: 'Living Room',
    detail:
      'Build around simple motion controls and games a family can learn together.',
    benefit: 'Could help beginners and people who stopped playing feel comfortable joining in.',
    tradeoff: 'Gestures must work reliably, and keen players will still want games of their own.',
    conceptTitle: 'The Hearth Box',
    conceptDescription:
      'A small home console with a motion controller for familiar actions such as swinging or bowling.',
    prototypeVariant: 'social-box',
    feedback: {
      speaker: 'mori',
      text: 'I can imagine handing Dad that controller. This time I’ll let him try a swing before I start explaining it.',
      mood: 'pleased',
    },
    boss: 'Let’s invite beginners to try it before we promise anything. We’ll also need games for people who already enjoy ours.',
  }),
  choice({
    id: 'C',
    title: 'Play Anywhere',
    shortTitle: 'Anywhere',
    detail:
      'Build one machine with its own screen, portable games and a connection to the TV.',
    benefit: 'Players could continue the same games at home and away.',
    tradeoff:
      'With 2005 parts, weight, heat, battery life and price make this an uncertain experiment.',
    conceptTitle: 'The Pocket Dock',
    conceptDescription:
      'A chunky handheld and TV dock, imagining what combined home and portable play might look like in 2005.',
    prototypeVariant: 'early-handheld',
    feedback: {
      speaker: 'bolt',
      text: 'I’d love to take this home. Before anyone orders it, though, I need a version that won’t get hot in your paws.',
      mood: 'concerned',
    },
    boss: 'Taking your games along sounds useful. What would you give up to make this affordable with the parts available to us now?',
  }),
] as const satisfies readonly DecisionOption[]

const D2_OPTIONS = [
  choice({
    id: 'A',
    title: 'Join the HD Race',
    shortTitle: 'HD Race',
    detail:
      'Build a more powerful home console with HD graphics and demanding adventure and action games.',
    benefit: 'Could attract players who buy other consoles for their graphics and games.',
    tradeoff: 'Costs more to build and needs strong games to stand out against rivals.',
    conceptTitle: 'The Benchmark Box',
    conceptDescription:
      'A tall home console with powerful parts and a familiar controller for large, detailed games.',
    prototypeVariant: 'hd-console',
    feedback: {
      speaker: 'pip',
      text: 'I’d put a big adventure on that screen. Lovely to look at, but we’ll need games people can’t already get elsewhere.',
      mood: 'thoughtful',
    },
    boss: 'Those players have plenty to choose from already. What would persuade them to buy our machine as well?',
  }),
  choice({
    id: 'B',
    title: 'Reinvent the Second Screen',
    shortTitle: 'Second Screen',
    detail:
      'Add a screen to the controller for private views during shared games and play near the console without the TV.',
    benefit: 'Players can see different information, or someone else can use the TV.',
    tradeoff: 'More hardware to charge and explain; off-TV play stays tied to the base console.',
    conceptTitle: 'The Together Screen',
    conceptDescription:
      'A new home console and a large touch-screen controller that receives its game picture from the nearby console.',
    prototypeVariant: 'second-screen',
    feedback: {
      speaker: 'bolt',
      text: 'There’s room for a secret map on that screen. Now I need a game that makes you want to use it.',
      mood: 'thoughtful',
    },
    boss: 'Before we show this off, let’s try explaining it to someone who missed the meeting. Would they understand why they’d need a new console?',
  }),
  choice({
    id: 'C',
    title: 'Go Fully Portable',
    shortTitle: 'Portable',
    detail:
      'Build a standalone handheld for bigger games, with no home console or TV connection.',
    benefit: 'Players can take the whole game with them, beyond the range of a home console.',
    tradeoff: 'Must justify its price beside phones while balancing battery life, graphics and games.',
    conceptTitle: 'The Carry Console',
    conceptDescription:
      'A large-screen handheld that runs its games by itself, without a box connected to the TV.',
    prototypeVariant: 'portable',
    feedback: {
      speaker: 'grumble',
      text: 'I’d take that on a long journey. It needs enough battery to last, and games worth paying for beside the ones on my phone.',
      mood: 'concerned',
    },
    boss: 'Let’s give it to someone who plays on their phone. What would make them want to carry this too?',
  }),
] as const satisfies readonly DecisionOption[]

const D3_OPTIONS = [
  choice({
    id: 'A',
    title: 'TV-First',
    shortTitle: 'TV-First',
    detail: 'Design a home console around the living-room screen.',
    benefit: 'Room for powerful parts, comfortable controls and a big shared picture.',
    tradeoff: 'Tethered to a television and a room.',
    conceptTitle: 'The Living Room Core',
    conceptDescription: 'A home console that connects to the television and stays there.',
    prototypeVariant: 'tv',
    feedback: {
      speaker: 'pip',
      text: 'I could get everyone round the TV for this. We’d need to make that evening tempting enough to leave their other screens alone.',
      mood: 'thoughtful',
    },
    boss: 'We’ve chosen the television, so let’s make good use of it. Which games would you want everyone gathered around?',
  }),
  choice({
    id: 'B',
    title: 'Handheld-First',
    shortTitle: 'Handheld',
    detail: 'Design one portable system with no dock or home-console mode.',
    benefit: 'Easy to carry, without paying for a TV dock you might never use.',
    tradeoff: 'Gives up the effortless big-screen experience.',
    conceptTitle: 'The Pocket Screen',
    conceptDescription: 'A standalone handheld with its own screen and no TV connection.',
    prototypeVariant: 'handheld',
    feedback: {
      speaker: 'mori',
      text: 'That would fit my train journey nicely. I’d miss putting the picture on the television when I got home, though.',
      mood: 'thoughtful',
    },
    boss: 'We can leave out the TV dock and concentrate on carrying it. How comfortable would it be through a long journey?',
  }),
  choice({
    id: 'C',
    title: 'Hybrid',
    shortTitle: 'Hybrid',
    detail: 'Design one system that docks to a TV and travels as a handheld.',
    benefit: 'Continue the same games on the television and on the go.',
    tradeoff: 'Portable parts limit power; the screen, battery and dock add cost.',
    conceptTitle: 'The Take-Anywhere Dock',
    conceptDescription:
      'A handheld that runs the game itself, with a dock for putting the picture on the television.',
    prototypeVariant: 'hybrid',
    feedback: {
      speaker: 'bolt',
      text: 'Right, the game runs in the handheld and the dock connects it to the TV. I’ll test switching between them without restarting.',
      mood: 'pleased',
    },
    boss: 'Try it both ways before we order the parts. It needs to feel comfortable in your paws and look good on the television.',
  }),
] as const satisfies readonly DecisionOption[]

const D4_OPTIONS = [
  choice({
    id: 'A',
    title: 'Maximum Performance',
    shortTitle: 'Performance',
    detail: 'Spend more of the design effort on powerful parts and impressive graphics.',
    benefit: 'Supports richer pictures and more demanding games.',
    tradeoff: 'More heat, cost and power use, especially difficult in a handheld.',
    conceptTitle: 'Performance Edition',
    conceptDescription: 'A chunky controller and extra power module represent the focus on demanding games.',
    accessoryVariant: 'performance',
    feedback: {
      speaker: 'grumble',
      text: 'I’d enjoy a better-looking game myself. We’ll have to decide how much more someone would pay for the parts that run it.',
      mood: 'concerned',
    },
    boss: 'Ask the game makers what they’d do with that extra power. We should know what people get for the extra cost.',
  }),
  choice({
    id: 'B',
    title: 'Instant Shared Play',
    shortTitle: 'Shared Play',
    detail: 'Build detachable controls so two people can play together without a second full controller.',
    benefit: 'A friend can join a suitable game using controls already in the box.',
    tradeoff: 'Small controls must be comfortable and sturdy, with more loose pieces to manage.',
    conceptTitle: 'Shared Play Edition',
    conceptDescription:
      'Two small controls separate for two-player games and come together for playing alone.',
    accessoryVariant: 'split-controls',
    feedback: {
      speaker: 'pip',
      text: 'I’m keeping one control for Pawson. He’s watched enough of our demonstrations; I want a game he can join this time.',
      mood: 'pleased',
    },
    boss: 'Let’s try the little controls with different paws. Sharing them only helps if both people can comfortably play.',
  }),
  choice({
    id: 'C',
    title: 'Motion-First Revival',
    shortTitle: 'Motion',
    detail: 'Make physical actions such as swinging and aiming the main way to play.',
    benefit: 'Familiar movements can help people join active games without learning many buttons.',
    tradeoff: 'Needs space and reliable tracking, and may leave less attention for other kinds of games.',
    conceptTitle: 'Motion Edition',
    conceptDescription: 'A motion controller for games played through swings, pointing and other physical actions.',
    accessoryVariant: 'motion',
    feedback: {
      speaker: 'bolt',
      text: 'I’ll test small movements as well as big swings. You shouldn’t need my enthusiasm for exercise to enjoy one of our games.',
      mood: 'thoughtful',
    },
    boss: 'We’ll need space to demonstrate those games safely. What would we offer someone who wants to stay in their chair?',
  }),
] as const satisfies readonly DecisionOption[]

export const DECISIONS: Record<DecisionId, Decision> = {
  d1: {
    id: 'd1',
    prompt: 'What kind of console should we build?',
    context: 'Choose a direction for 2005. Think about who would want it and what it would take to build.',
    options: D1_OPTIONS,
  },
  d2: {
    id: 'd2',
    prompt: 'What would make the next console worth buying?',
    context: 'Choose a direction for 2011. People already have games they enjoy; give them a reason to try ours.',
    options: D2_OPTIONS,
  },
  d3: {
    id: 'd3',
    prompt: 'Where does gaming happen?',
    context: 'First vote of two: choose a TV console, a handheld, or one machine that does both.',
    options: D3_OPTIONS,
  },
  d4: {
    id: 'd4',
    prompt: 'What should we spend the most time getting right?',
    context: 'Second vote of two: choose the main focus for the machine you just picked.',
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
    lead: 'Other consoles promise better graphics. Nintendo needs a reason for people to choose its next machine.',
    brief:
      'It is 2005. Nintendo’s previous home console has struggled against its rivals. Better graphics could attract keen players, but many people still find games difficult to get into. Should the next machine compete for existing players, welcome beginners, or try to combine home and portable play?',
    watchFor: [
      'Better graphics matter to many players, but powerful parts cost money.',
      'Some people stopped playing; others have never felt comfortable picking up a controller.',
      'A portable system that also connects to a TV would stretch the technology available in 2005.',
    ],
    decisions: ['d1'],
    advisorLines: [
      {
        speaker: 'shell',
        text: 'All right. Our last console didn’t sell enough, so what are we doing differently with the next one?',
        mood: 'concerned',
      },
      {
        speaker: 'bolt',
        text: 'Better graphics, for a start. I’m tired of seeing our games look worse next to everyone else’s.',
        mood: 'pleased',
      },
      {
        speaker: 'mori',
        text: 'I’d like that too. But my dad hands me back the controller because he can’t work out which button to press.',
        mood: 'thoughtful',
      },
      {
        speaker: 'bolt',
        text: 'Well, nobody knows the buttons at first. Did you give him a chance, or start explaining everything?',
        mood: 'thoughtful',
      },
      {
        speaker: 'mori',
        text: 'I may have explained rather a lot. He likes bowling, though, and he’s never needed my help with that.',
        mood: 'thoughtful',
      },
      {
        speaker: 'pip',
        text: 'Then let him bowl! Could he swing the controller like he’s throwing a ball, instead of remembering all those buttons?',
        mood: 'pleased',
      },
      {
        speaker: 'bolt',
        text: 'With a motion sensor, yes. I’d need to test gentle swings as well as whatever you’re doing with your paws.',
        mood: 'pleased',
      },
      {
        speaker: 'grumble',
        text: 'Test it away from my tea, please. If we skip the most expensive graphics parts, we might afford to try those controls.',
        mood: 'concerned',
      },
      {
        speaker: 'pip',
        text: 'Hold on, though. I still want the big adventure games, and I don’t want to spend every evening waving my arms.',
        mood: 'thoughtful',
      },
      {
        speaker: 'mori',
        text: 'Neither do I. We could make the first game easier to join without making every game the same.',
        mood: 'thoughtful',
      },
      {
        speaker: 'bolt',
        text: 'Or put a screen in the machine itself. Carry your adventure outside, then plug it into the TV when you get home.',
        mood: 'pleased',
      },
      {
        speaker: 'grumble',
        text: 'Outside sounds lovely. How heavy is this thing once you’ve fitted a screen and enough battery to keep it running?',
        mood: 'concerned',
      },
      {
        speaker: 'bolt',
        text: 'With the parts we have now? Fairly heavy. I could make a simpler version, but the games would have to look simpler too.',
        mood: 'thoughtful',
      },
      {
        speaker: 'shell',
        text: 'Let’s hear from our guests, then. Better graphics, easier family play, or a machine you can carry: which would you build?',
        mood: 'thoughtful',
      },
    ],
    bossClosing: 'I’ve written down your choice, including the awkward bits. Let’s see what the next meeting has waiting for us.',
    transition: {
      eyebrow: '2011 · THE NEXT CHALLENGE',
      title: 'A few years later',
      text: 'In the real world, Nintendo brought more families into gaming. By 2011, those players could also find easy-to-play games on phones and rival consoles. Nintendo needed to give them a reason to buy its next machine.',
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
      'Nintendo reached more households. What would persuade them to buy another console?',
    brief:
      'It is 2011 in Nintendo’s real timeline. Its family-friendly approach has attracted people who rarely played before, but rivals now offer motion controls too. Phones and tablets offer quick, inexpensive games. The next console needs to give people something worth buying again.',
    watchFor: [
      'People already have games and devices they enjoy.',
      'A screen in the controller could free the TV or give players different views of a game.',
      'The games must show why a new machine is worth buying.',
    ],
    decisions: ['d2'],
    advisorLines: [
      {
        speaker: 'shell',
        text: 'Nintendo’s last launch brought more families in. Now they have other ways to play, so we can’t count on them buying another console.',
        mood: 'thoughtful',
      },
      {
        speaker: 'pip',
        text: 'My sister used to ask me to bring games over. Yesterday she showed me one on her phone, then went straight back to it.',
        mood: 'concerned',
      },
      {
        speaker: 'grumble',
        text: 'I’ve got one of those. Good for five minutes while the kettle boils, and I didn’t need to buy another machine.',
        mood: 'neutral',
      },
      {
        speaker: 'bolt',
        text: 'I’ve been sketching a controller with its own screen. You could hide your cards there while everyone else watches the TV.',
        mood: 'pleased',
      },
      {
        speaker: 'mori',
        text: 'Could I keep playing on that little screen when Dad wants the television? We still haven’t agreed whose turn it is.',
        mood: 'thoughtful',
      },
      {
        speaker: 'bolt',
        text: 'Yes, if you stay near the console. That box runs the game and sends the picture to the controller.',
        mood: 'thoughtful',
      },
      {
        speaker: 'pip',
        text: 'Wait, so I can take the screen to the sofa, but not on the bus? I’d have to make that very clear.',
        mood: 'thoughtful',
      },
      {
        speaker: 'grumble',
        text: 'And explain why I need a whole new console. From that drawing, I might think you’re selling me another controller.',
        mood: 'concerned',
      },
      {
        speaker: 'bolt',
        text: 'I’d rather let you try a game. You could plan an ambush on your screen without Slyvester peeking at it.',
        mood: 'pleased',
      },
      {
        speaker: 'pip',
        text: 'I would never peek. Fine, I would, and now I want to try it; we’d need games like that ready when it launches.',
        mood: 'pleased',
      },
      {
        speaker: 'mori',
        text: 'And something for the people who were happy with their old games. They may not want to learn all over again.',
        mood: 'thoughtful',
      },
      {
        speaker: 'pip',
        text: 'We could go after people who want bigger adventures instead. Give them the sharper picture and games they’re buying other consoles for.',
        mood: 'thoughtful',
      },
      {
        speaker: 'grumble',
        text: 'There are buyers for that. We’d have to pay for the powerful parts and persuade game makers to support us.',
        mood: 'thoughtful',
      },
      {
        speaker: 'bolt',
        text: 'Or build a proper handheld that runs its games by itself. We’d lose the TV, and have to watch battery life and price.',
        mood: 'thoughtful',
      },
      {
        speaker: 'shell',
        text: 'Let’s put all three to a vote. Which would give someone a reason to put their phone down and pick up our games?',
        mood: 'thoughtful',
      },
    ],
    bossClosing: 'Keep that concern beside your choice in the notes. We have one more meeting before we reveal Nintendo’s real decisions.',
    transition: {
      eyebrow: '2016 · TIME TO TRY AGAIN',
      title: 'A few years later',
      text: 'Nintendo’s real follow-up console struggled to sell. By 2016, it was time to try again. Would people want their next console to stay by the TV, go everywhere with them, or do both?',
      nextLabel: 'Continue to Chapter 3 · 2016',
    },
  },
  {
    id: 'c2016',
    number: 3,
    year: 2016,
    eyebrow: '2016 · REDEFINE THE PLATFORM',
    title: 'The Category Is Up for Grabs',
    lead: 'The real successor struggled. Where should people play next, and what should the new machine do best?',
    brief:
      'It is 2016. Nintendo needs to recover after a disappointing home console. People play on televisions, handhelds and phones. You will decide where the next system belongs, then choose whether better graphics, easy shared play or motion controls deserve the most attention.',
    watchFor: [
      'Vote first for a TV console, a handheld, or a system that does both.',
      'Then choose between stronger graphics, detachable controls for sharing, and motion controls.',
      'Both votes go into one prototype. Every combination has something to work out.',
    ],
    decisions: ['d3', 'd4'],
    advisorLines: [
      {
        speaker: 'shell',
        text: 'A fresh pot of tea, and a difficult meeting. Nintendo’s real successor struggled, so we need to reconsider what we’re building.',
        mood: 'concerned',
      },
      {
        speaker: 'mori',
        text: 'I hardly touched my home games this week. By the time I got back, I wanted to sleep; I was wide awake on the train.',
        mood: 'thoughtful',
      },
      {
        speaker: 'grumble',
        text: 'I still like the television. Big picture, comfortable chair, and nothing running out of battery halfway through my evening.',
        mood: 'neutral',
      },
      {
        speaker: 'bolt',
        text: 'A home console gives me room for powerful parts and cooling. A handheld fits Hootley’s train journey, but it has to stay light.',
        mood: 'thoughtful',
      },
      {
        speaker: 'pip',
        text: 'Could we do both? Put the game in the handheld, then connect it to the TV when Pawson gets comfortable.',
        mood: 'pleased',
      },
      {
        speaker: 'bolt',
        text: 'With a dock, yes. The whole game runs in the handheld, so even on the TV we’d be working with portable parts.',
        mood: 'thoughtful',
      },
      {
        speaker: 'mori',
        text: 'I could keep playing the same game on the train, then. I’d like that, though Pawson might prefer a machine built for his TV.',
        mood: 'thoughtful',
      },
      {
        speaker: 'grumble',
        text: 'Then let’s price a plain handheld too. Someone who only plays on the train shouldn’t have to pay for my TV habits.',
        mood: 'thoughtful',
      },
      {
        speaker: 'shell',
        text: 'We’ll vote on those three shapes first. Before you decide, let’s talk about the controls and games we’d put with them.',
        mood: 'neutral',
      },
      {
        speaker: 'pip',
        text: 'I want two controls that clip together. Pull them apart, hand one to a friend, and you can play something together.',
        mood: 'pleased',
      },
      {
        speaker: 'grumble',
        text: 'Make them big enough for my paws. I’d rather buy a comfortable controller than spend the evening dropping a clever little one.',
        mood: 'concerned',
      },
      {
        speaker: 'bolt',
        text: 'I’ll test the grip. We could spend more on graphics instead, though better pictures need more power, especially in a handheld.',
        mood: 'thoughtful',
      },
      {
        speaker: 'mori',
        text: 'I’d keep motion controls in the discussion too. Dad would join a bowling game before he’d join one of your racing games.',
        mood: 'thoughtful',
      },
      {
        speaker: 'grumble',
        text: 'I’d join him. But some evenings I want to sit down and play without moving anything except my thumbs.',
        mood: 'neutral',
      },
      {
        speaker: 'pip',
        text: 'So would I, and we’ll need games worth coming back for. I can only make everyone admire the controllers for so long.',
        mood: 'thoughtful',
      },
      {
        speaker: 'shell',
        text: 'Very well, two votes. Choose where you’d like to play, then what you’d most want us to spend our time getting right.',
        mood: 'neutral',
      },
    ],
    bossClosing: 'Thank you for staying through all three meetings. Pawson, pass the biscuits while we get Nintendo’s real consoles ready to show everyone.',
    transition: {
      eyebrow: 'YOUR CHOICES ARE IN',
      title: 'The grand finale',
      text: 'You’ve made your choices and built three imaginary consoles. Now let’s see what Nintendo actually made, how well each console sold, and how your ideas compare.',
      nextLabel: 'See the grand finale',
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
    speaker: 'bolt',
    text: 'With a wall socket and room for cooling, I can use those powerful parts properly. Getting games made for them is the next job.',
    mood: 'thoughtful',
  },
  'tv:split-controls': {
    speaker: 'grumble',
    text: 'All right, I’ll try a round with you. We’ve got the big screen for sharing, though we’ll still need everyone in the same room.',
    mood: 'pleased',
  },
  'tv:motion': {
    speaker: 'mori',
    text: 'Dad could follow a bowling game on the television. We’d have to move his little table before he started swinging, though.',
    mood: 'concerned',
  },
  'handheld:performance': {
    speaker: 'bolt',
    text: 'Detailed games on a little screen sound good. Keeping them running without a hot case or a short-lived battery will take some work.',
    mood: 'concerned',
  },
  'handheld:split-controls': {
    speaker: 'mori',
    text: 'I’d bring this to a friend’s house. We’d have two controls already, but we’d need a game we could both follow on that small screen.',
    mood: 'thoughtful',
  },
  'handheld:motion': {
    speaker: 'pip',
    text: 'I’ll put the screen down before I swing. We’ll need somewhere steady to set it and enough room to move.',
    mood: 'thoughtful',
  },
  'hybrid:performance': {
    speaker: 'bolt',
    text: 'The dock lets those detailed games use the TV. It won’t make the chip smaller, so I still need to solve heat and battery life.',
    mood: 'concerned',
  },
  'hybrid:split-controls': {
    speaker: 'grumble',
    text: 'I can join you here or take a game along. Sharing that little screen away from home will be a tighter squeeze.',
    mood: 'pleased',
  },
  'hybrid:motion': {
    speaker: 'mori',
    text: 'We could bowl on the TV and take other games along. I’d want seated controls too, for places where there’s no room to swing.',
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
        text: 'We’ll need to choose where this machine gets played and what its controls should do before we can try building it.',
        mood: 'thoughtful',
      })
    }
    lines.push({ speaker: 'shell', text: chapter.bossClosing, mood: 'neutral' })
    return lines
  }
  const decisionId: DecisionId = chapterIndex === 0 ? 'd1' : 'd2'
  const option = getOption(decisionId, choices[decisionId])
  substantive = option?.boss ?? 'Let’s choose a design before we send anything to the factory. I’d rather keep the parts we haven’t agreed on yet.'
  return [
    { speaker: 'shell', text: substantive, mood: 'thoughtful' },
    { speaker: 'shell', text: chapter.bossClosing, mood: 'neutral' },
  ]
}

export const FINALE_INTRO = {
  eyebrow: 'THE GRAND FINALE',
  title: 'Nintendo’s turn',
  lead:
    'You’ve made your choices. Let’s meet the three real consoles and find out how they did.',
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
    priorities: 'Detailed graphics, media features and familiar controls for demanding games.',
    risks: 'Expensive parts, strong rivals and controls that may still put beginners off.',
  },
  'social-box': {
    priorities: 'Simple physical actions and games that help a family start playing together.',
    risks: 'Unreliable gestures could frustrate beginners; keen players still need games they enjoy.',
  },
  'early-handheld': {
    priorities: 'The same games at home and away, with a screen and a TV connection.',
    risks: 'The weight, heat, battery life and cost of trying this with 2005 parts.',
  },
  'hd-console': {
    priorities: 'HD graphics and demanding games for people who already enjoy consoles.',
    risks: 'Expensive parts and a need for games that stand out against rival consoles.',
  },
  'second-screen': {
    priorities: 'Private game information on the controller and play without using the television.',
    risks: 'An extra screen to pay for and charge, limited range, and games that must justify buying a new console.',
  },
  portable: {
    priorities: 'A standalone handheld that runs its games wherever the player takes it.',
    risks: 'Battery life, graphics and price, with phones competing for the same spare time.',
  },
  tv: {
    priorities: 'A big television picture, with room for cooling and powerful parts.',
    risks: 'The game stays at home, and someone else may want the television.',
  },
  handheld: {
    priorities: 'Games to carry, without a TV dock to pay for or pack.',
    risks: 'A smaller picture, no TV connection, and limits on battery life and power.',
  },
  hybrid: {
    priorities: 'Continue the same game on the television and in your hands.',
    risks: 'Portable parts limit power; the screen, battery and dock add weight or cost.',
  },
  performance: {
    priorities: 'Powerful parts for richer pictures and demanding games.',
    risks: 'More heat, cost and power use, with less room for a battery in portable designs.',
  },
  'split-controls': {
    priorities: 'Controls already in the box that two people can share in suitable games.',
    risks: 'Small grips, loose pieces to keep track of, and parts that must survive repeated use.',
  },
  motion: {
    priorities: 'Familiar physical actions that help people join active games.',
    risks: 'Space to move, reliable tracking, and enough games for people who prefer seated play.',
  },
}
