package network.corelabs.mcmarket.gui;

import network.corelabs.mcmarket.MarketplacePlugin;
import network.corelabs.mcmarket.install.PluginInstaller;
import network.corelabs.mcmarket.model.PluginVersion;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.inventory.Inventory;

import java.util.List;

/**
 * Confirms updating MCMarket's OWN jar. Unlike a normal plugin install, this
 * must overwrite the exact currently-running jar file in place - never write
 * a second jar under a different name, or Paper would try to load both jars
 * on the next restart.
 */
public class SelfUpdateConfirmGui implements MarketplaceGui {

    private final MarketplacePlugin plugin;
    private final PluginVersion version;
    private final Inventory inventory;
    private boolean submitted;

    public SelfUpdateConfirmGui(MarketplacePlugin plugin, PluginVersion version) {
        this.plugin = plugin;
        this.version = version;
        this.inventory = Bukkit.createInventory(this, 27, "Confirm Self-Update");

        inventory.setItem(11, MainMenuGui.icon(Material.LIME_WOOL, "Confirm Update",
                List.of("MCMarket " + version.version,
                        "",
                        "Overwrites this plugin's own jar file",
                        "in place. Config and data folder",
                        "are kept untouched.",
                        "",
                        "The server will NOT auto-restart or",
                        "hot-load this plugin. You must restart",
                        "the server for it to take effect.")));
        inventory.setItem(15, MainMenuGui.icon(Material.RED_WOOL, "Cancel", List.of()));
        GuiUtil.fillEmpty(inventory);
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
            new UpdatesGui(plugin).open(player);
            return;
        }
        if (event.getSlot() != 11) {
            return;
        }
        submitted = true;
        player.closeInventory();
        player.sendMessage("Updating MCMarket to " + version.version + "...");
        Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
            PluginInstaller.Result result = plugin.getInstaller().installSelf(plugin.getSelfJarFile().toPath(), version);
            Bukkit.getScheduler().runTask(plugin, () -> {
                player.sendMessage((result.success ? "§a" : "§c") + result.message);
                if (result.success) {
                    // Deliberate: self-update is not exempt from the restart
                    // requirement either - Paper still cannot hot-swap classes.
                    player.sendMessage("§eRestart required before this takes effect.");
                }
            });
        });
    }
}
