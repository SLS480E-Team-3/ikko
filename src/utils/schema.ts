/**
 * 
 * this file is used for GameScene and db
 * 
 * PAGES
 * 
 * login
 * signup
 * inforecovery
 * 
 * game
 *  islands
 *   quests
 * 
 * 
 * 
 * 
 */

export type QuestsProps = {
    islandId?: number,
    questId?: number,

    reward?: number
}

export type IslandProps = {
    userId?: number
    islandId?: number,
    islandName?: string,

    quests?: QuestsProps[]
}

export type UserProps = {
    id?: number,
    name?: string,
    email?: string,
    userName?: string,
    passWord?: string,

    island?: IslandProps[],

    color?: string
}