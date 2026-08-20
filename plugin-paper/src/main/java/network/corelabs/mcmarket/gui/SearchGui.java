package network.corelabs.mcmarket.gui;

import network.corelabs.mcmarket.MarketplacePlugin;
import network.corelabs.mcmarket.model.PluginSummary;
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
 * Anvil-based text search: the player renames the item in slot 0 and clicks
 * the result slot (2) to submit that text as a search query.
 */
public class SearchGui implements MarketplaceGui {

    private static final String PROMPT = "Type search...";

    private final MarketplacePlugin plugin;
    private final AnvilInventory inventory;

    public SearchGui(MarketplacePlugin plugin) {
        this.plugin = plugin;
        this.inventory = (AnvilInventory) Bukkit.createInventory(this, InventoryType.ANVIL, "Search Plugins");
        ItemStack input = MainMenuGui.icon(Material.PAPER, PROMPT, List.of());
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
        String query = inventory.getRenameText();
        if (query == null || query.isBlank() || query.equals(PROMPT)) {
            player.sendMessage("Rename the paper with your search text first, then click it.");
            return;
        }
        player.closeInventory();
        player.sendMessage("Searching for \"" + query + "\"...");
        Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
            List<PluginSummary> results;
            try {
                results = plugin.getApiClient().listPlugins(query, null, 45, 0);
            } catch (Exception e) {
                Bukkit.getScheduler().runTask(plugin, () -> player.sendMessage("Search failed: " + e.getMessage()));
                return;
            }
            Bukkit.getScheduler().runTask(plugin, () -> new SearchResultsGui(plugin, query, results).open(player));
        });
    }
}
