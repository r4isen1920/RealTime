
import { EntityEquippableComponent, EquipmentSlot, Player, world, system } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui"


const defaultProperties = [
   { id: 'r4isen1920_realtime:enabled', default: true },
   { id: 'r4isen1920_realtime:set_timezone', default: 'UTC+0' },
   { id: 'r4isen1920_realtime:display_time', default: false },
   { id: 'r4isen1920_realtime:time_change_easing', default: 100 },
]


function main() {
   world.getAllPlayers().forEach(player => {
      if (
         player.isSneaking &&
         (player.getComponent('minecraft:equippable') as EntityEquippableComponent)?.getEquipment(EquipmentSlot.Mainhand)?.typeId === 'minecraft:clock' &&
         player.hasTag('realtime_admin')
      ) {
         openOptionsUI(player);
      }

      defaultProperties.forEach(property => {
         if (
            world.getDynamicProperty(property.id) === undefined ||
            typeof world.getDynamicProperty(property.id) !== typeof property.default
         ) {
            world.setDynamicProperty(property.id, property.default);
         }
      });

      if (world.getDynamicProperty('r4isen1920_realtime:enabled')) syncTime()
   });
}


function openOptionsUI(player: Player) {
   const timezones: string[] = [
      'UTC-13', 'UTC-12', 'UTC-11', 'UTC-10', 'UTC-9', 'UTC-8', 'UTC-7', 'UTC-6', 'UTC-5', 'UTC-4', 'UTC-3', 'UTC-2', 'UTC-1', 'UTC+0',
      'UTC+1', 'UTC+2', 'UTC+3', 'UTC+4', 'UTC+5', 'UTC+6', 'UTC+7', 'UTC+8', 'UTC+9', 'UTC+10', 'UTC+11', 'UTC+12'
   ]

   const form = new ModalFormData()
      .title({ translate: 'gui.realtime.title' })

      .toggle({ translate: 'gui.realtime.enable' }, world.getDynamicProperty('r4isen1920_realtime:enabled') as boolean ?? true)
      .toggle({ translate: 'gui.realtime.displayTime' }, world.getDynamicProperty('r4isen1920_realtime:display_time') as boolean ?? false)
      .dropdown({ translate: 'gui.realtime.setTimezone' }, timezones, world.getDynamicProperty('r4isen1920_realtime:set_timezone') ? timezones.indexOf(world.getDynamicProperty('r4isen1920_realtime:set_timezone') as string) : 12)
      .slider({ translate: 'gui.realtime.easeTime' }, 1, 100, 1, world.getDynamicProperty('r4isen1920_realtime:time_change_easing') as number ?? 100)

   form.show(player).then(response => {
      if (!response.formValues) return;
      const [enabled, displayTime, timezone, easeFactor] = response.formValues;

      world.setDynamicProperty('r4isen1920_realtime:enabled', enabled);
      world.setDynamicProperty('r4isen1920_realtime:set_timezone', timezones[timezone as number]);
      world.setDynamicProperty('r4isen1920_realtime:display_time', displayTime);
      world.setDynamicProperty('r4isen1920_realtime:time_change_easing', easeFactor);

      player.playSound('note.pling', { pitch: 1.5 })
   });

   player.playSound('note.pling', { pitch: 0.75, volume: 0.25 })

}


function syncTime() {
   const timezone = world.getDynamicProperty('r4isen1920_realtime:set_timezone') as string;
   const offset = parseInt(timezone.replace('UTC', ''));
   const now = new Date();
   const utcHours = now.getUTCHours();
   const localHours = (utcHours + offset + 24) % 24;
   const timeConverted = Math.floor(((localHours * 1000 + now.getUTCMinutes() * 100 / 6) + 18000) % 24000);

   const currentWorldTime = world.getAbsoluteTime();
   const timeDifference = timeConverted - currentWorldTime;
   const easeFactor = Math.max(Math.abs(timeDifference) / (world.getDynamicProperty('r4isen1920_realtime:time_change_easing') as number), 1);
   const easeValue = currentWorldTime + (timeConverted - currentWorldTime) / easeFactor;

   world.getAllPlayers()[0].runCommand(`time set ${easeValue}`);

   world.getAllPlayers()[0].runCommand('gamerule doDaylightCycle false');
   world.setDynamicProperty('r4isen1920_realtime:running', true);

   if (world.getDynamicProperty('r4isen1920_realtime:display_time')) {
      world.getAllPlayers().forEach(player => {
         player.onScreenDisplay.setActionBar(`${localHours}:${now.getUTCMinutes()} §7|§r UTC${offset > 0 ? '+' : ''}${offset}`);
      });
   }
}


system.runInterval(main, 1);
