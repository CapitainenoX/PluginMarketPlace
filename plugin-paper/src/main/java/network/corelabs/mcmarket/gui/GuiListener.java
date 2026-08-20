package network.corelabs.mcmarket.gui;

import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.event.inventory.PrepareAnvilEvent;
import org.bukkit.inventory.InventoryHolder;

/** Routes clicks for every marketplace inventory to its owning GUI object. */
public class GuiListener implements Listener {

    @EventHandler
    public void onClick(InventoryClickEvent event) {
        InventoryHolder holder = event.getView().getTopInventory().getHolder();
        if (!(holder instanceof MarketplaceGui gui)) {
            return;
        }
        // These are menu/browser screens, not storage - never let items move.
        event.setCancelled(true);
        if (!(event.getWhoClicked() instanceof Player player)) {
            return;
        }
        gui.onClick(player, event);
    }

    @EventHandler
    public void onPrepareAnvil(PrepareAnvilEvent event) {
        if (event.getInventory().getHolder() instanceof SearchGui) {
            // Free-text search box: renaming the item should never cost XP levels.
            event.getInventory().setRepairCost(0);
        }
    }
}
