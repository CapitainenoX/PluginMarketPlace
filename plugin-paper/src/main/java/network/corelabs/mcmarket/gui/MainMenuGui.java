package network.corelabs.mcmarket.gui;

import network.corelabs.mcmarket.MarketplacePlugin;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;

import java.util.List;

public class MainMenuGui implements MarketplaceGui {

    private final MarketplacePlugin plugin;
    private final Inventory inventory;

    public MainMenuGui(MarketplacePlugin plugin) {
        this.plugin = plugin;
        this.inventory = Bukkit.createInventory(this, 27, "Plugin Marketplace");
        inventory.setItem(10, icon(Material.CHEST, "Browse by Category", List.of("Browse plugins grouped", "by category")));
        inventory.setItem(12, icon(Material.ENDER_CHEST, "Browse All Plugins", List.of("See every plugin on", "the marketplace")));
        inventory.setItem(14, icon(Material.COMPASS, "Search", List.of("Search plugins by name")));
        inventory.setItem(16, icon(Material.NETHER_STAR, "My Installed / Updates", List.of(
                "See what's installed - including",
                "jars placed here manually - and",
                "check for updates")));
        inventory.setItem(20, icon(Material.LEVER, "Settings", List.of("Set the marketplace API key")));
        inventory.setItem(24, icon(Material.BOOK, "About", List.of("MCMarket - corelabs.network", "self-hosted plugin marketplace client")));
        GuiUtil.fillEmpty(inventory);
    }

    @Override
    public Inventory getInventory() {
        return inventory;
    }

    @Override
    public void onClick(Player player, InventoryClickEvent event) {
        switch (event.getSlot()) {
            case 10 -> new CategoryGui(plugin).open(player);
            case 12 -> new BrowseAllGui(plugin, 0).open(player);
            case 14 -> new SearchGui(plugin).open(player);
            case 16 -> new UpdatesGui(plugin).open(player);
            case 20 -> new ApiKeyGui(plugin).open(player);
            case 24 -> player.sendMessage("MCMarket client for the corelabs.network plugin marketplace.");
            default -> {
            }
        }
    }

    static ItemStack icon(Material material, String name, List<String> lore) {
        ItemStack item = new ItemStack(material);
        ItemMeta meta = item.getItemMeta();
        meta.setDisplayName(name);
        meta.setLore(lore);
        item.setItemMeta(meta);
        return item;
    }
}
