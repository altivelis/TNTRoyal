import * as mc from "@minecraft/server";
import * as lib from "../lib";

/**
 * ブレイズのスキルを使用したときの処理
 * @param {mc.ItemComponentUseEvent} data - イベントデータ
 */
export function onUseMagmacube(data) {
  let magmacubeEvent = mc.world.afterEvents.itemReleaseUse.subscribe(ev=>{
    if(ev.itemStack.typeId == "altivelis:skill_magmacube" && ev.source == data.source) {
      let useLength = (10000 * mc.TicksPerSecond) - ev.useDuration;
      let ticks = 10;
      if(useLength * 5 < 10) {
        ticks = 10;
      } else if(useLength * 5 > 200) {
        ticks = 200;
      } else {
        ticks = useLength * 5;
      }
      putTNT(data.source, ticks);
      mc.world.afterEvents.itemReleaseUse.unsubscribe(magmacubeEvent);
    }
  })
}

/**
 * @param {mc.Player} source 
 * @param {Number} ticks 
 * @returns 
 */
function putTNT(source, ticks) {
  if(mc.world.getDynamicProperty("status") != 2) return;
  if(source.hasTag("dead") || source.hasTag("spectator")) return;
  if(source.dimension.getEntities({type:"altivelis:tnt"}).filter(e=>{return e?.owner.id == source.id}).length >= lib.getScore(source, "bomb")) return;
  if(source.dimension.getEntities({location: source.location, maxDistance:0.5, type:"altivelis:tnt"}).length > 0) return;
  let pos = source.location;
  pos = {x: Math.floor(pos.x) + 0.5, y: Math.floor(pos.y), z: Math.floor(pos.z) + 0.5};
  let tnt = source.dimension.spawnEntity("altivelis:tnt", pos);
  tnt.triggerEvent("orange");
  tnt.owner = source;
  tnt.setDynamicProperty("power", lib.getScore(source, "power"));
  tnt.dimension.playSound("fire.ignite", tnt.location, {volume: 10});
  lib.myTimeout(ticks, () => {
    if(tnt.isValid) tnt.triggerEvent("from_explosion");
  })
}