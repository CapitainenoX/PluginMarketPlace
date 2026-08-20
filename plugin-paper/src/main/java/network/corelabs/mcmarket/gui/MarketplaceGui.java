package network.corelabs.mcmarket.gui;

import org.bukkit.entity.Player;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.InventoryHolder;

/** Common contract for every inventory-based marketplace screen. */
public interface MarketplaceGui extends InventoryHolder {

    @Override
    Inventory getInventory();

    /** Called by GuiListener for clicks inside this GUI's own inventory. The click is already cancelled. */
    void onClick(Player player, InventoryClickEvent event);

    /** Opens this GUI for the given player. */
    default void open(Player player) {
        player.openInventory(getInventory());
    }
}
