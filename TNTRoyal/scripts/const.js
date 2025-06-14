import * as mc from "@minecraft/server";

export const roby = {x:0.5, y:-58.5, z:0.5};

/**
 * @typedef {Object} Stage
 * @property {string} name - The name of the stage.
 * @property {{start: mc.Vector3, end: mc.Vector3}} area - The area of the stage defined by start and end coordinates.
 * @property {Array<mc.Vector3>} spawn - The spawn points within the stage.
 * @property {mc.Vector3} pivot - The pivot point of the stage.
 * @property {string} block - The block type used in the stage.
 * @property {string} icon - An optional icon for the stage.
 */
export const stage = [
  {
    name: "village",
    area: {start: {x:-6, y:-59, z:-69}, end: {x:6, y:-59, z:-59}},
    spawn: [
      {x:6, y:-59, z:-69}, {x:6, y:-59, z:-59}, {x:-6, y:-59, z:-59}, {x:-6, y:-59, z:-69}
    ],
    pivot: {x:-7, y:-60, z:-70},
    block: "minecraft:brick_block",
    icon: "textures/blocks/planks_oak.png"
  },
  {
    name: "snowy_taiga",
    area: {start: {x:-70, y:-59, z:-69}, end: {x:-58, y:-59, z:-59}},
    spawn: [
      {x:-70, y:-59, z:-69}, {x:-58, y:-59, z:-59}, {x:-70, y:-59, z:-59}, {x:-58, y:-59, z:-69}
    ],
    pivot: {x:-71, y:-60, z:-70},
    block: "minecraft:snow",
    icon: "textures/blocks/planks_spruce.png"
  },
  {
    name: "desert",
    area: {start: {x:58, y:-59, z:-69}, end: {x:70, y:-59, z:-59}},
    spawn: [
      {x:58, y:-59, z:-69}, {x:70, y:-59, z:-59}, {x:58, y:-59, z:-59}, {x:70, y:-59, z:-69}
    ],
    pivot: {x:57, y:-60, z:-70},
    block: "minecraft:azalea_leaves",
    icon: "textures/blocks/sand.png"
  },
  {
    name: "nether_fortress",
    area: {start: {x:-70, y:-59, z:-5}, end: {x:-58, y:-59, z:5}},
    spawn: [
      {x:-70, y:-59, z:-5}, {x:-58, y:-59, z:5}, {x:-70, y:-59, z:5}, {x:-58, y:-59, z:-5}
    ],
    pivot: {x:-71, y:-62, z:-6},
    block: "minecraft:netherrack",
    icon: "textures/blocks/nether_brick"
  },
  {
    name: "mineshaft",
    area: {start: {x:58, y:-59, z:-5}, end: {x:70, y:-57, z: 5}},
    spawn: [
      {x:58, y:-59, z:-5}, {x:70, y:-59, z:5}, {x:58, y:-59, z:5}, {x:70, y:-59, z:-5}
    ],
    pivot: {x:57, y:-60, z:-6},
    block: "minecraft:cobblestone",
    icon: "textures/blocks/cobblestone.png"
  }
]

//破壊可能ブロックリスト
export const breakable_block = [
  "minecraft:brick_block",
  "minecraft:snow",
  "minecraft:azalea_leaves",
  "minecraft:netherrack",
  "minecraft:cobblestone",
]

//爆風が貫通するブロックリスト
export const through_block = [
  "minecraft:air",
]
