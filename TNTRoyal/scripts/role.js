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
  }
]
