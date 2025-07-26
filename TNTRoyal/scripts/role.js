/**
 * このファイルはプレイヤーのロール（役割）データを定義します。
 * 各ロールの初期値・最大値・特殊能力・アイコン情報を管理します。
 */

import * as mc from "@minecraft/server";

/**
 * @typedef {Object} roleList
 * @property {string} name - The name of the role.
 * @property {{init:Number, max:Number}} bomb - The bomb properties.
 * @property {{init:Number, max:Number}} power - The power properties.
 * @property {{init:Number, max:Number}} speed - The speed properties.
 * @property {{init:Boolean, able:Boolean}} blue - The blue properties.
 * @property {{init:Boolean, able:Boolean}} kick - The kick properties.
 * @property {{init:Boolean, able:Boolean}} punch - The punch properties.
 * @property {string|undefined} icon - The icon of the role, if any.
 * @property {string} particle - The particle effect associated with the role.
 * @property {string} description - A description of the role.
 */
export const roleList = [
  {
    name: "スティーブ",
    bomb: {init: 1, max: 8},
    power: {init:2, max: 8},
    speed: {init: 0, max: 8},
    blue: {init: false, able: true},
    kick: {init: false, able: true},
    punch: {init: false, able: true},
    icon: "textures/altivelis/steve.png",
    particle: "altivelis:steve_face_particle",
    description: "特徴のない基本的な能力だが、成長しきると非常に強力な力を発揮する。"
  },
  {
    name: "ゾンビ",
    bomb: {init: 5, max: 8},
    power: {init: 2, max: 4},
    speed: {init: 0, max: 2},
    blue: {init: false, able: true},
    kick: {init: false, able: false},
    punch: {init: true, able: true},
    icon: "textures/altivelis/zombie.png",
    particle: "altivelis:zombie_face_particle",
    description: "足は遅いが、多くのTNTとパンチによって奇襲を仕掛ける。"
  },
  {
    name: "クリーパー",
    bomb: {init: 2, max: 4},
    power: {init: 5, max: 8},
    speed: {init: 0, max: 2},
    blue: {init: false, able: true},
    kick: {init: false, able: true},
    punch: {init: false, able: false},
    icon: "textures/altivelis/creeper.png",
    particle: "altivelis:creeper_face_particle",
    description: "火力に特化した能力。火力＝パワー、パワー＝火力。"
  },
  {
    name: "スケルトン",
    bomb: {init: 1, max: 3},
    power: {init: 3, max: 5},
    speed: {init: 0, max: 5},
    blue: {init: true, able: true},
    kick: {init: false, able: false},
    punch: {init: false, able: true},
    icon: "textures/altivelis/skeleton.png",
    particle: "altivelis:skeleton_face_particle",
    description: "最初から貫通能力を持った貴重な能力。効率よくブロックを破壊し、相手を追い詰める。"
  },
  {
    name: "ウィザースケルトン",
    bomb: {init: 1, max: 2},
    power: {init: 2, max: 4},
    speed: {init: 5, max: 8},
    blue: {init: false, able: true},
    kick: {init: false, able: true},
    punch: {init: false, able: true},
    icon: "textures/altivelis/wither_skeleton.png",
    particle: "altivelis:wither_skeleton_face_particle",
    description: "移動速度に特化した能力。素早く移動し、相手を翻弄する。"
  },
  {
    name: "ウィザー",
    bomb: {init: 5, max: 5},
    power: {init: 5, max: 5},
    speed: {init: 5, max: 5},
    blue: {init: false, able: true},
    kick: {init: false, able: true},
    punch: {init: false, able: false},
    icon: "textures/altivelis/wither.png",
    particle: "altivelis:wither_face_particle",
    description: "最初からすべての能力が高いスタートダッシュ能力。アイテムに固執せず、攻撃的なプレイが可能。"
  },
  {
    name: "アイアンゴーレム",
    bomb: {init: 1, max: 1},
    power: {init: 8, max: 8},
    speed: {init: 0, max: 0},
    blue: {init: true, able: true},
    kick: {init: false, able: false},
    punch: {init: true, able: true},
    icon: "textures/altivelis/iron_golem.png",
    particle: "altivelis:iron_golem_face_particle",
    description: "一撃必殺のパワー、ただそれだけの能力。"
  },
  {
    name: "クモ",
    bomb: {init: 1, max: 4},
    power: {init: 2, max:4},
    speed: {init: 0, max:4},
    blue: {init: false, able: true},
    kick: {init: false, able: true},
    punch: {init: false, able: false},
    icon: "textures/altivelis/spider.png",
    particle: "altivelis:spider_face_particle",
    description: "特殊能力：クモの巣  CT：10秒\nクモの巣を設置し、踏んだ相手の動きを止めることができる。"
  }
]
