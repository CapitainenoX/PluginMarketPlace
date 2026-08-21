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
        inventory.setItem(11, icon(Material.ENDER_CHEST, "All Plugins", List.of("Browse every plugin on", "the marketplace")));
        inventory.setItem(13, icon(Material.COMPASS, "Search", List.of("Search plugins by name")));
        inventory.setItem(15, icon(Material.NETHER_STAR, "My Installed / Updates", List.of(
                "See what's installed - including",
                "jars placed here manually - and",
                "check for updates",
                "(also where MCMarket updates itself)")));
        inventory.setItem(17, icon(Material.LEVER, "Settings", List.of("Set the marketplace API key")));
        GuiUtil.fillEmpty(inventory);
    }

    @Override
    public Inventory getInventory() {
        return inventory;
    }

    @Override
    public void onClick(Player player, InventoryClickEvent event) {
        switch (event.getSlot()) {
            case 11 -> new BrowseAllGui(plugin, 0).open(player);
            case 13 -> new SearchGui(plugin).open(player);
            case 15 -> new UpdatesGui(plugin).open(player);
            case 17 -> new ApiKeyGui(plugin).open(player);
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
