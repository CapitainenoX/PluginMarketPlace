package network.corelabs.mcmarket.gui;

import network.corelabs.mcmarket.MarketplacePlugin;
import network.corelabs.mcmarket.install.PluginInstaller;
import network.corelabs.mcmarket.model.PluginSummary;
import network.corelabs.mcmarket.model.PluginVersion;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.inventory.Inventory;

import java.util.List;

public class InstallConfirmGui implements MarketplaceGui {

    private final MarketplacePlugin plugin;
    private final PluginSummary summary;
    private final PluginVersion version;
    private final Inventory inventory;
    private boolean submitted;

    public InstallConfirmGui(MarketplacePlugin plugin, PluginSummary summary, PluginVersion version) {
        this.plugin = plugin;
        this.summary = summary;
        this.version = version;
        this.inventory = Bukkit.createInventory(this, 27, "Confirm Install");

        inventory.setItem(11, MainMenuGui.icon(Material.LIME_WOOL, "Confirm Install",
                List.of(summary.name + " " + version.version,
                        "",
                        "The server will NOT auto-restart or",
                        "hot-load this plugin. You must restart",
                        "the server for it to take effect.")));
        inventory.setItem(15, MainMenuGui.icon(Material.RED_WOOL, "Cancel", List.of()));
    }

    @Override
    public Inventory getInventory() {
        return inventory;
    }

    @Override
    public void onClick(Player player, InventoryClickEvent event) {
        if (submitted) {
            return;
        }
        if (event.getSlot() == 15) {
            new PluginDetailGui(plugin, summary.slug).open(player);
            return;
        }
        if (event.getSlot() != 11) {
            return;
        }
        submitted = true;
        player.closeInventory();
        player.sendMessage("Installing " + summary.name + " " + version.version + "...");
        Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
            PluginInstaller.Result result = plugin.getInstaller().install(summary, version);
            Bukkit.getScheduler().runTask(plugin, () -> {
                player.sendMessage((result.success ? "§a" : "§c") + result.message);
                if (result.success) {
                    // Deliberate: never claim a live reload. Restart is the
                    // only supported way to load a newly written jar.
                    player.sendMessage("§eRestart required before this takes effect.");
                }
            });
        });
    }
}
