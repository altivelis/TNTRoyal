import * as mc from "@minecraft/server";

export const roby = {x:0.5, y:-58.5, z:0.5};
export const stage = [
  {
    name: "village",
    area: [
      {start: {x:-6, y:-59, z:-69}, end: {x:6, y:-59, z:-59},}
    ],
    spawn: [
      {x:6, y:-59, z:-69}, {x:6, y:-59, z:-59}, {x:-6, y:-59, z:-59}, {x:-6, y:-59, z:-69}
    ],
    block: "minecraft:brick_block",
  },
  {
    name: "snowy_taiga",
    area: [
      {start: {x:-70, y:-59, z:-69}, end: {x:-58, y:-59, z:-59}}
    ],
    spawn: [
      {x:-70, y:-59, z:-69}, {x:-58, y:-59, z:-59}, {x:-70, y:-59, z:-59}, {x:-58, y:-59, z:-69}
    ],
    block: "minecraft:snow"
  },
  {
    name: "desert",
    area: [
      {start: {x:58, y:-59, z:-69}, end: {x:70, y:-59, z:-59}}
    ],
    spawn: [
      {x:58, y:-59, z:-69}, {x:70, y:-59, z:-59}, {x:58, y:-59, z:-59}, {x:70, y:-59, z:-69}
    ],
    block: "minecraft:azalea_leaves"
  },
  {
    name: "mineshaft",
    area: [
      {start: {x:68, y:-59, z:-5}, end: {x:70, y:-59, z:5}},
      {start: {x:58, y:-59, z:-5}, end: {x:60, y:-59, z:5}},
      {start: {x:62, y:-57, z:2}, end: {x:66, y:-57, z:5}},
      {start: {x:62, y:-57, z:0}, end: {x:66, y:-57, z:0}},
      {start: {x:62, y:-57, z:-5}, end: {x:66, y:-57, z:-2}}
    ],
    spawn: [
      {x:58, y:-59, z:-5}, {x:58, y:-59, z:5}, {x:70, y:-59, z:-5}, {x:70, y:-59, z:5}
    ],
    block: "minecraft:cobblestone"
  }
]

//破壊可能ブロックリスト
export const breakable_block = [
  "minecraft:brick_block",
  "minecraft:snow",
  "minecraft:azalea_leaves",
  "minecraft:cobblestone",
]

//爆風が貫通するブロックリスト
export const through_block = [
  "minecraft:air",
]
