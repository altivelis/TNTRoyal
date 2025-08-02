import * as mc from "@minecraft/server";
import * as lib from "../lib";

/**
 * エンダーマンのスキルを使用したときの処理
 * @param {mc.ItemComponentUseEvent} data - イベントデータ
 */
export function onUseEnderman(data) {
  let pos = data.source.location;
  let v = {x:0, y:0, z:0};
  switch(data.source.getDynamicProperty("direction")) {
    case 0: // 前
      v.z = 1;
      break;
    case 1: // 左
      v.x = -1;
      break;
    case 2: // 後ろ
      v.z = -1;
      break;
    case 3: // 右
      v.x = 1;
      break;
  }
  let players = mc.world.getPlayers({excludeTags:["dead", "spectator"]}).filter(p => p.id != data.source.id);
  for(let i = 1; i < 9; i++) {
    let targetPos = {x: pos.x + v.x * i, y: pos.y, z: pos.z + v.z * i};
    let target = players.find(p => lib.compLocation(p.location, targetPos));
    if(target) {
      data.source.teleport(target.location);
      data.source.dimension.spawnParticle("minecraft:trial_spawner_detection_ominous", {...pos, x: pos.x-0.5, z: pos.z-0.5});
      data.source.dimension.spawnParticle("minecraft:trial_spawner_detection_ominous", {...target.location, x: target.location.x-0.5, z: target.location.z-0.5});
      data.source.dimension.playSound("mob.endermen.portal", target.location, {volume: 10});
      data.source.startItemCooldown("enderman", 600);
      return;
    }
  }
  data.source.startItemCooldown("enderman", 1);
}