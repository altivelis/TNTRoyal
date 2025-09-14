/**
 * このファイルはゲーム全体の進行管理・イベント処理を担当します。
 * ゲーム開始・終了、各種イベントハンドラ、プレイヤー・TNTの状態管理などを実装しています。
 */

import * as mc from "@minecraft/server";
import * as lib from "./lib.js";
import "./menu.js";
import "./button.js";
import "./item.js";
import { roleList } from "./role.js";
import { breakable_block, lobby, stage, through_block } from "./const.js";
import { getSpiderWeb } from "./skills/spider.js";
import "./commands/index.js";

let tick = 0;
let pressureTick = 0;
/**
 * @type {mc.Vector3[]}
 */
let pressure_location = [];
let pressure_rate = 5;
/**
 * ゲーム開始時の参加人数
 */
let initialPlayerCount = 0;

mc.system.runInterval(()=>{
  const players = mc.world.getPlayers();
  const joinPlayers = mc.world.getPlayers({excludeTags:["spectator"]});
  /** @type {Number} */
  let stageIndex = mc.world.getDynamicProperty("stage");
  players.forEach(player=>{
    if(!mc.world.scoreboard.getObjective("bomb").getParticipants().includes(player.scoreboardIdentity)) {
      lib.setScore(player, "bomb", 1);
    }
    if(!mc.world.scoreboard.getObjective("power").getParticipants().includes(player.scoreboardIdentity)) {
      lib.setScore(player, "power", 2);
    }
    if(!mc.world.scoreboard.getObjective("speed").getParticipants().includes(player.scoreboardIdentity)) {
      lib.setScore(player, "speed", 0);
    }
    if(player.getDynamicProperty("role") == undefined) {
      player.setDynamicProperty("role", 0);
    }

    // プレイヤー名にロール名を付加
    const roleIndex = player.getDynamicProperty("role") || 0;
    const roleName = roleList[roleIndex].name;
    const expectedNameTag = `${player.name}\n(${roleName})`;
    
    // nameTagが期待する形式でなければ更新
    if (player.nameTag !== expectedNameTag) {
      player.nameTag = expectedNameTag;
    }

    //入力方向検知
    let size = 0.2;
    let strength = 0.3;
    let delay = 5;
    let moveVector = player.inputInfo.getMovementVector();
    if((moveVector.x != 0 || moveVector.y != 0) && mc.world.getDynamicProperty("status") == 2 && !player.hasTag("dead")) {
      if(Math.abs(moveVector.x) > Math.abs(moveVector.y)) {
        if(moveVector.x > 0) {
          player.setDynamicProperty("direction", 3);//左
          if(player.getVelocity().x == 0 && !player.hasTag("tp")) {
            //キック
            if(player.hasTag("kick")){
              let touchTNT = player.dimension.getEntities({type:"altivelis:tnt"}).filter(e=>{return lib.compLocation(e.location, {...player.location, x:player.location.x+1})});
              if(touchTNT.length > 0) {
                touchTNT.forEach(tnt=>{
                  tnt.setDynamicProperty("direction", 3);
                  tnt.setDynamicProperty("kickOwnerId", player.id);
                })
                player.addTag("tp");
                lib.myTimeout(delay, ()=>{
                  player.removeTag("tp");
                })
              }
            }
            //通り道検知
            if(!player.hasTag("tp") && player.dimension.getBlock({...player.location, x: player.location.x+1}).typeId == "minecraft:air") {
              player.applyKnockback({x:0, z:(player.location.z > Math.floor(player.location.z)+0.5) ? -strength : strength}, 0);
              player.addTag("tp");
              lib.myTimeout(delay, ()=>{
                player.removeTag("tp");
              })
            }else{
              if(player.location.z > Math.floor(player.location.z) + 1 - size) {
                if(lib.tryTeleport(player.dimension, {...player.location, x: player.location.x+1, z: player.location.z+1})) {
                  player.applyKnockback({x:0, z:strength*2}, 0);
                  player.addTag("tp");
                  lib.myTimeout(delay, ()=>{
                    player.removeTag("tp");
                  })
                }
              }else if(player.location.z < Math.floor(player.location.z) + size) {
                if(lib.tryTeleport(player.dimension, {...player.location, x: player.location.x+1, z: player.location.z-1})) {
                  player.applyKnockback({x:0, z:-strength*2}, 0);
                  player.addTag("tp");
                  lib.myTimeout(delay, ()=>{
                    player.removeTag("tp");
                  })
                }
              }
            }
          }
        }else{
          player.setDynamicProperty("direction", 1);//右
          if(player.getVelocity().x == 0 && !player.hasTag("tp")) {
            //キック
            if(player.hasTag("kick")){
              let touchTNT = player.dimension.getEntities({type:"altivelis:tnt"}).filter(e=>{return lib.compLocation(e.location, {...player.location, x:player.location.x-1})});
              if(touchTNT.length > 0) {
                touchTNT.forEach(tnt=>{
                  tnt.setDynamicProperty("direction", 1);
                  tnt.setDynamicProperty("kickOwnerId", player.id);
                })
                player.addTag("tp");
                lib.myTimeout(delay, ()=>{
                  player.removeTag("tp");
                })
              }
            }
            //通り道検知
            if(!player.hasTag("tp") && lib.tryTeleport(player.dimension, {...player.location, x: player.location.x-1})) {
              player.applyKnockback({x:0, z:(player.location.z > Math.floor(player.location.z)+0.5) ? -strength : strength}, 0);
              player.addTag("tp");
              lib.myTimeout(delay, ()=>{
                player.removeTag("tp");
              })
            }else{
              if(player.location.z > Math.floor(player.location.z) + 1 - size) {
                if(lib.tryTeleport(player.dimension, {...player.location, x: player.location.x-1, z: player.location.z+1})) {
                  player.applyKnockback({x:0, z:strength*2}, 0);
                  player.addTag("tp");
                  lib.myTimeout(delay, ()=>{
                    player.removeTag("tp");
                  })
                }
              }else if(player.location.z < Math.floor(player.location.z) + size) {
                if(lib.tryTeleport(player.dimension, {...player.location, x: player.location.x-1, z: player.location.z-1})) {
                  player.applyKnockback({x:0, z:-strength*2}, 0);
                  player.addTag("tp");
                  lib.myTimeout(delay, ()=>{
                    player.removeTag("tp");
                  })
                }
              }
            }
          }
        }
      }else{
        if(moveVector.y > 0) {
          player.setDynamicProperty("direction", 0);//上
          if(player.getVelocity().z == 0 && !player.hasTag("tp")) {
            //キック
            if(player.hasTag("kick")){
              let touchTNT = player.dimension.getEntities({type:"altivelis:tnt"}).filter(e=>{return lib.compLocation(e.location, {...player.location, z:player.location.z+1})});
              if(touchTNT.length > 0) {
                touchTNT.forEach(tnt=>{
                  tnt.setDynamicProperty("direction", 0);
                  tnt.setDynamicProperty("kickOwnerId", player.id);
                })
                player.addTag("tp");
                lib.myTimeout(delay, ()=>{
                  player.removeTag("tp");
                })
              }
            }
            //通り道検知
            if(!player.hasTag("tp") && lib.tryTeleport(player.dimension, {...player.location, z: player.location.z+1})) {
              player.applyKnockback({x:(player.location.x > Math.floor(player.location.x)+0.5) ? -strength : strength, z:0}, 0);
              player.addTag("tp");
              lib.myTimeout(delay, ()=>{
                player.removeTag("tp");
              })
            }else{
              if(player.location.x > Math.floor(player.location.x) + 1 - size) {
                if(lib.tryTeleport(player.dimension, {...player.location, x: player.location.x+1, z: player.location.z+1})) {
                  player.applyKnockback({x:strength*2, z:0}, 0);
                  player.addTag("tp");
                  lib.myTimeout(delay, ()=>{
                    player.removeTag("tp");
                  })
                }
              }else if(player.location.x < Math.floor(player.location.x) + size) {
                if(lib.tryTeleport(player.dimension, {...player.location, x: player.location.x-1, z: player.location.z+1})) {
                  player.applyKnockback({x:-strength*2, z:0}, 0);
                  player.addTag("tp");
                  lib.myTimeout(delay, ()=>{
                    player.removeTag("tp");
                  })
                }
              }
            }
          }
        }else{
          player.setDynamicProperty("direction", 2);//下
          if(player.getVelocity().z == 0 && !player.hasTag("tp")) {
            //キック
            if(player.hasTag("kick")){
              let touchTNT = player.dimension.getEntities({type:"altivelis:tnt"}).filter(e=>{return lib.compLocation(e.location, {...player.location, z:player.location.z-1})});
              if(touchTNT.length > 0) {
                touchTNT.forEach(tnt=>{
                  tnt.setDynamicProperty("direction", 2);
                  tnt.setDynamicProperty("kickOwnerId", player.id);
                })
                player.addTag("tp");
                lib.myTimeout(delay, ()=>{
                  player.removeTag("tp");
                })
              }
            }
            //通り道検知
            if(!player.hasTag("tp") && lib.tryTeleport(player.dimension, {...player.location, z: player.location.z-1})) {
              player.applyKnockback({x:(player.location.x > Math.floor(player.location.x)+0.5) ? -strength : strength, z:0}, 0);
              player.addTag("tp");
              lib.myTimeout(delay, ()=>{
                player.removeTag("tp");
              })
            }else{
              if(player.location.x > Math.floor(player.location.x) + 1 - size) {
                if(lib.tryTeleport(player.dimension, {...player.location, x: player.location.x+1, z: player.location.z-1})) {
                  player.applyKnockback({x:strength*2, z:0}, 0);
                  player.addTag("tp");
                  lib.myTimeout(delay, ()=>{
                    player.removeTag("tp");
                  })
                }
              }else if(player.location.x < Math.floor(player.location.x) + size) {
                if(lib.tryTeleport(player.dimension, {...player.location, x: player.location.x-1, z: player.location.z-1})) {
                  player.applyKnockback({x:-strength*2, z:0}, 0);
                  player.addTag("tp");
                  lib.myTimeout(delay, ()=>{
                    player.removeTag("tp");
                  })
                }
              }
            }
          }
        }
      }
    }

    if(mc.world.getDynamicProperty("status") == 0) {
      //ステータス表示
      player.onScreenDisplay.setActionBar(
        `あなたは${(player.hasTag("spectator") ? "§l§7観戦者§r" : "§l§a参加者§r")}です§r\n` +
        `現在の人数: §l${(joinPlayers.length > stage[stageIndex].spawn.length) ? "§c" : "§b"}${joinPlayers.length}§r\n` +
        `能力: §l§6${roleList[player.getDynamicProperty("role")].name}§r\n` +
        `ステージ: §l§e${stage[stageIndex].displayName}§r\n`
      )
    }

    if(mc.world.getDynamicProperty("status") == 2) {
      //終了判定
      const alivePlayers = mc.world.getPlayers({tags:["player"], excludeTags:["dead"]}).length;
      if (
        (initialPlayerCount === 1 && alivePlayers === 0) ||
        (initialPlayerCount !== 1 && alivePlayers <= 1)
      ) {
        endGame();
      }
      //移動速度
      let moveComp = player.getComponent(mc.EntityMovementComponent.componentId);
      if(player.hasTag("dead")){
        moveComp.setCurrentValue(moveComp.defaultValue);
      }
      else if(player.hasTag("spider_web")) {
        moveComp.setCurrentValue(moveComp.defaultValue - 0.1);
      }
      else {
        moveComp.setCurrentValue(moveComp.defaultValue + 0.01 * lib.getScore(player, "speed"));
      }

      //ステータス表示
      if(player.hasTag("player")){
        /**
         * @type {roleList}
         */
        let role = roleList[player.getDynamicProperty("role")];
        player.onScreenDisplay.setActionBar(
          `§l能力: §e${role.name}§r\n` +
          `§l§cTNT個数§r: §l${lib.getScore(player,"bomb")==role.bomb.max ? "§d" : "§a"}${lib.getScore(player,"bomb")}§r/${role.bomb.max}\n` +
          `§l§6火力§r: §l${lib.getScore(player,"power")==role.power.max ? "§d" : "§a"}${lib.getScore(player,"power")}§r/${role.power.max}\n` +
          `§l§bスピード§r: §l${lib.getScore(player,"speed")==role.speed.max ? "§d" : "§a"}${lib.getScore(player,"speed")}§r/${role.speed.max}\n` +
          `§l§4TNT§r: §l§g${["通常", "貫通"][player.getDynamicProperty("tnt")]}§r\n` +
          `§l§dアイテム§r\n` +
          `${player.hasTag("kick") ? "§f" : "§8"}§lキック§r\n` +
          `${player.hasTag("punch") ? "§f" : "§8"}§lパンチ§r\n`
        )
      }
    }

    //アイテム取得
    let item = player.dimension.getEntities({location:{x:Math.floor(player.location.x), y:Math.floor(player.location.y), z:Math.floor(player.location.z)}, volume:{x:0, y:0, z:0}, type: "altivelis:marker"});
    if(item.length > 0) {
      /**
       * @type {roleList}
       */
      let role = roleList[player.getDynamicProperty("role")];
      item.forEach(entity => {
        let processed = false;
        switch(entity.getTags()[0]){
          case "bomb":
            if(lib.getScore(player, "bomb") < role.bomb.max) {
              lib.addScore(player, "bomb", 1);
            }
            processed = true;
            break;
          case "power":
            if(lib.getScore(player, "power") < role.power.max) {
              lib.addScore(player, "power", 1);
            }
            processed = true;
            break;
          case "speed":
            if(lib.getScore(player, "speed") < role.speed.max) {
              lib.addScore(player, "speed", 1);
            }
            processed = true;
            break;
          case "blue_tnt":
            if(role.blue.able) player.setDynamicProperty("tnt", 1);
            processed = true;
            break;
          case "kick":
            if(role.kick.able) player.addTag("kick");
            processed = true;
            break;
          case "punch":
            if(role.punch.able && !player.hasTag("punch")) {
              player.addTag("punch");
              let item = new mc.ItemStack("altivelis:punch", 1);
              item.lockMode = mc.ItemLockMode.inventory;
              player.getComponent(mc.EntityInventoryComponent.componentId).container.addItem(item);
            }
            processed = true;
            break;
          case "full_fire":
            lib.setScore(player, "power", role.power.max);
            processed = true;
            break;
          case "slowness":
            if(lib.getScore(player, "speed") > role.speed.init) {
              lib.addScore(player, "speed", -1);
            }
            processed = true;
            break;
        }
        if(processed) {
          player.playSound("random.orb", {location: player.location, volume: 10});
          entity.remove();
        } else {
          //特殊アイテム処理
          getSpiderWeb(player, entity);
        }
      })
    }
  })

  //パーティクル
  mc.world.getDimension("overworld").getEntities({type: "altivelis:marker"}).forEach(marker=>{
    switch(marker.getTags()[0]){
      case "bomb":
        marker.dimension.spawnParticle("altivelis:tnt_particle", {...marker.location, y: marker.location.y+0.5});
        break;
      case "power":
        marker.dimension.spawnParticle("altivelis:power_particle", {...marker.location, y: marker.location.y+0.5});
        break;
      case "speed":
        marker.dimension.spawnParticle("altivelis:speed_particle", {...marker.location, y: marker.location.y+0.5});
        break;
      case "blue_tnt":
        marker.dimension.spawnParticle("altivelis:bluetnt_particle", {...marker.location, y: marker.location.y+0.5});
        break;
      case "kick":
        marker.dimension.spawnParticle("altivelis:kick_particle", {...marker.location, y: marker.location.y+0.5});
        break;
      case "punch":
        marker.dimension.spawnParticle("altivelis:punch_particle", {...marker.location, y: marker.location.y+0.5});
        break;
      case "shot":
        marker.dimension.spawnParticle("altivelis:shot_particle", {...marker.location, y: marker.location.y+0.5});
        break;
      case "full_fire":
        marker.dimension.spawnParticle("altivelis:full_fire_particle", {...marker.location, y: marker.location.y+0.5});
        break;
      case "slowness":
        marker.dimension.spawnParticle("altivelis:slowness_particle", {...marker.location, y: marker.location.y+0.5});
        break;
      case "spider_web":
        marker.dimension.spawnParticle("altivelis:spider_web_particle", {...marker.location, y: marker.location.y+0.5});
        break;
    }
    if(through_block.includes(mc.world.getDimension("overworld").getBlock({...marker.location, y: marker.location.y-1}).typeId)){
      marker.teleport({...marker.location, y: marker.location.y-1});
    }
  })
  if(mc.world.getDynamicProperty("status") == 1) {
    mc.world.getPlayers({tags:["player"]}).forEach(player=>{
      let role = roleList[player.getDynamicProperty("role")];
      player.dimension.spawnParticle(role.particle, {...player.location, y: player.location.y+2});
      player.spawnParticle("altivelis:player_sign", {...player.location, y: player.location.y+2.1, z: player.location.z+1});
    })
  }

  //TNT移動
  mc.world.getDimension("overworld").getEntities({type: "altivelis:tnt"}).filter(e=>{return e.getDynamicProperty("kickOwnerId") != undefined}).forEach(tnt=>{
    let owner = mc.world.getPlayers().filter(e=>{return e.id == tnt.getDynamicProperty("kickOwnerId")})[0];
    let dir = tnt.getDynamicProperty("direction");
    if(
      (owner.inputInfo.getButtonState(mc.InputButton.Sneak) == mc.ButtonState.Pressed) ||
      (!lib.tryTeleport(tnt.dimension, {...tnt.location, x:tnt.location.x+(dir==1?-1:dir==3?1:0), z:tnt.location.z+(dir==0?1:dir==2?-1:0)})) ||
      (players.filter(e=>{return lib.compLocation(e.location, {...tnt.location, x:tnt.location.x+(dir==1?-1:dir==3?1:0), z:tnt.location.z+(dir==0?1:dir==2?-1:0)})}).length > 0) ||
      (tnt.dimension.getBlock(tnt.location).below().typeId == "minecraft:air")
    ) {
      tnt.teleport({x:Math.floor(tnt.location.x)+0.5, y:Math.floor(tnt.location.y), z:Math.floor(tnt.location.z)+0.5});
      tnt.clearVelocity();
      tnt.setDynamicProperty("kickOwnerId");
      return;
    }
    let speed = 0.4;
    tnt.clearVelocity();
    switch(tnt.getDynamicProperty("direction")){
      case 0:
        // tnt.applyImpulse({x:0, y:0, z:speed});
        tnt.teleport({...tnt.location, z:tnt.location.z+speed});
        break;
      case 1:
        // tnt.applyImpulse({x:-speed, y:0, z:0});
        tnt.teleport({...tnt.location, x:tnt.location.x-speed});
        break;
      case 2:
        // tnt.applyImpulse({x:0, y:0, z:-speed});
        tnt.teleport({...tnt.location, z:tnt.location.z-speed});
        break;
      case 3:
        // tnt.applyImpulse({x:speed, y:0, z:0});
        tnt.teleport({...tnt.location, x:tnt.location.x+speed});
        break;
    }
  })
  //TNTがプレイヤーやTNTの上にある場合
  mc.world.getDimension("overworld").getEntities({type: "altivelis:tnt", excludeTags:["moved"]}).filter(e=>{
    return e.dimension.getBlock(e.location).below().typeId=="minecraft:air"
  }).forEach(tnt=>{
    let players = mc.world.getPlayers().filter(e=>{return lib.compLocation({...tnt.location, y:tnt.location.y-1}, e.location)});
    if(players.length > 0) {
      players.forEach(player=>{
        if(!player.hasTag("dead")) {
          player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.LateralMovement, false);
          player.dimension.spawnParticle("minecraft:bleach", {...player.location, y: player.location.y+2});
          lib.myTimeout(20, ()=>{
            player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.LateralMovement, true);
          })
        }
      })
    }
    let belowEntity = tnt.dimension.getEntities({excludeTypes:["minecraft:player","altivelis:marker"]}).filter(e=>{return lib.compLocation({...tnt.location, y:tnt.location.y-1}, e.location)});
    if(players.length > 0 || belowEntity.length > 0) {
      let particleColor = new mc.MolangVariableMap();
      particleColor.setColorRGB("variable.color", {red: 1, green: 0, blue: 0});
      tnt.dimension.spawnParticle("tntr:explosion", tnt.location, particleColor);
      switch(tnt.getDynamicProperty("direction")){
        case 0:
          tnt.teleport({...tnt.location, z:tnt.location.z+1});
          break;
        case 1:
          tnt.teleport({...tnt.location, x:tnt.location.x-1});
          break;
        case 2:
          tnt.teleport({...tnt.location, z:tnt.location.z-1});
          break;
        case 3:
          tnt.teleport({...tnt.location, x:tnt.location.x+1});
          break;
        default:
          switch(Math.floor(Math.random() * 4)){
            case 0:
              tnt.teleport({...tnt.location, z:tnt.location.z+1});
              tnt.setDynamicProperty("direction", 0);
              break;
            case 1:
              tnt.teleport({...tnt.location, x:tnt.location.x-1});
              tnt.setDynamicProperty("direction", 1);
              break;
            case 2:
              tnt.teleport({...tnt.location, z:tnt.location.z-1});
              tnt.setDynamicProperty("direction", 2);
              break;
            case 3:
              tnt.teleport({...tnt.location, x:tnt.location.x+1});
              tnt.setDynamicProperty("direction", 3);
              break;
          }
      }
      tnt.dimension.playSound("random.pop2", tnt.location, {volume: 10});
      tnt.addTag("moved");
      lib.myTimeout(4, ()=>{
        tnt.removeTag("moved");
      })
    }
  })
  mc.world.getDimension("overworld").getEntities({type: "altivelis:tnt"}).filter(e=>{return e.dimension.getBlock(e.location).below().typeId == "minecraft:barrier"}).forEach(tnt=>{
    tnt.teleport({...tnt.location, y: tnt.location.y-0.5});
  })

  //ゲーム中のループ処理
  if(mc.world.getDynamicProperty("status") == 2) {
    //タイマー
    tick++;
    if(tick % 20 == 0) {
      tick = 0;
      let time = lib.getScore("残り時間", "display") - 1;
      lib.setScore("残り時間", "display", time);
      if(time <= 0) {
        endGame();
      }
      if(time <= 10) {
        mc.world.getPlayers().forEach(player=>{
          player.playSound("random.click", {location: player.location, volume: 10});
        })
      }
      if(time == 60) {
        mc.world.sendMessage("§c金床が降り始めます");
        mc.world.getPlayers().forEach(player=>{
          player.onScreenDisplay.setTitle("§c残り1分", {fadeInDuration: 0, stayDuration: 20, fadeOutDuration: 10});
          if(player.hasTag("dead")) {
            player.teleport(lobby);
            player.getComponent(mc.EntityInventoryComponent.componentId).container.clearAll();
            player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.LateralMovement, false);
          }
        })
      }
    }
    pressureTick++;
    //プレッシャーブロック
    if(lib.getScore("残り時間", "display") <= 55 && pressureTick % pressure_rate == 0) {
      pressureTick = 0;
      if(pressure_location.length > 0) {
        let pos = pressure_location.shift();
        let pressure_block = mc.world.getDimension("overworld").spawnEntity("altivelis:pressure_block", {x: pos.x+0.5, y: pos.y+5, z: pos.z+0.5});
        pressure_block.dimension.playSound("random.pop2", pressure_block.location, {volume: 10});
      }
    }
    mc.world.getDimension("overworld").getEntities({type: "altivelis:pressure_block"}).forEach(entity=>{
      let overlap = entity.dimension.getEntities({excludeTypes:["altivelis:pressure_block"]}).filter(e=>{return lib.compLocation(e.location, entity.location)});
      if(overlap.length > 0) {
        overlap.forEach(e=>{
          if(e.hasTag("player") && !e.hasTag("dead")) {
            lib.dropPlayer(e, "金床に潰された", "random.anvil_land");
          }
        })
      }
    })
    //ミソボン
    mc.world.getPlayers({tags:["player", "dead"], excludeTags:["spectator"]}).forEach(player=>{
      if(player.location.z > stage[stageIndex].area.end.z+1 || (player.location.z < stage[stageIndex].area.start.z && player.location.x > stage[stageIndex].area.start.x-0.2 && player.location.x < stage[stageIndex].area.end.x+1.2)) {
        if(player.inputPermissions.isPermissionCategoryEnabled(mc.InputPermissionCategory.MoveForward)) {
          player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveForward, false);
        }
      }else{
        if(!player.inputPermissions.isPermissionCategoryEnabled(mc.InputPermissionCategory.MoveForward)) {
          player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveForward, true);
        }
      }
      if(player.location.z < stage[stageIndex].area.start.z-0.2 || (player.location.z > stage[stageIndex].area.end.z+1 && player.location.x > stage[stageIndex].area.start.x-0.2 && player.location.x < stage[stageIndex].area.end.x+1.2)) {
        if(player.inputPermissions.isPermissionCategoryEnabled(mc.InputPermissionCategory.MoveBackward)) {
          player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveBackward, false);
        }
      }else{
        if(!player.inputPermissions.isPermissionCategoryEnabled(mc.InputPermissionCategory.MoveBackward)) {
          player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveBackward, true);
        }
      }
      if(player.location.x > stage[stageIndex].area.end.x+1.2 || (player.location.x < stage[stageIndex].area.start.x && player.location.z > stage[stageIndex].area.start.z && player.location.z < stage[stageIndex].area.end.z+1)) {
        if(player.inputPermissions.isPermissionCategoryEnabled(mc.InputPermissionCategory.MoveLeft)) {
          player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveLeft, false);
        }
      }else{
        if(!player.inputPermissions.isPermissionCategoryEnabled(mc.InputPermissionCategory.MoveLeft)) {
          player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveLeft, true);
        }
      }
      if(player.location.x < stage[stageIndex].area.start.x-0.2 || (player.location.x > stage[stageIndex].area.end.x+1 && player.location.z > stage[stageIndex].area.start.z && player.location.z < stage[stageIndex].area.end.z+1)) {
        if(player.inputPermissions.isPermissionCategoryEnabled(mc.InputPermissionCategory.MoveRight)) {
          player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveRight, false);
        }
      }else{
        if(!player.inputPermissions.isPermissionCategoryEnabled(mc.InputPermissionCategory.MoveRight)) {
          player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveRight, true);
        }
      }

      //ステージ内に入った場合
      if(lib.getScore("残り時間", "display") > 60 && new mc.BlockVolume(stage[stageIndex].area.start, stage[stageIndex].area.end).isInside(player.location)) {
        let north = stage[stageIndex].area.end.z+1 - player.location.z;
        let south = player.location.z - stage[stageIndex].area.start.z;
        let east = player.location.x - stage[stageIndex].area.start.x;
        let west = stage[stageIndex].area.end.x+1 - player.location.x;
        let list = [];
        if(north > 0) list.push({direction: 0, distance: north});
        if(south > 0) list.push({direction: 2, distance: south});
        if(east > 0) list.push({direction: 1, distance: east});
        if(west > 0) list.push({direction: 3, distance: west});
        let min = {direction: null, distance: Infinity};
        list.forEach(e=>{
          if(e.distance < min.distance) {
            min = e;
          }
        })
        if(min.direction != null) {
          switch(min.direction) {
            case 0:
              player.teleport({...player.location, y: player.location.y+0.5, z: stage[stageIndex].area.end.z+1.5});
              break;
            case 1:
              player.teleport({...player.location, y: player.location.y+0.5, x: stage[stageIndex].area.start.x-0.5});
              break;
            case 2:
              player.teleport({...player.location, y: player.location.y+0.5, z: stage[stageIndex].area.start.z-0.5});
              break;
            case 3:
              player.teleport({...player.location, y: player.location.y+0.5, x: stage[stageIndex].area.end.x+1.5});
              break;
          }
        }
      }
    })

    //ステージ外のTNT
    let particleColor = new mc.MolangVariableMap();
    particleColor.setColorRGB("variable.color", {red: 1, green: 0, blue: 0});
    mc.world.getDimension("overworld").getEntities({type:"altivelis:tnt"}).forEach(tnt=>{
      if(tnt.location.x < stage[stageIndex].area.start.x) {
        tnt.teleport({...tnt.location, x: stage[stageIndex].area.end.x+0.5});
        tnt.dimension.spawnParticle("tntr:explosion", {...tnt.location, x:tnt.location.x-1}, particleColor);
        tnt.setDynamicProperty("direction", 1);
      }
      if(tnt.location.x > stage[stageIndex].area.end.x+1) {
        tnt.teleport({...tnt.location, x: stage[stageIndex].area.start.x+0.5});
        tnt.dimension.spawnParticle("tntr:explosion", {...tnt.location, x:tnt.location.x+1}, particleColor);
        tnt.setDynamicProperty("direction", 3);
      }
      if(tnt.location.z < stage[stageIndex].area.start.z) {
        tnt.teleport({...tnt.location, z: stage[stageIndex].area.end.z+0.5});
        tnt.dimension.spawnParticle("tntr:explosion", {...tnt.location, z:tnt.location.z-1}, particleColor);
        tnt.setDynamicProperty("direction", 2);
      }
      if(tnt.location.z > stage[stageIndex].area.end.z+1) {
        tnt.teleport({...tnt.location, z: stage[stageIndex].area.start.z+0.5});
        tnt.dimension.spawnParticle("tntr:explosion", {...tnt.location, z:tnt.location.z+1}, particleColor);
        tnt.setDynamicProperty("direction", 0);
      }
    })

    //ステージ外のプレイヤー
    mc.world.getPlayers({tags:["player"], excludeTags:["dead", "spectator"]}).forEach(player=>{
      if(player.location.x < stage[stageIndex].area.start.x) {
        player.teleport({...player.location, x: stage[stageIndex].area.start.x+0.5});
      }
      if(player.location.x > stage[stageIndex].area.end.x+1) {
        player.teleport({...player.location, x: stage[stageIndex].area.end.x+0.5});
      }
      if(player.location.z < stage[stageIndex].area.start.z) {
        player.teleport({...player.location, z: stage[stageIndex].area.start.z+0.5});
      }
      if(player.location.z > stage[stageIndex].area.end.z+1) {
        player.teleport({...player.location, z: stage[stageIndex].area.end.z+0.5});
      }
      //もし足元がバリアブロックなら、脱落する
      if(mc.world.getDimension("overworld").getBlock(player.location).below().typeId == "minecraft:barrier") {
        lib.dropPlayer(player, "エリア外に落ちた！");
      }
      //もし足元が通過可能ブロックであれば、下にテレポートする
      if(through_block.includes(player.dimension.getBlock(player.location).below().typeId)) {
        player.teleport({...player.location, y: player.location.y-0.5});
      }
    })
  }
})

/**
 * ゲーム開始処理
 * 参加者の初期化・ステージ準備・カウントダウン・ゲーム状態遷移を行います。
 */
export function startGame(){
  if(mc.world.getDynamicProperty("status") != 0) return;
  // ゲームを開始する
  /** @type {Number} */
  let index = mc.world.getDynamicProperty("stage");
  let member = mc.world.getPlayers({excludeTags:["spectator"]});
  initialPlayerCount = member.length; // 参加人数を保存
  let tpmember = member.concat();
  if(tpmember.length > stage[index].spawn.length) {
    mc.world.sendMessage(`§cプレイヤーが多すぎます。このステージは最大${stage[index].spawn.length}人まで参加できます。`);
    return;
  }
  tpmember.length = stage[index].spawn.length;
  //ランダムに並び替え
  for (let i = tpmember.length - 1; i >= 0; i--) {
    let rand = Math.floor(Math.random() * (i + 1));
    // 配列の要素の順番を入れ替える
    let tmpStorage = tpmember[i];
    tpmember[i] = tpmember[rand];
    tpmember[rand] = tmpStorage;
  }
  lib.setField(mc.world.getDimension("overworld"), stage[index]);
  let maxLocation = stage[index].area.end;
  let minLocation = stage[index].area.start;
  pressure_location = lib.spiralOrderCoordinates({...maxLocation, x:maxLocation.x+1, z:maxLocation.z+1}, {...minLocation, x:minLocation.x-1, z:minLocation.z-1});
  pressure_rate = Math.ceil(55*20 / pressure_location.length);
  mc.world.setDynamicProperty("status", 1);
  mc.world.sendMessage(`ゲームを開始します`);
  mc.world.sendMessage(`ステージ: ${stage[index].name}`);
  mc.world.getPlayers().forEach(player=>{
    player.setGameMode(mc.GameMode.adventure);
    player.camera.fade({fadeColor: {red:0, green:0, blue:0}, fadeTime:{fadeInTime: 1, fadeOutTime: 1, holdTime: 0}});
  })
  mc.world.getDimension("overworld").getEntities({type: "altivelis:marker"}).forEach(entity=>{
    entity.remove();
  })
  mc.world.getDimension("overworld").getEntities({type: "altivelis:pressure_block"}).forEach(entity=>{
    entity.remove();
  })
  mc.world.getPlayers().forEach(player=>{
    // player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Camera, false);
    player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Jump, false);
    player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Sneak, false);
    player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.LateralMovement, false);
  })
  lib.setScore("残り時間", "display", mc.world.getDynamicProperty("time"));
  tick = 0;
  lib.myTimeout(20, ()=>{
    //プレイヤーをテレポート
    for(let i=0; i<tpmember.length; i++){
      if(tpmember[i] != undefined) {
        let pos = stage[index].spawn[i];
        tpmember[i].teleport({x:pos.x+0.5, y:pos.y, z:pos.z+0.5}, {rotation:{x:0, y:0}});
      }
    }
    //プレイヤー初期化
    member.forEach(player=>{
      // 「全員スティーブ」設定がONならroleを強制的に0にする
      if (mc.world.getDynamicProperty("allSteve") === true) {
        player.setDynamicProperty("role", 0);
      }
      //初期化
      player.addTag("player");
      player.removeTag("kick");
      player.removeTag("punch");
      player.removeTag("tp");
      player.removeTag("revival")
      player.removeTag("spider_web");
      player.getComponent(mc.EntityInventoryComponent.componentId).container.clearAll();
      //初期ステータス適用
      lib.initPlayer(player);
    })
    mc.world.getPlayers().forEach(player=>{
      let center = lib.getCenter(stage[index].area);
      //player.camera.setCamera("minecraft:free", {location: {...center, y:center.y+12, z:center.z-3}, facingLocation: center});
      player.runCommand(`camera @s set minecraft:free pos ${center.x} ${center.y+12} ${center.z-3} facing ${center.x} ${center.y} ${center.z}`);
      player.runCommand("controlscheme @s set camera_relative");
      player.onScreenDisplay.setHudVisibility(mc.HudVisibility.Hide, [mc.HudElement.Health, mc.HudElement.Hunger, mc.HudElement.ProgressBar]);
    })
    lib.myTimeout(1, ()=>{
      mc.world.playMusic("record.precipice", {fade: 1, loop: true, volume: 0.5});
    })

    lib.myTimeout(20, ()=>{
      lib.myTimeout(20, ()=>{
        mc.world.getPlayers().forEach(player=>{
          player.onScreenDisplay.setTitle("§a3", {fadeInDuration: 0, stayDuration: 20, fadeOutDuration: 0});
          player.playSound("random.click", {location: player.location, volume: 10});
        })
        lib.myTimeout(20, ()=>{
          mc.world.getPlayers().forEach(player=>{
            player.onScreenDisplay.setTitle("§a2", {fadeInDuration: 0, stayDuration: 20, fadeOutDuration: 0});
            player.playSound("random.click", {location: player.location, volume: 10});
          })
          lib.myTimeout(20, ()=>{
            mc.world.getPlayers().forEach(player=>{
              player.onScreenDisplay.setTitle("§a1", {fadeInDuration: 0, stayDuration: 20, fadeOutDuration: 0});
              player.playSound("random.click", {location: player.location, volume: 10});
            })
            lib.myTimeout(20, ()=>{
              mc.world.setDynamicProperty("status", 2);
              mc.world.getPlayers().forEach(player=>{
                player.onScreenDisplay.setTitle("§bGO!", {fadeInDuration: 0, stayDuration: 20, fadeOutDuration: 0});
                player.playSound("mob.wither.spawn", {location: player.location, volume: 10});
              })
              member.forEach(player=>{
                if(!player.isValid) return;
                player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.LateralMovement, true);
              })
            })
          })
        })
      })
    })
  })
}

/**
 * ゲーム終了処理
 * 勝者判定・リセット・演出・状態初期化を行います。
 */
function endGame(){
  mc.world.setDynamicProperty("status", 3);
  let winner = mc.world.getPlayers({tags:["player"], excludeTags:["dead", "spectator"]});
  if(winner.length == 1) {
    winner[0].runCommand("controlscheme @a clear");
    lib.myTimeout(1, ()=>{
      winner[0].teleport(winner[0].location, {facingLocation: {...winner[0].location, y: winner[0].location.y+5, z: winner[0].location.z-2}});
    })
    winner[0].dimension.playSound("random.totem", winner[0].location, {volume: 10});
    mc.world.sendMessage(`${winner[0].nameTag.replace("\n", "")}の勝利!`);
    mc.world.getPlayers().forEach(player=>{
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.LateralMovement, false);
      lib.myTimeout(1, ()=>{
        player.camera.setCamera("minecraft:free", {location: {...winner[0].location, y:winner[0].location.y+5, z:winner[0].location.z-1}, facingLocation: winner[0].location, easeOptions: {easeTime:1, easeType: mc.EasingType.OutCirc}});
      })
      player.onScreenDisplay.setTitle("§bWINNER", {fadeInDuration: 0, stayDuration: 50, fadeOutDuration: 10});
      player.onScreenDisplay.updateSubtitle(winner[0].nameTag)
    })    
  }else{
    mc.world.sendMessage(`§l§7引き分け!`);
    mc.world.getPlayers().forEach(player=>{
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.LateralMovement, false);
      player.onScreenDisplay.setTitle("§7DRAW", {fadeInDuration: 0, stayDuration: 50, fadeOutDuration: 10});
    })
  }
  lib.myTimeout(60, ()=>{
    mc.world.getPlayers().forEach(player=>{
      player.removeTag("player");
      player.removeTag("dead");
      player.removeTag("kick");
      player.removeTag("punch");
      player.removeTag("tp");
      player.removeTag("revival");
      player.removeTag("spider_web");
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Camera, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Jump, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Sneak, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.LateralMovement, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveForward, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveBackward, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveLeft, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveRight, true);
      player.getComponent(mc.EntityInventoryComponent.componentId).container.clearAll();
      player.camera.clear();
      player.teleport(lobby, {rotation: {x:0, y:0}});
      player.onScreenDisplay.setHudVisibility(mc.HudVisibility.Reset, [mc.HudElement.Health, mc.HudElement.Hunger, mc.HudElement.ProgressBar]);
      let moveComp = player.getComponent(mc.EntityMovementComponent.componentId);
      moveComp.resetToDefaultValue();
    })
    mc.world.stopMusic();
    mc.world.getDimension("overworld").getEntities({type: "altivelis:marker"}).forEach(entity=>{
      entity.remove();
    })
    mc.world.getDimension("overworld").getEntities({type: "altivelis:pressure_block"}).forEach(entity=>{
      entity.remove();
    })
    /** @type {Number} */
    let stageIndex = mc.world.getDynamicProperty("stage");
    lib.clearField(mc.world.getDimension("overworld"), stage[stageIndex].area.start, stage[stageIndex].area.end);
    mc.world.setDynamicProperty("status", 0);
  })
}


//爆発処理
mc.world.beforeEvents.explosion.subscribe(data=>{
  data.cancel = true;
  let pos = data.source.location;
  let owner = data.source?.owner;
  let power = data.source.getDynamicProperty("power");
  let blue = data.source.hasTag("blue");
  let revival = data.source.hasTag("revival");
  mc.system.run(()=>{
    data.dimension.playSound("random.explode", pos, {volume: 4});
    if(power >= 8) {
      mc.world.getDimension("overworld").runCommand(`camerashake add @a 0.3 0.2 positional`);
    }
    // x+
    lib.explode_particle(data.dimension, pos, owner, revival);
    for(let i=1; i<=power; i++){
      let block = data.dimension.getBlock({...pos, x: pos.x+i});
      if(block.below().typeId == "minecraft:air") break;
      if(through_block.includes(block.typeId) && data.dimension.getEntities({excludeTypes:["minecraft:player"], excludeTags:["spider_web"]}).filter(e=>{return lib.compLocation(e.location, {...pos, x:pos.x+i})}).length == 0){
        lib.explode_particle(data.dimension, {...pos, x: pos.x+i}, owner, revival);
      }
      else{
        if(blue && (breakable_block.includes(block.typeId) || through_block.includes(block.typeId))){
          lib.explode_block(data.dimension, {...pos, x: pos.x+i}, owner, revival);
        }else{
          lib.explode_block(data.dimension, {...pos, x: pos.x+i}, owner, revival);
          break;
        }
      }
    }
    // x-
    for(let i=1; i<=power; i++){
      let block = data.dimension.getBlock({...pos, x: pos.x-i});
      if(block.below().typeId == "minecraft:air") break;
      if(through_block.includes(block.typeId) && data.dimension.getEntities({excludeTypes:["minecraft:player"], excludeTags:["spider_web"]}).filter(e=>{return lib.compLocation(e.location, {...pos, x:pos.x-i})}).length == 0){
        lib.explode_particle(data.dimension, {...pos, x: pos.x-i}, owner, revival);
      }
      else{
        if(blue && (breakable_block.includes(block.typeId) || through_block.includes(block.typeId))){
          lib.explode_block(data.dimension, {...pos, x: pos.x-i}, owner, revival);
        }else{
          lib.explode_block(data.dimension, {...pos, x: pos.x-i}, owner, revival);
          break;
        }
      }
    }
    // z+
    for(let i=1; i<=power; i++){
      let block = data.dimension.getBlock({...pos, z: pos.z+i});
      if(block.below().typeId == "minecraft:air") break;
      if(through_block.includes(block.typeId) && data.dimension.getEntities({excludeTypes:["minecraft:player"], excludeTags:["spider_web"]}).filter(e=>{return lib.compLocation(e.location, {...pos, z:pos.z+i})}).length == 0){
        lib.explode_particle(data.dimension, {...pos, z: pos.z+i}, owner, revival);
      }
      else{
        if(blue && (breakable_block.includes(block.typeId) || through_block.includes(block.typeId))){
          lib.explode_block(data.dimension, {...pos, z: pos.z+i}, owner, revival);
        }else{
          lib.explode_block(data.dimension, {...pos, z: pos.z+i}, owner, revival);
          break;
        }
      }
    }
    // z-
    for(let i=1; i<=power; i++){
      let block = data.dimension.getBlock({...pos, z: pos.z-i});
      if(block.below().typeId == "minecraft:air") break;
      if(through_block.includes(block.typeId) && data.dimension.getEntities({excludeTypes:["minecraft:player"], excludeTags:["spider_web"]}).filter(e=>{return lib.compLocation(e.location, {...pos, z:pos.z-i})}).length == 0){
        lib.explode_particle(data.dimension, {...pos, z: pos.z-i}, owner, revival);
      }
      else{
        if(blue && (breakable_block.includes(block.typeId) || through_block.includes(block.typeId))){
          lib.explode_block(data.dimension, {...pos, z: pos.z-i}, owner, revival);
        }else{
          lib.explode_block(data.dimension, {...pos, z: pos.z-i}, owner, revival);
          break;
        }
      }
    }
    // y-
    for(let i=1; i<=power; i++){
      let block = data.dimension.getBlock({...pos, y: pos.y-i});
      if(block.below().typeId == "minecraft:air") break;
      if(through_block.includes(block.typeId) && data.dimension.getEntities({excludeTypes:["minecraft:player"], excludeTags:["spider_web"]}).filter(e=>{return lib.compLocation(e.location, {...pos, y:pos.y-i})}).length == 0){
        lib.explode_particle(data.dimension, {...pos, y: pos.y-i}, owner, revival);
      }
      else{
        lib.explode_block(data.dimension, {...pos, y: pos.y-i}, owner, revival);
        break;
      }
    }
  })
})

//テスト用tnt設置処理
mc.world.afterEvents.itemUse.subscribe(data=>{
  let {source, itemStack} = data;
  if(itemStack.typeId != "minecraft:tnt") return;
  if(source.dimension.getEntities({type:"altivelis:tnt"}).filter(e=>{return e?.owner.id == source.id}).length >= lib.getScore(source, "bomb")) return;
  if(source.dimension.getEntities({location: source.location, maxDistance:0.5, type:"altivelis:tnt"}).length > 0) return;
  let pos = source.location;
  // mc.world.sendMessage(`x: ${Math.floor(pos.x)}, y: ${Math.floor(pos.y)}, z: ${Math.floor(pos.z)}`);
  let tnt = source.dimension.spawnEntity("altivelis:tnt", {x: Math.floor(pos.x)+0.5, y: Math.floor(pos.y), z: Math.floor(pos.z)+0.5});
  if(source.getDynamicProperty("tnt") == 1) {
    tnt.triggerEvent("blue");
    tnt.addTag("blue");
  }
  tnt.owner = source;
  tnt.setDynamicProperty("power", lib.getScore(source, "power"));
})

//ボタン入力処理
mc.world.afterEvents.playerButtonInput.subscribe(data=>{
  if(mc.world.getDynamicProperty("status") != 2) return;
  let player = data.player;
  if(player.hasTag("dead")) return;
  if(player.dimension.getEntities({type:"altivelis:tnt"}).filter(e=>{return e?.owner.id == player.id}).length >= lib.getScore(player, "bomb")) return;
  if(player.dimension.getEntities({location: player.location, maxDistance:0.5, type:"altivelis:tnt"}).length > 0) return;
  let pos = player.location;
  let tnt = player.dimension.spawnEntity("altivelis:tnt", {x: Math.floor(pos.x)+0.5, y: Math.floor(pos.y), z: Math.floor(pos.z)+0.5});
  if(player.getDynamicProperty("tnt") == 1) {
    tnt.triggerEvent("blue");
    tnt.addTag("blue");
  }
  tnt.owner = player;
  tnt.setDynamicProperty("power", lib.getScore(player, "power"));
  tnt.dimension.playSound("fire.ignite", tnt.location, {volume: 10});
}, {buttons: [mc.InputButton.Jump], state: mc.ButtonState.Pressed})

//ワールド参加時処理
mc.world.afterEvents.playerSpawn.subscribe(data=>{
  if(!data.initialSpawn) return;
  if(mc.world.getPlayers().length == 1) {
    // 初期スポーン時にプレイヤーが1人だけならホストとして扱う
    data.player.addTag("host");
  }
  if(data.player.hasTag("player")) data.player.removeTag("player");
  if(data.player.hasTag("dead")) data.player.removeTag("dead");
  if(data.player.hasTag("kick")) data.player.removeTag("kick");
  if(data.player.hasTag("punch")) data.player.removeTag("punch");
  if(data.player.hasTag("tp")) data.player.removeTag("tp");
  if(data.player.hasTag("revival")) data.player.removeTag("revival");
  data.player.teleport(lobby, {rotation: {x:0, y:0}});
  /** @type {Number} */
  let index = mc.world.getDynamicProperty("stage");
  if(mc.world.getDynamicProperty("status") > 0) {
    data.player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Jump, false);
    data.player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Sneak, false);
    data.player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.LateralMovement, false);
    let center = lib.getCenter(stage[index].area);
    data.player.camera.setCamera("minecraft:free", {location: {...center, y:center.y+12, z:center.z-3}, facingLocation: center});
    data.player.onScreenDisplay.setHudVisibility(mc.HudVisibility.Hide, [mc.HudElement.Health, mc.HudElement.Hunger, mc.HudElement.ProgressBar]);
  }
})
