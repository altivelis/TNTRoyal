import * as mc from "@minecraft/server";
import * as lib from "../lib";

/**
 * ブレイズのスキルを使用したときの処理
 * @param {mc.ItemComponentUseEvent} data - イベントデータ
 */
export function onUseBlaze(data) {
  let pos = data.source.dimension.getBlock(data.source.location).bottomCenter();
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
  let tnts = data.source.dimension.getEntities({type: "altivelis:tnt"});
  /**@type {Array<mc.vector3>} */
  let locations = []
  for(let i = 1; i < 9; i++) {
    let targetPos = {x: pos.x + v.x * i, y: pos.y, z: pos.z + v.z * i};
    locations.push(targetPos);
    let target = tnts.find(t => lib.compLocation(t.location, targetPos));
    if(target) {
      lib.myTimeout(5, () => {
        if(!target.isValid) return;
        target.triggerEvent("from_explosion");
      })
      locations.forEach(p => {
        data.source.dimension.spawnParticle("minecraft:mobflame_single", {...p, y: p.y + 1});
      })
      data.source.dimension.playSound("mob.blaze.shoot", pos, {volume: 10});
      data.source.startItemCooldown("blaze", 200);
      return;
    }
  }
  data.source.startItemCooldown("blaze", 1);
}