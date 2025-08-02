/**
 * このファイルはカスタムアイテム（パンチ・ショット）の挙動を定義します。
 * プレイヤーがアイテムを使用した際の特殊効果やTNTの操作処理を担当します。
 */

import * as mc from "@minecraft/server";
import * as lib from "./lib";
import {stage} from "./const";
import { onUseSpider } from "./skills/spider";
import { onUseEnderman } from "./skills/enderman";

mc.system.beforeEvents.startup.subscribe(ev=>{
  // パンチアイテムの使用時処理
  ev.itemComponentRegistry.registerCustomComponent("tntr:punch", {
    onUse: data=>{
      data.source.startItemCooldown("punch", 4);
      if(data.source.getDynamicProperty("direction") == undefined) return;
      let particleColor = new mc.MolangVariableMap();
      let knockbackColor = new mc.MolangVariableMap();
      particleColor.setColorRGB("variable.color", {red: 1, green: 1, blue: 1});
      knockbackColor.setColorRGB("variable.color", {red: 1, green: 0, blue: 0});
      let pos = data.source.location;
      pos = {x: Math.floor(pos.x) + 0.5, y: Math.floor(pos.y) + 0.5, z: Math.floor(pos.z) + 0.5};
      switch(data.source.getDynamicProperty("direction")) {
        case 0:
          pos.z += 1;
          data.source.dimension.getEntities({type: "altivelis:tnt"}).filter(e=>lib.compLocation(e.location, pos)).forEach(e=>{
            e.teleport({...pos, y: pos.y + 2, z: pos.z + 3});
            for(let i=1; i<=4; i++) {
              data.source.dimension.spawnParticle("tntr:explosion", {...pos, y: pos.y + i, z: pos.z + i}, knockbackColor);
            }
            e.setDynamicProperty("direction", 0);
          })
          break;
        case 1:
          pos.x -= 1;
          data.source.dimension.getEntities({type: "altivelis:tnt"}).filter(e=>lib.compLocation(e.location, pos)).forEach(e=>{
            e.teleport({...pos, x: pos.x - 3, y: pos.y + 2});
            for(let i=1; i<=4; i++) {
              data.source.dimension.spawnParticle("tntr:explosion", {...pos, x: pos.x - i, y: pos.y + i}, knockbackColor);
            }
            e.setDynamicProperty("direction", 1);
          })
          break;
        case 2:
          pos.z -= 1;
          data.source.dimension.getEntities({type: "altivelis:tnt"}).filter(e=>lib.compLocation(e.location, pos)).forEach(e=>{
            e.teleport({...pos, y: pos.y + 2, z: pos.z - 3});
            for(let i=1; i<=4; i++) {
              data.source.dimension.spawnParticle("tntr:explosion", {...pos, y: pos.y + i, z: pos.z - i}, knockbackColor);
            }
            e.setDynamicProperty("direction", 2);
          })
          break;
        case 3:
          pos.x += 1;
          data.source.dimension.getEntities({type: "altivelis:tnt"}).filter(e=>lib.compLocation(e.location, pos)).forEach(e=>{
            e.teleport({...pos, x: pos.x + 3, y: pos.y + 2});
            for(let i=1; i<=4; i++) {
              data.source.dimension.spawnParticle("tntr:explosion", {...pos, x: pos.x + i, y: pos.y + i}, knockbackColor);
            }
            e.setDynamicProperty("direction", 3);
          })
          break;
      }
      data.source.dimension.spawnParticle("tntr:knockback_roar_particle", pos, particleColor);
    }
  })

  // ショットアイテムの使用時処理
  ev.itemComponentRegistry.registerCustomComponent("tntr:shot", {
    onUse: data=>{
      data.source.startItemCooldown("shot", 50);
      let knockbackColor = new mc.MolangVariableMap();
      knockbackColor.setColorRGB("variable.color", {red: 1, green: 0, blue: 0});
      let pos = data.source.location;
      pos = {x: Math.floor(pos.x) + 0.5, y: Math.floor(pos.y) + 0.5, z: Math.floor(pos.z) + 0.5};
      /**@type {Number} */
      let stageIndex = mc.world.getDynamicProperty("stage");
      /**@type {mc.Entity} */
      let tnt;
      if(data.source.location.x < stage[stageIndex].area.start.x){
        for(let i=1; i<=3; i++) {
          data.source.dimension.spawnParticle("tntr:explosion", {x:pos.x+i, y:pos.y+1, z:pos.z}, knockbackColor);
        }
        tnt = data.source.dimension.spawnEntity("altivelis:tnt", {x:pos.x+3, y:pos.y+1, z:pos.z});
        tnt.setDynamicProperty("direction", 3);
      }
      else if(data.source.location.x > stage[stageIndex].area.end.x+1){
        for(let i=1; i<=3; i++) {
          data.source.dimension.spawnParticle("tntr:explosion", {x:pos.x-i, y:pos.y+1, z:pos.z}, knockbackColor);
        }
        tnt = data.source.dimension.spawnEntity("altivelis:tnt", {x:pos.x-3, y:pos.y+1, z:pos.z});
        tnt.setDynamicProperty("direction", 1);
      }
      else if(data.source.location.z < stage[stageIndex].area.start.z){
        for(let i=1; i<=3; i++) {
          data.source.dimension.spawnParticle("tntr:explosion", {x:pos.x, y:pos.y+1, z:pos.z+i}, knockbackColor);
        }
        tnt = data.source.dimension.spawnEntity("altivelis:tnt", {x:pos.x, y:pos.y+1, z:pos.z+3});
        tnt.setDynamicProperty("direction", 0);
      }
      else if(data.source.location.z > stage[stageIndex].area.end.z+1){
        for(let i=1; i<=3; i++) {
          data.source.dimension.spawnParticle("tntr:explosion", {x:pos.x, y:pos.y+1, z:pos.z-i}, knockbackColor);
        }
        tnt = data.source.dimension.spawnEntity("altivelis:tnt", {x:pos.x, y:pos.y+1, z:pos.z-3});
        tnt.setDynamicProperty("direction", 2);
      }
      if(tnt) {
        tnt.setDynamicProperty("power", 2);
        tnt.addTag("revival");
        tnt.owner = data.source;
      }
    }
  })

  ev.itemComponentRegistry.registerCustomComponent("tntr:skill", {
    onUse: data=>{
      switch(data.itemStack.typeId) {
        case "altivelis:skill_spider":
          onUseSpider(data);
          break;
        case "altivelis:skill_enderman":
          onUseEnderman(data);
          break;
        // 他のスキルの処理をここに追加
      }
    }
  })
})