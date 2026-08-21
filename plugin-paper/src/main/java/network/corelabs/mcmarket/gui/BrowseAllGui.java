package network.corelabs.mcmarket.gui;

import network.corelabs.mcmarket.MarketplacePlugin;
import network.corelabs.mcmarket.install.PluginInstaller;
import network.corelabs.mcmarket.model.PluginSummary;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.inventory.Inventory;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Paginated list of every plugin on the marketplace, regardless of category. */
public class BrowseAllGui implements MarketplaceGui {

    private static final int PAGE_SIZE = 45;

    private final MarketplacePlugin plugin;
    private final Inventory inventory;
    private final int page;
    private List<PluginSummary> plugins = List.of();

    public BrowseAllGui(MarketplacePlugin plugin, int page) {
        this.plugin = plugin;
        this.page = page;
        this.inventory = Bukkit.createInventory(this, 54, "Browse All Plugins");
        load();
    }

    private void load() {
        Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
            try {
                plugins = plugin.getApiClient().listPlugins(null, null, PAGE_SIZE, page * PAGE_SIZE);
            } catch (Exception e) {
                plugin.getLogger().warning("Failed to load plugin list: " + e.getMessage());
            }
            Bukkit.getScheduler().runTask(plugin, this::render);
        });
    }

    private void render() {
        inventory.clear();
        Map<String, PluginInstaller.InstalledRecord> manifest = plugin.getInstaller().loadManifest();
        int slot = 0;
        for (PluginSummary p : plugins) {
            if (slot >= PAGE_SIZE) break;
            PluginInstaller.InstalledRecord record = manifest.get(p.slug);
            List<String> lore = new ArrayList<>();
            lore.add(p.summary == null ? "" : p.summary);
            lore.add("Downloads: " + p.downloads_count);
            Material material;
            if (record != null) {
                lore.add("Installed: v" + record.version);
                material = Material.LIME_WOOL;
            } else {
                lore.add("Not installed");
                material = Material.PAPER;
            }
            lore.add("Click for details");
            inventory.setItem(slot++, MainMenuGui.icon(material, p.name, lore));
        }
        if (page > 0) {
            inventory.setItem(48, MainMenuGui.icon(Material.ARROW, "Previous Page", List.of()));
        }
        inventory.setItem(49, MainMenuGui.icon(Material.ARROW, "Back to Main Menu", List.of()));
        if (plugins.size() == PAGE_SIZE) {
            inventory.setItem(50, MainMenuGui.icon(Material.ARROW, "Next Page", List.of()));
        }
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
        if (slot == 48 && page > 0) {
            new BrowseAllGui(plugin, page - 1).open(player);
            return;
        }
        if (slot == 50 && plugins.size() == PAGE_SIZE) {
            new BrowseAllGui(plugin, page + 1).open(player);
            return;
        }
        if (slot < plugins.size()) {
            new PluginDetailGui(plugin, plugins.get(slot).slug).open(player);
        }
    }
}
