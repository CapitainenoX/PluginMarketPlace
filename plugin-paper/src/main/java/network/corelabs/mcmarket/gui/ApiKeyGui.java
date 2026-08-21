package network.corelabs.mcmarket.gui;

import network.corelabs.mcmarket.MarketplacePlugin;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.event.inventory.InventoryType;
import org.bukkit.inventory.AnvilInventory;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.ItemStack;

import java.util.List;

/**
 * In-game way to set config.yml's api-key, reusing SearchGui's anvil
 * rename-text trick so no chat listener is needed: the player renames the
 * item in slot 0 to the key and clicks slot 2 to submit it.
 */
public class ApiKeyGui implements MarketplaceGui {

    private static final String PROMPT = "Type API key...";

    private final MarketplacePlugin plugin;
    private final AnvilInventory inventory;

    public ApiKeyGui(MarketplacePlugin plugin) {
        this.plugin = plugin;
        this.inventory = (AnvilInventory) Bukkit.createInventory(this, InventoryType.ANVIL, "Set API Key");
        ItemStack input = MainMenuGui.icon(Material.PAPER, PROMPT, List.of("Rename with your API key,", "then click this to save it."));
        inventory.setItem(0, input);
    }

    @Override
    public Inventory getInventory() {
        return inventory;
    }

    @Override
    public void onClick(Player player, InventoryClickEvent event) {
        if (event.getSlot() != 2) {
            return;
        }
        String key = inventory.getRenameText();
        if (key == null || key.isBlank() || key.equals(PROMPT)) {
            player.sendMessage("Rename the paper with your API key first, then click it.");
            return;
        }
        player.closeInventory();
        plugin.updateApiKey(key);
        player.sendMessage("§aAPI key updated. It now applies to all marketplace requests.");
    }
}
