import * as mc from "@minecraft/server";
import { compLocation, myTimeout } from "./lib";
import * as lib from "./lib";
// mc.world.beforeEvents.itemUse.subscribe(data=>{
//   myTimeout(0, ()=>{
//     mc.world.sendMessage("test");
//   })
// })

mc.world.beforeEvents.worldInitialize.subscribe(ev=>{
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
          data.source.dimension.getEntities({type: "altivelis:tnt"}).filter(e=>compLocation(e.location, pos)).forEach(e=>{
            e.teleport({...pos, y: pos.y + 2, z: pos.z + 3});
            for(let i=1; i<=4; i++) {
              data.source.dimension.spawnParticle("tntr:explosion", {...pos, y: pos.y + i, z: pos.z + i}, knockbackColor);
            }
          })
          break;
        case 1:
          pos.x -= 1;
          data.source.dimension.getEntities({type: "altivelis:tnt"}).filter(e=>compLocation(e.location, pos)).forEach(e=>{
            e.teleport({...pos, x: pos.x - 3, y: pos.y + 2});
            for(let i=1; i<=4; i++) {
              data.source.dimension.spawnParticle("tntr:explosion", {...pos, x: pos.x - i, y: pos.y + i}, knockbackColor);
            }
          })
          break;
        case 2:
          pos.z -= 1;
          data.source.dimension.getEntities({type: "altivelis:tnt"}).filter(e=>compLocation(e.location, pos)).forEach(e=>{
            e.teleport({...pos, y: pos.y + 2, z: pos.z - 3});
            for(let i=1; i<=4; i++) {
              data.source.dimension.spawnParticle("tntr:explosion", {...pos, y: pos.y + i, z: pos.z - i}, knockbackColor);
            }
          })
          break;
        case 3:
          pos.x += 1;
          data.source.dimension.getEntities({type: "altivelis:tnt"}).filter(e=>compLocation(e.location, pos)).forEach(e=>{
            e.teleport({...pos, x: pos.x + 3, y: pos.y + 2});
            for(let i=1; i<=4; i++) {
              data.source.dimension.spawnParticle("tntr:explosion", {...pos, x: pos.x + i, y: pos.y + i}, knockbackColor);
            }
          })
          break;
      }
      data.source.dimension.spawnParticle("tntr:knockback_roar_particle", pos, particleColor);
    }
  })

  ev.itemComponentRegistry.registerCustomComponent("tntr:shot", {
    onUse: data=>{
      return;
    }
  })
})