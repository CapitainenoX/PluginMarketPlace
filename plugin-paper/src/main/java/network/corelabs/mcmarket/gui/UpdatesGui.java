package network.corelabs.mcmarket.gui;

import network.corelabs.mcmarket.MarketplacePlugin;
import network.corelabs.mcmarket.install.PluginInstaller;
import network.corelabs.mcmarket.model.PluginSummary;
import network.corelabs.mcmarket.model.PluginVersion;
import network.corelabs.mcmarket.model.UpdateCheckResult;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.inventory.Inventory;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Lists installed marketplace plugins that have a newer approved version available. */
public class UpdatesGui implements MarketplaceGui {

    private final MarketplacePlugin plugin;
    private final Inventory inventory;
    private final List<PluginInstaller.InstalledRecord> outdated = new ArrayList<>();

    public UpdatesGui(MarketplacePlugin plugin) {
        this.plugin = plugin;
        this.inventory = Bukkit.createInventory(this, 27, "Updates Available");
        render();
    }

    private void render() {
        Map<String, PluginInstaller.InstalledRecord> manifest = plugin.getInstaller().loadManifest();
        Map<String, UpdateCheckResult> results = plugin.getUpdateChecker().getLatestResults();
        outdated.clear();
        for (var entry : manifest.values()) {
            UpdateCheckResult result = results.get(entry.slug);
            if (result != null && result.update_available) {
                outdated.add(entry);
            }
        }

        if (outdated.isEmpty()) {
            inventory.setItem(13, MainMenuGui.icon(Material.LIME_WOOL, "Everything up to date", List.of()));
            return;
        }

        int slot = 0;
        for (PluginInstaller.InstalledRecord entry : outdated) {
            if (slot >= 18) break;
            UpdateCheckResult result = results.get(entry.slug);
            String newVersion = result.latest_version != null ? result.latest_version.version : "?";
            inventory.setItem(slot++, MainMenuGui.icon(Material.ANVIL, entry.slug,
                    List.of("Installed: " + entry.version, "Available: " + newVersion, "Click to update")));
        }
    }

    @Override
    public Inventory getInventory() {
        return inventory;
    }

    @Override
    public void onClick(Player player, InventoryClickEvent event) {
        int slot = event.getSlot();
        if (slot >= outdated.size()) {
            return;
        }
        PluginInstaller.InstalledRecord entry = outdated.get(slot);
        UpdateCheckResult result = plugin.getUpdateChecker().getLatestResults().get(entry.slug);
        if (result == null || result.latest_version == null) {
            return;
        }
        player.closeInventory();
        Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
            PluginSummary summary;
            try {
                summary = plugin.getApiClient().getPlugin(entry.slug);
            } catch (Exception e) {
                Bukkit.getScheduler().runTask(plugin, () -> player.sendMessage("Failed to load plugin details: " + e.getMessage()));
                return;
            }
            PluginVersion version = result.latest_version;
            Bukkit.getScheduler().runTask(plugin, () -> new InstallConfirmGui(plugin, summary, version).open(player));
        });
    }
}
