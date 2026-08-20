package network.corelabs.mcmarket.gui;

import network.corelabs.mcmarket.MarketplacePlugin;
import network.corelabs.mcmarket.model.PluginSummary;
import network.corelabs.mcmarket.model.PluginVersion;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.inventory.Inventory;

import java.util.ArrayList;
import java.util.List;

public class PluginDetailGui implements MarketplaceGui {

    private final MarketplacePlugin plugin;
    private final String slug;
    private final Inventory inventory;

    private PluginSummary summary;
    private PluginVersion latestVersion;
    private boolean loadFailed;

    public PluginDetailGui(MarketplacePlugin plugin, String slug) {
        this.plugin = plugin;
        this.slug = slug;
        this.inventory = Bukkit.createInventory(this, 27, "Plugin: " + slug);
        load();
    }

    private void load() {
        Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
            try {
                summary = plugin.getApiClient().getPlugin(slug);
                List<PluginVersion> versions = plugin.getApiClient().listVersions(slug);
                latestVersion = versions.isEmpty() ? null : versions.get(0);
            } catch (Exception e) {
                loadFailed = true;
                plugin.getLogger().warning("Failed to load plugin " + slug + ": " + e.getMessage());
            }
            Bukkit.getScheduler().runTask(plugin, this::render);
        });
    }

    private void render() {
        inventory.clear();
        if (loadFailed || summary == null) {
            inventory.setItem(13, MainMenuGui.icon(Material.BARRIER, "Failed to load plugin", List.of()));
            return;
        }

        List<String> lore = new ArrayList<>();
        lore.add(summary.description == null || summary.description.isBlank() ? summary.summary : summary.description);
        lore.add("");
        if (latestVersion != null) {
            lore.add("Version: " + latestVersion.version);
            lore.add("MC: " + latestVersion.mc_version_min + " - " + latestVersion.mc_version_max);
            lore.add("Changelog: " + shorten(latestVersion.changelog));
        } else {
            lore.add("No approved versions published yet.");
        }
        lore.add("Downloads: " + summary.downloads_count);
        inventory.setItem(13, MainMenuGui.icon(Material.PAPER, summary.name, lore));

        if (latestVersion != null) {
            inventory.setItem(15, MainMenuGui.icon(Material.ANVIL, "Install / Update", List.of("Click to review and confirm")));
        }
        inventory.setItem(22, MainMenuGui.icon(Material.ARROW, "Back", List.of()));
    }

    private static String shorten(String text) {
        if (text == null || text.isBlank()) return "(none)";
        return text.length() > 60 ? text.substring(0, 57) + "..." : text;
    }

    @Override
    public Inventory getInventory() {
        return inventory;
    }

    @Override
    public void onClick(Player player, InventoryClickEvent event) {
        if (event.getSlot() == 15 && latestVersion != null) {
            new InstallConfirmGui(plugin, summary, latestVersion).open(player);
        } else if (event.getSlot() == 22) {
            new MainMenuGui(plugin).open(player);
        }
    }
}
