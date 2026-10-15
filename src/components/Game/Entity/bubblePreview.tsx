// DEV
'use client'

import EntityRenderer, { ENT_H, ENT_W } from "@/components/Game/Entity/entityRenderer"
import NPCRenderer from "@/components/Game/Entity/npcRenderer"
import { ISLAND_1_NPC } from "@/components/Game/npcs/npcs"

export default function BubblePreview() {
    const spots = [
        { x: 25, y: 70, text: 'はい (hai) = yes', name: 'Sensei' },
        { x: 25, y: 185, text: 'こんにちは (konnichiwa) = hello! はじめまして (hajimemashite) = nice to meet you' },
    ]
    return (
        <div style={{ position: 'relative', width: 130, height: 265, transform: 'scale(3)', transformOrigin: 'top left' }}>
            {spots.map((s) => (
                <EntityRenderer key={s.text} velocity={{ x: 0, y: 0 }} ent={{ name: s.name, x: s.x, y: s.y, w: ENT_W, h: ENT_H, color: 'gray', facing: 'none' }} dialog={s.text} />
            ))}
            <NPCRenderer npc={{ ...ISLAND_1_NPC[0], ent: { ...ISLAND_1_NPC[0].ent, x: 25, y: 245 } }} index={0} velocity={{ x: 0, y: 0 }} inRange selected line={0} />
            {/* translated NPC: Hana's first talk line with its English
                typing underneath, through NPCRenderer like the game */}
        </div>
    )
}
// dialog bubble preview: two standing entities at 3x (world px are tiny on
// a phone), one short and one long text, to check the square border, the
// tail tip above the entity, the shadow and the wrap at maxWidth; the
// first one has a name so the tag can be checked against the bubble.
// Moved out of MobileTester/page.tsx so /MobDev/DialogBubble can load it on
// its own (a page file can only export its default)
