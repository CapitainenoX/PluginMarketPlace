package network.corelabs.mcmarket.gui;

import network.corelabs.mcmarket.MarketplacePlugin;
import network.corelabs.mcmarket.model.PluginSummary;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.inventory.Inventory;

import java.util.List;

/** Flat result list for SearchGui's query - not paginated since results are capped at 45. */
public class SearchResultsGui implements MarketplaceGui {

    private final MarketplacePlugin plugin;
    private final List<PluginSummary> results;
    private final Inventory inventory;

    public SearchResultsGui(MarketplacePlugin plugin, String query, List<PluginSummary> results) {
        this.plugin = plugin;
        this.results = results;
        this.inventory = Bukkit.createInventory(this, 54, "Search: " + query);
        render();
    }

    private void render() {
        if (results.isEmpty()) {
            inventory.setItem(22, MainMenuGui.icon(Material.BARRIER, "No results", List.of()));
        } else {
            int slot = 0;
            for (PluginSummary p : results) {
                if (slot >= 45) break;
                inventory.setItem(slot++, MainMenuGui.icon(Material.PAPER, p.name, List.of(
                        p.summary == null ? "" : p.summary,
                        "Downloads: " + p.downloads_count,
                        "Click for details")));
            }
        }
        inventory.setItem(49, MainMenuGui.icon(Material.ARROW, "Back to Main Menu", List.of()));
        GuiUtil.fillEmpty(inventory);
    }

    @Override
    public Inventory getInventory() {
        return inventory;
    }

    @Override
    public void onClick(Player player, InventoryClickEvent event) {
        int slot = event.getSlot();
        if (slot == 49) {
            new MainMenuGui(plugin).open(player);
            return;
        }
        if (slot < results.size()) {
            new PluginDetailGui(plugin, results.get(slot).slug).open(player);
        }
    }
}
