/**
 * このファイルはゲーム内で使用する定数（座標・ステージ情報・破壊可能ブロック・爆風貫通ブロック）を定義します。
 * ゲームロジックの各所で参照されます。
 */

import * as mc from "@minecraft/server";

export const roby = {x:0.5, y:-58.5, z:0.5};

/**
 * @typedef {Object} Stage
 * @property {string} name - The name of the stage.
 * @property {string} displayName - The display name of the stage, shown in the UI.
 * @property {{start: mc.Vector3, end: mc.Vector3}} area - The area of the stage defined by start and end coordinates.
 * @property {Array<mc.Vector3>} spawn - The spawn points within the stage.
 * @property {mc.Vector3} pivot - The pivot point of the stage.
 * @property {mc.Vector3} spectator - The spectator point for the stage.
 * @property {string} block - The block type used in the stage.
 * @property {string} icon - An optional icon for the stage.
 */
export const stage = [
  {
    name: "village",
    displayName: "村",
    area: {start: {x:-6, y:-59, z:-69}, end: {x:6, y:-59, z:-59}},
    spawn: [
      {x:6, y:-59, z:-69}, {x:6, y:-59, z:-59}, {x:-6, y:-59, z:-59}, {x:-6, y:-59, z:-69}
    ],
    pivot: {x:-7, y:-60, z:-70},
    spectator: {x:0.5, y:-58, z:-57.5},
    block: "minecraft:brick_block",
    icon: "textures/blocks/planks_oak.png"
  },
  {
    name: "snowy_taiga",
    displayName: "雪のタイガ",
    area: {start: {x:-70, y:-59, z:-69}, end: {x:-58, y:-59, z:-59}},
    spawn: [
      {x:-70, y:-59, z:-69}, {x:-58, y:-59, z:-59}, {x:-70, y:-59, z:-59}, {x:-58, y:-59, z:-69}
    ],
    pivot: {x:-71, y:-60, z:-70},
    spectator: {x:-63.5, y:-58, z:-57.5},
    block: "minecraft:snow",
    icon: "textures/blocks/planks_spruce.png"
  },
  {
    name: "desert",
    displayName: "砂漠",
    area: {start: {x:58, y:-59, z:-69}, end: {x:70, y:-59, z:-59}},
    spawn: [
      {x:58, y:-59, z:-69}, {x:70, y:-59, z:-59}, {x:58, y:-59, z:-59}, {x:70, y:-59, z:-69}
    ],
    pivot: {x:57, y:-60, z:-70},
    spectator: {x:64.5, y:-58, z:-57.5},
    block: "minecraft:azalea_leaves",
    icon: "textures/blocks/sand.png"
  },
  {
    name: "nether_fortress",
    displayName: "ネザー要塞",
    area: {start: {x:-70, y:-59, z:-5}, end: {x:-58, y:-59, z:5}},
    spawn: [
      {x:-70, y:-59, z:-5}, {x:-58, y:-59, z:5}, {x:-70, y:-59, z:5}, {x:-58, y:-59, z:-5}
    ],
    pivot: {x:-71, y:-62, z:-6},
    spectator: {x:-63.5, y:-57, z:6.5},
    block: "minecraft:netherrack",
    icon: "textures/blocks/nether_brick"
  },
  {
    name: "mineshaft",
    displayName: "廃坑",
    area: {start: {x:58, y:-59, z:-5}, end: {x:70, y:-57, z: 5}},
    spawn: [
      {x:58, y:-59, z:-5}, {x:70, y:-59, z:5}, {x:58, y:-59, z:5}, {x:70, y:-59, z:-5}
    ],
    pivot: {x:57, y:-60, z:-6},
    spectator: {x:64.5, y:-56, z:6.5},
    block: "minecraft:cobblestone",
    icon: "textures/blocks/cobblestone.png"
  },
  {
    name: "stronghold",
    displayName: "エンド要塞",
    area: {start: {x:-70, y:-58, z:59}, end: {x:-58, y:-58, z:69}},
    spawn: [
      {x:-70, y:-58, z:59}, {x:-58, y:-58, z:69}, {x:-70, y:-58, z:69}, {x:-58, y:-58, z:59}
    ],
    pivot: {x:-71, y:-60, z:58},
    spectator: {x:-63.5, y:-56, z:70.5},
    block: "minecraft:cracked_stone_bricks",
    icon: "textures/blocks/stonebrick.png"
  }
]

//破壊可能ブロックリスト
/**
 * 破壊可能なブロックのIDリスト
 */
export const breakable_block = [
  "minecraft:brick_block",
  "minecraft:snow",
  "minecraft:azalea_leaves",
  "minecraft:netherrack",
  "minecraft:cobblestone",
  "minecraft:cracked_stone_bricks"
]

//爆風が貫通するブロックリスト
/**
 * 爆風が貫通するブロックのIDリスト
 */
export const through_block = [
  "minecraft:air",
  "minecraft:light_weighted_pressure_plate",
  "minecraft:stone_pressure_plate",
  "minecraft:iron_door"
]
