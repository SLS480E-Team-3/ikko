// DEV
export const SCREEN_TYPES = [
    'GameScene',
    'QuestOriginal',
    'QuestShoot',
    'QuestDodge',
    'QuestDoor',
    'SignUp',
    'LogIn',
    'InfoRecovery',
    'EditInfo',
    'DialogBubble',
] as const
export type ScreenType = typeof SCREEN_TYPES[number]
// the /MobDev/<ScreenType> names (docs/mobile-testing.spec.json). Plain TS, no
// 'use client', so the server pages (list + generateStaticParams) get the
// real array instead of a client reference
