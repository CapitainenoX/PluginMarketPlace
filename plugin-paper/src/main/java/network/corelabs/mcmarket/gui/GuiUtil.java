package network.corelabs.mcmarket.gui;

import org.bukkit.Material;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.ItemStack;

import java.util.List;

/** Small shared helpers so every marketplace menu looks and behaves consistently. */
final class GuiUtil {

    private GuiUtil() {
    }

    /** Fills every still-empty slot with a neutral pane so fixed-size menus never look like unfinished storage. */
    static void fillEmpty(Inventory inventory) {
        ItemStack filler = MainMenuGui.icon(Material.BLACK_STAINED_GLASS_PANE, " ", List.of());
        for (int i = 0; i < inventory.getSize(); i++) {
            if (inventory.getItem(i) == null) {
                inventory.setItem(i, filler);
            }
        }
    }
}
