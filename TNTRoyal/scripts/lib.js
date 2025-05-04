import * as mc from "@minecraft/server";
import { breakable_block, roby } from "./main.js";

/**
 * Timeoutを見やすくする関数
 * @param {number} tick 
 * @param {()=>void} func
 */
export function myTimeout(tick, func){
  mc.system.runTimeout(func, tick);
}

/**
 * 
 * @param {mc.Vector3} pos1 
 * @param {mc.Vector3} pos2 
 * @returns {mc.Vector3}
 */
export function getCenter(pos1, pos2) {
  return {
    x: (pos1.x + pos2.x) / 2 + 0.5,
    y: (pos1.y + pos2.y) / 2,
    z: (pos1.z + pos2.z) / 2 + 0.5
  }
}

/**
 * @param {mc.Dimension} dimension
 * @param {mc.Vector3} location 
 */
export function explode_particle(dimension, location){
  let molang = new mc.MolangVariableMap();
  molang.setColorRGB("color", {red: 1, green: 0.5, blue: 0});
  dimension.spawnParticle("tntr:explosion", location, molang);
  dimension.getEntities().filter(e=>{
    return Math.floor(e.location.x) == Math.floor(location.x) &&
            Math.floor(e.location.y) == Math.floor(location.y) &&
            Math.floor(e.location.z) == Math.floor(location.z);
  }).forEach(entity=>{
    if(entity.typeId == "minecraft:tnt"){
      entity.triggerEvent("from_explosion");
      return;
    }
    if(entity.typeId == "altivelis:marker"){
      entity.remove();
      return;
    }
    if(entity instanceof mc.Player){
      entity.addTag("dead");
      entity.dimension.playSound("item.trident.thunder", entity.location, {volume: 10});
      entity.teleport(roby);
      entity.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.LateralMovement, false);
      mc.world.sendMessage(`§c${entity.nameTag}§rは爆発に巻き込まれた！`);
    }
  })
}

/**
 * @param {mc.Dimension} dimension
 * @param {mc.Vector3} location
 */
export function explode_block(dimension, location){
  let block = dimension.getBlock(location);
  if(block.typeId == "minecraft:air") {
    explode_particle(dimension, location);
    return;
  }
  if(breakable_block.includes(block.typeId)){
    dimension.setBlockType(location, "minecraft:air");
    explode_particle(dimension, location);
    if(Math.random() < 0.5) {
      let tag = "";
      switch(Math.floor(Math.random()*3)){
        case 0: tag = "bomb"; break;
        case 1: tag = "power"; break;
        case 2: tag = "speed"; break;
      }
      myTimeout(10, ()=>{
        let entity = dimension.spawnEntity("altivelis:marker", {...location, y: location.y+0.5});
        entity.addTag(tag);
        entity.dimension.playSound("random.pop", location, {volume: 10});
      })
    }
  }
}

/**
 * 
 * @param {mc.Dimension} dimension 
 * @param {mc.Vector3} start  
 * @param {mc.Vector3} end 
 */
export function clearField(dimension, start, end) {
  for(let x = start.x; x <= end.x; x++){
    for(let y = start.y; y <= end.y; y++){
      for(let z = start.z; z <= end.z; z++){
        let pos = {x, y, z};
        let block = dimension.getBlock(pos);
        if(breakable_block.includes(block.typeId)){
          dimension.setBlockType(pos, "minecraft:air");
        }
      }
    }
  }
}

/**
 * 
 * @param {mc.Dimension} dimension 
 * @param {mc.Vector3} start 
 * @param {mc.Vector3} end 
 * @param {string} blockType 
 */
export function setField(dimension, start, end, blockType) {
  clearField(dimension, start, end);
  for(let x=start.x; x<=end.x; x++){
    for(let z=start.z; z<=end.z; z++){
      if((Math.min(start.x, end.x)+1 >= x || Math.max(start.x, end.x)-1 <= x )
        && (Math.min(start.z, end.z)+1 >= z || Math.max(start.z, end.z)-1 <= z)
      ) continue;
      if(dimension.getBlock({x:x, y:start.y, z:z}).typeId == "minecraft:air"){
        if(Math.random() < 0.9){
          dimension.setBlockType({x:x, y:start.y, z:z}, blockType);
        }
      }
    }
  }
}

/**
 * 座標比較関数
 * @param {mc.Vector3} location1 
 * @param {mc.Vector3} location2 
 * @returns {boolean}
 */
export function compLocation(location1, location2) {
  return Math.floor(location1.x) == Math.floor(location2.x) &&
         Math.floor(location1.y) == Math.floor(location2.y) &&
         Math.floor(location1.z) == Math.floor(location2.z);
}