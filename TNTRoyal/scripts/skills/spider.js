import * as mc from "@minecraft/server";
import * as lib from "../lib";

/**
 * クモのスキルを使用したときの処理
 * @param {mc.ItemComponentUseEvent} data 
 */
export function onUseSpider(data) {
  let pos = data.source.location;
  let webs = data.source.dimension.getEntities({type: "altivelis:marker", tags: ["spider_web"]});
  if(webs.find(e=>lib.compLocation(e.location, pos))) {
    data.source.startItemCooldown("spider", 0);
    return;
  }
  data.source.startItemCooldown("spider", 200);
  pos = {x: Math.floor(pos.x) + 0.5, y: Math.floor(pos.y) + 0.5, z: Math.floor(pos.z) + 0.5};
  let entity = data.source.dimension.spawnEntity("altivelis:marker", pos);
  entity.owner = data.source;
  entity.addTag("spider_web");
  entity.dimension.playSound("step.web", pos, {volume: 10});
}

/**
 * 
 * @param {mc.Player} player 
 * @param {mc.Entity} web 
 */
export function getSpiderWeb(player, web) {
  if(!web.hasTag("spider_web")) return;
  if(web?.owner != player) {
    player.addTag("spider_web");
    player.dimension.playSound("break.web", player.location, {volume: 10});
    web.remove();
    lib.myTimeout(20, ()=>{
      player.removeTag("spider_web");
    })
  }
}