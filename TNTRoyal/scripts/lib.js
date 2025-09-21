/**
 * このファイルはゲームロジック用のユーティリティ関数群を定義します。
 * スコア管理、爆風処理、フィールド操作、座標計算など多様な機能を提供します。
 */

import * as mc from "@minecraft/server";
import { breakable_block, lobby, stage, through_block } from "./const.js";
import { roleList } from "./role.js";

/**
 * 指定tick後に関数を実行するラッパー
 * @param {number} tick 
 * @param {()=>void} func
 */
export function myTimeout(tick, func){
  mc.system.runTimeout(func, tick);
}

/**
 * スコアボードから指定目標のスコアを取得
 * @param {mc.Entity | mc.ScoreboardIdentity | string} target 
 * @param {string} objective 
 * @returns {number | undefined}
 */
export function getScore(target, objective) {
  return mc.world.scoreboard.getObjective(objective).getScore(target);
}

/**
 * スコアボードにスコアをセット
 * @param {mc.Entity | mc.ScoreboardIdentity | string} target
 * @param {string} objective
 * @param {number} score
 * @returns {void}
 */
export function setScore(target, objective, score) {
  mc.world.scoreboard.getObjective(objective).setScore(target, score);
}

/**
 * スコアボードのスコアを加算
 * @param {mc.Entity | mc.ScoreboardIdentity | string} target
 * @param {string} objective
 * @param {number} score
 * @returns {number}
 */
export function addScore(target, objective, score) {
  return mc.world.scoreboard.getObjective(objective).addScore(target, score);
}

/**
 * 2点の中点を取得する関数
 * @param {{start:mc.Vector3, end:mc.Vector3}} area
 * @returns {mc.Vector3}
 */
export function getCenter(area) {
  let min = area.start;
  let max = area.end;
  for(let i=1; i<area.length; i++){
    min.x = Math.min(min.x, area.start.x);
    min.y = Math.min(min.y, area.start.y);
    min.z = Math.min(min.z, area[i].start.z);
    max.x = Math.max(max.x, area[i].end.x);
    max.y = Math.max(max.y, area[i].end.y);
    max.z = Math.max(max.z, area[i].end.z);
  }
  return {
    x: Math.floor((min.x + max.x) / 2)+0.5,
    y: Math.floor((min.y + max.y) / 2)+0.5,
    z: Math.floor((min.z + max.z) / 2)+0.5,
  };
}

/**
 * 爆風エフェクトを出す関数
 * @param {mc.Dimension} dimension
 * @param {mc.Vector3} location 
 * @param {mc.Player | null} owner
 * @param {boolean} revival
 */
export function explode_particle(dimension, location, owner = undefined, revival = false){
  let molang = new mc.MolangVariableMap();
  molang.setColorRGB("color", {red: 1, green: 0.5, blue: 0});
  dimension.spawnParticle("tntr:explosion", {x:Math.floor(location.x)+0.5, y:Math.floor(location.y)+0.5, z:Math.floor(location.z)+0.5}, molang);
  dimension.getEntities().filter(e=>{
    return compLocation(e.location, location);
  }).forEach(entity=>{
    if(entity.typeId == "altivelis:tnt"){
      entity.triggerEvent("from_explosion");
      return;
    }
    if(entity.typeId == "altivelis:marker" && !entity.hasTag("spider_web")){
      entity.remove();
      return;
    }
    if(entity instanceof mc.Player && mc.world.getDynamicProperty("status") == 2 && !entity.hasTag("revival") && !entity.hasTag("dead")) {
      //復活
      if(revival && owner != undefined) {
        owner.getComponent(mc.EntityInventoryComponent.componentId).container.clearAll();
        owner.teleport({x:Math.floor(entity.location.x)+0.5, y:Math.floor(entity.location.y)+0.5, z:Math.floor(entity.location.z)+0.5});
        mc.world.sendMessage(`§a${owner.nameTag.replace("\n", "")}§rが復活！！`);
        initPlayer(owner);
        //無敵化、パーティクル
        let runId = mc.system.runInterval(()=>{
          owner.dimension.spawnParticle("minecraft:totem_particle", owner.location);
        }, 2);
        owner.addTag("revival");
        myTimeout(40, ()=>{
          owner.removeTag("revival");
          mc.system.clearRun(runId);
        })
      }
      dropPlayer(entity, "爆風に巻き込まれた！");
    }
  })
}

/**
 * 爆風でブロックを破壊する関数
 * @param {mc.Dimension} dimension
 * @param {mc.Vector3} location
 * @param {mc.Player | null} owner
 * @param {boolean} revival
 */
export function explode_block(dimension, location, owner = undefined, revival = false) {
  let block = dimension.getBlock(location);
  if(block.typeId == "minecraft:air") {
    explode_particle(dimension, location, owner, revival);
    return;
  }
  if(breakable_block.includes(block.typeId)){
    dimension.setBlockType(location, "minecraft:air");
    explode_particle(dimension, location, owner, revival);
    if(Math.random() < 0.5) {
      let tag = "";
      let probabilities = [
        {tag: "bomb", probability: 16},
        {tag: "power", probability: 12},
        {tag: "speed", probability: 12},
        {tag: "blue_tnt", probability: 1},
        {tag: "kick", probability: 2},
        {tag: "punch", probability: 2},
        {tag: "full_fire", probability: 1},
        {tag: "slowness", probability: 2},
      ]
      let total = probabilities.reduce((sum, item) => sum + item.probability, 0);
      let random = Math.floor(Math.random() * total);
      let sum = 0;
      for(let i=0; i<probabilities.length; i++){
        sum += probabilities[i].probability;
        if(random < sum){
          tag = probabilities[i].tag;
          break;
        }
      }
      if(tag == "") return;
      myTimeout(10, ()=>{
        let entity = dimension.spawnEntity("altivelis:marker", location);
        entity.addTag(tag);
        entity.dimension.playSound("random.pop", location, {volume: 10});
      })
    }
  }
}

/**
 * ステージをクリアする関数
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
 * ステージの準備をする
 * @param {mc.Dimension} dimension 
 * @param {Object} stageInfo 
 * @param {string} stageInfo.name
 * @param {{start: mc.Vector3, end: mc.Vector3}} stageInfo.area
 * @param {Array<mc.Vector3>} stageInfo.spawn
 * @param {mc.Vector3} stageInfo.pivot
 * @param {string} stageInfo.block
 */
export function setField(dimension, stageInfo) {
  mc.world.structureManager.place(stageInfo.name, dimension, stageInfo.pivot);
  clearField(dimension, stageInfo.area.start, stageInfo.area.end);
  mc.world.structureManager.place(stageInfo.name, dimension, stageInfo.pivot, {integrity: 0.9});
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

/**
 * 死亡時アイテムドロップ関数
 * @param {mc.Player} player
 */
export function dropItem(player) {
  /** @type {Number} */
  let stageIndex = mc.world.getDynamicProperty("stage");
  let bomb = getScore(player, "bomb") - roleList[player.getDynamicProperty("role")].bomb.init;
  let power = getScore(player, "power") - roleList[player.getDynamicProperty("role")].power.init;
  let speed = getScore(player, "speed") - roleList[player.getDynamicProperty("role")].speed.init;
  let areas = Array.from(new mc.BlockVolume(stage[stageIndex].area.start, stage[stageIndex].area.end).getBlockLocationIterator());
  // if(stage[stageIndex].area.length > 1) {
  //   for(let i=1; i<stage[stageIndex].area.length; i++){
  //     areas.push(...Array.from(new mc.BlockVolume(stage[stageIndex].area.start, stage[stageIndex].area.end).getBlockLocationIterator()));
  //   }
  // }
  let dimension = mc.world.getDimension("overworld");
  let entities = dimension.getEntities({excludeTypes: ["minecraft:player"]});
  areas.forEach((pos, index, array)=>{
    let block = dimension.getBlock(pos);
    if(
      (!breakable_block.includes(block.typeId) && !through_block.includes(block.typeId)) ||
      entities.find(e=>{return compLocation(e.location, pos)}) != undefined
    ) {
      array.splice(index, 1);
    }
  })
  for(let i=0; i<bomb; i++){
    if(areas.length == 0) return;
    let random = Math.floor(Math.random()*areas.length);
    let pos = areas[random];
    if(through_block.includes(dimension.getBlock(pos).typeId)){
      let entity = dimension.spawnEntity("altivelis:marker", {...pos, x:pos.x+0.5, y:pos.y, z:pos.z+0.5});
      entity.addTag("bomb");
      areas.splice(random, 1);
    }else{
      let entity = dimension.spawnEntity("altivelis:marker", {...pos, x:pos.x+0.5, y:pos.y+1, z:pos.z+0.5});
      entity.addTag("bomb");
      areas.splice(random, 1);
    }
  }
  for(let i=0; i<power; i++){
    if(areas.length == 0) return;
    let random = Math.floor(Math.random()*areas.length);
    let pos = areas[random];
    if(through_block.includes(dimension.getBlock(pos).typeId)){
      let entity = dimension.spawnEntity("altivelis:marker", {...pos, x:pos.x+0.5, y:pos.y, z:pos.z+0.5});
      entity.addTag("power");
      areas.splice(random, 1);
    }else{
      let entity = dimension.spawnEntity("altivelis:marker", {...pos, x:pos.x+0.5, y:pos.y+1, z:pos.z+0.5});
      entity.addTag("power");
      areas.splice(random, 1);
    }
  }
  for(let i=0; i<speed; i++){
    if(areas.length == 0) return;
    let random = Math.floor(Math.random()*areas.length);
    let pos = areas[random];
    if(through_block.includes(dimension.getBlock(pos).typeId)){
      let entity = dimension.spawnEntity("altivelis:marker", {...pos, x:pos.x+0.5, y:pos.y, z:pos.z+0.5});
      entity.addTag("speed");
      areas.splice(random, 1);
    }else{
      let entity = dimension.spawnEntity("altivelis:marker", {...pos, x:pos.x+0.5, y:pos.y+1, z:pos.z+0.5});
      entity.addTag("speed");
      areas.splice(random, 1);
    }
  }
  if(player.getDynamicProperty("tnt") == 1 && roleList[player.getDynamicProperty("role")].blue.init == false) {
    if(areas.length == 0) return;
    let random = Math.floor(Math.random()*areas.length);
    let pos = areas[random];
    if(through_block.includes(dimension.getBlock(pos).typeId)){
      let entity = dimension.spawnEntity("altivelis:marker", {...pos, x:pos.x+0.5, y:pos.y, z:pos.z+0.5});
      entity.addTag("blue_tnt");
      areas.splice(random, 1);
    }else{
      let entity = dimension.spawnEntity("altivelis:marker", {...pos, x:pos.x+0.5, y:pos.y+1, z:pos.z+0.5});
      entity.addTag("blue_tnt");
      areas.splice(random, 1);
    }
  }
  if(player.hasTag("kick") && roleList[player.getDynamicProperty("role")].kick.init == false) {
    if(areas.length == 0) return;
    let random = Math.floor(Math.random()*areas.length);
    let pos = areas[random];
    if(through_block.includes(dimension.getBlock(pos).typeId)){
      let entity = dimension.spawnEntity("altivelis:marker", {...pos, x:pos.x+0.5, y:pos.y, z:pos.z+0.5});
      entity.addTag("kick");
      areas.splice(random, 1);
    }else{
      let entity = dimension.spawnEntity("altivelis:marker", {...pos, x:pos.x+0.5, y:pos.y+1, z:pos.z+0.5});
      entity.addTag("kick");
      areas.splice(random, 1);
    }
  }
  if(player.hasTag("punch") && roleList[player.getDynamicProperty("role")].punch.init == false) {
    if(areas.length == 0) return;
    let random = Math.floor(Math.random()*areas.length);
    let pos = areas[random];
    if(through_block.includes(dimension.getBlock(pos).typeId)){
      let entity = dimension.spawnEntity("altivelis:marker", {...pos, x:pos.x+0.5, y:pos.y, z:pos.z+0.5});
      entity.addTag("punch");
      areas.splice(random, 1);
    }else{
      let entity = dimension.spawnEntity("altivelis:marker", {...pos, x:pos.x+0.5, y:pos.y+1, z:pos.z+0.5});
      entity.addTag("punch");
      areas.splice(random, 1);
    }
  }
}

/**
 * 螺旋状に座標を取得する関数
 * @param {mc.Vector3} maxPoint 
 * @param {mc.Vector3} minPoint 
 * @returns {mc.Vector3[]}
 */
export function spiralOrderCoordinates(maxPoint, minPoint) {
  // 最大点と最小点の座標を取得
  const {x:maxX, y:maxY, z:maxZ} = maxPoint;
  const {x:minX, y:minY, z:minZ} = minPoint;
  const Y = Math.max(maxY, minY); // y座標は最大値を使用

  // 結果を格納する配列
  /**
   * @type {mc.Vector3[]}
   */
  const result = [];

  // スパイラルの境界を設定
  let left = maxX, right = minX, top = maxZ, bottom = minZ;

  while (left >= right && top >= bottom) {
      // 上辺を左から右へ
      for (let x = left; x >= right; x--) {
          result.push({x:x, y:Y, z:top});
      }
      top--;

      // 右辺を上から下へ
      for (let z = top; z >= bottom; z--) {
          result.push({x:right, y:Y, z:z});
      }
      right++;

      // 下辺を右から左へ
      if (top >= bottom) {
          for (let x = right; x <= left; x++) {
              result.push({x:x, y:Y, z:bottom});
          }
          bottom++;
      }

      // 左辺を下から上へ
      if (left >= right) {
          for (let z = bottom; z <= top; z++) {
              result.push({x:left, y:Y, z:z});
          }
          left--;
      }
  }

  return result;
}

/**
 * 障害物判定関数
 * @param {mc.Dimension} dimension 
 * @param {mc.Vector3} location 
 * @return {boolean}
 */
export function tryTeleport(dimension, location){
  let block = dimension.getBlock(location);
  if(block.typeId == "minecraft:air") {
    let blockEntities = dimension.getEntities({excludeTypes: ["minecraft:player", "altivelis:marker"]}).filter(e=>{
      if(e.typeId == "altivelis:tnt" || e.typeId == "altivelis:pressure_block") {
        if(compLocation(e.location, location) || compLocation(e.location, {...location, y: location.y+1})) return true;
      }
    })
    if(blockEntities.length > 0) return false;
    if(block.above().typeId == "minecraft:air"){
      return true;
    }else{
      return false;
    }
  }else{
    return false;
  }
}

/**
 * プレイヤー初期化関数
 * @param {mc.Player} player
 */
export function initPlayer(player) {
  player.getComponent(mc.EntityInventoryComponent.componentId).container.clearAll();
  player.removeTag("dead");
  //初期ステータス適用
  /**@type {Number} */
  let roleIndex = player.getDynamicProperty("role");
  let role = roleList[roleIndex];
  setScore(player, "bomb", role.bomb.init);
  setScore(player, "power", role.power.init);
  setScore(player, "speed", role.speed.init);
  player.setDynamicProperty("tnt", role.blue.init ? 1 : 0);
  if(role.kick.init) {
    player.addTag("kick");
  }
  if(role.punch.init) {
    player.addTag("punch");
    let item = new mc.ItemStack("altivelis:punch", 1);
    item.lockMode = mc.ItemLockMode.inventory;
    player.getComponent(mc.EntityInventoryComponent.componentId).container.addItem(item);
  }
  if(role.name == "クモ") {
    let item = new mc.ItemStack("altivelis:skill_spider", 1);
    item.lockMode = mc.ItemLockMode.inventory;
    player.getComponent(mc.EntityInventoryComponent.componentId).container.addItem(item);
  }
  if(role.name == "エンダーマン") {
    let item = new mc.ItemStack("altivelis:skill_enderman", 1);
    item.lockMode = mc.ItemLockMode.inventory;
    player.getComponent(mc.EntityInventoryComponent.componentId).container.addItem(item);
  }
  if(role.name == "ブレイズ") {
    let item = new mc.ItemStack("altivelis:skill_blaze", 1);
    item.lockMode = mc.ItemLockMode.inventory;
    player.getComponent(mc.EntityInventoryComponent.componentId).container.addItem(item);
  }
  player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveForward, true);
  player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveBackward, true);
  player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveLeft, true);
  player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveRight, true);
}

/**
 * 脱落処理関数
 * @param {mc.Player} player
 * @param {string} reason
 * @param {string} sound
 */
export function dropPlayer(player, reason, sound = "item.trident.thunder") {
  if(mc.world.getDynamicProperty("status") == 2 && !player.hasTag("dead")) {
    player.addTag("dead");
    player.dimension.playSound(sound, player.location, {volume: 10});
    mc.world.sendMessage(`§c${player.nameTag.replace("\n", "")}§rは${reason}！`);
    dropItem(player);
    /**@type {Number} */
    let roleIndex = player.getDynamicProperty("role");
    let role = roleList[roleIndex];
    setScore(player, "bomb", role.bomb.init);
    setScore(player, "power", role.power.init);
    setScore(player, "speed", role.speed.init);
    player.removeTag("kick");
    player.removeTag("punch");
    player.getComponent(mc.EntityInventoryComponent.componentId).container.clearAll();
    if(getScore("残り時間", "display") <= 60 || mc.world.getDynamicProperty("misobon") === false) {
      player.teleport(lobby);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.LateralMovement, false);
    }
    else {
      /**@type {Number} */
      let stageIndex = mc.world.getDynamicProperty("stage");
      player.teleport(stage[stageIndex].spectator);
      let slot = player.getComponent(mc.EntityInventoryComponent.componentId).container.getSlot(0);
      slot.setItem(new mc.ItemStack("altivelis:shot"));
      slot.getItem().lockMode = mc.ItemLockMode.slot;
      player.selectedSlotIndex = 0;
    }
  }
}
