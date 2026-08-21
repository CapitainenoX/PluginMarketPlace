package network.corelabs.mcmarket;

import network.corelabs.mcmarket.api.MarketplaceApiClient;
import network.corelabs.mcmarket.command.MarketplaceCommand;
import network.corelabs.mcmarket.gui.GuiListener;
import network.corelabs.mcmarket.install.PluginInstaller;
import network.corelabs.mcmarket.install.UpdateChecker;
import network.corelabs.mcmarket.model.PluginSummary;
import network.corelabs.mcmarket.model.PluginVersion;
import network.corelabs.mcmarket.model.UpdateCheckResult;
import org.bukkit.Bukkit;
import org.bukkit.command.CommandSender;
import org.bukkit.plugin.java.JavaPlugin;

import java.util.List;

public class MarketplacePlugin extends JavaPlugin {

    private volatile MarketplaceApiClient apiClient;
    private PluginInstaller installer;
    private UpdateChecker updateChecker;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        reloadConfig();

        String baseUrl = getConfig().getString("api-base-url", "mc-api.corelabs.network");
        String apiKey = getConfig().getString("api-key", "");
        apiClient = new MarketplaceApiClient(baseUrl, apiKey);

        installer = new PluginInstaller(apiClient, getDataFolder().toPath().getParent(), getDataFolder().toPath());
        updateChecker = new UpdateChecker(this, apiClient, installer);
        updateChecker.start(getConfig().getLong("update-check-interval-minutes", 45));

        getServer().getPluginManager().registerEvents(new GuiListener(), this);
        var executor = new MarketplaceCommand(this);
        getCommand("marketplace").setExecutor(executor);
        getCommand("marketplace").setTabCompleter(executor);

        getLogger().info("MCMarket enabled, talking to " + baseUrl);
    }

    @Override
    public void onDisable() {
        if (updateChecker != null) {
            updateChecker.stop();
        }
    }

    public MarketplaceApiClient getApiClient() {
        return apiClient;
    }

    public PluginInstaller getInstaller() {
        return installer;
    }

    public UpdateChecker getUpdateChecker() {
        return updateChecker;
    }

    /** The marketplace slug MCMarket itself is published under - just another catalog entry. */
    public String getSelfPluginSlug() {
        return getConfig().getString("self-plugin-slug", "mcmarket");
    }

    /** The exact jar file this plugin is currently running from - self-update must overwrite this in place. */
    public java.io.File getSelfJarFile() {
        return getFile();
    }

    /**
     * Writes a new api-key to config.yml and swaps every live component over
     * to a freshly-built MarketplaceApiClient, so getApiClient() (and the
     * installer/update checker, which each hold their own reference) reflect
     * the change without needing a restart.
     */
    public synchronized void updateApiKey(String newApiKey) {
        String baseUrl = getConfig().getString("api-base-url", "mc-api.corelabs.network");
        getConfig().set("api-key", newApiKey);
        saveConfig();

        MarketplaceApiClient newClient = new MarketplaceApiClient(baseUrl, newApiKey);
        this.apiClient = newClient;
        if (installer != null) {
            installer.setApiClient(newClient);
        }
        if (updateChecker != null) {
            updateChecker.setApiClient(newClient);
        }
    }

    /**
     * Re-reads config.yml from disk and rebuilds every component that caches a
     * config value (api client, update-check interval) - so an admin can pick
     * up manual config.yml edits with {@code /mcmarket reload} instead of a
     * full server restart.
     */
    public synchronized void reloadPluginConfig() {
        reloadConfig();
        String baseUrl = getConfig().getString("api-base-url", "mc-api.corelabs.network");
        String apiKey = getConfig().getString("api-key", "");
        MarketplaceApiClient newClient = new MarketplaceApiClient(baseUrl, apiKey);
        this.apiClient = newClient;
        if (installer != null) {
            installer.setApiClient(newClient);
        }
        if (updateChecker != null) {
            updateChecker.setApiClient(newClient);
            updateChecker.stop();
            updateChecker.start(getConfig().getLong("update-check-interval-minutes", 45));
        }
    }

    /** Console/command-friendly self-update: checks and installs in one shot, no GUI confirmation step. */
    public void commandUpdateSelf(CommandSender sender) {
        Bukkit.getScheduler().runTaskAsynchronously(this, () -> {
            try {
                String selfSlug = getSelfPluginSlug();
                UpdateCheckResult check = apiClient.checkUpdates(selfSlug, getDescription().getVersion());
                if (check == null || !check.update_available || check.latest_version == null) {
                    Bukkit.getScheduler().runTask(this, () -> sender.sendMessage("MCMarket is already up to date."));
                    return;
                }
                PluginVersion version = check.latest_version;
                PluginInstaller.Result result = installer.installSelf(getSelfJarFile().toPath(), version);
                Bukkit.getScheduler().runTask(this, () -> {
                    sender.sendMessage(result.message);
                    if (result.success) {
                        sender.sendMessage("Restart required before this takes effect.");
                    }
                });
            } catch (Exception e) {
                Bukkit.getScheduler().runTask(this, () -> sender.sendMessage("Self-update check failed: " + e.getMessage()));
            }
        });
    }

    /** Console/command-friendly update for one installed plugin by slug, or every outdated one if slug is null. */
    public void commandUpdatePlugin(CommandSender sender, String slugOrNull) {
        Bukkit.getScheduler().runTaskAsynchronously(this, () -> {
            var manifest = installer.loadManifest();
            var targets = slugOrNull == null
                    ? manifest.values()
                    : manifest.containsKey(slugOrNull) ? List.of(manifest.get(slugOrNull)) : List.<PluginInstaller.InstalledRecord>of();

            if (targets.isEmpty()) {
                Bukkit.getScheduler().runTask(this, () -> sender.sendMessage(
                        slugOrNull == null ? "No plugins installed via MCMarket." : "\"" + slugOrNull + "\" isn't installed via MCMarket (try the exact slug shown in My Installed / Updates)."));
                return;
            }

            int updated = 0;
            for (PluginInstaller.InstalledRecord record : targets) {
                try {
                    UpdateCheckResult check = apiClient.checkUpdates(record.slug, record.version);
                    if (check == null || !check.update_available || check.latest_version == null) {
                        if (slugOrNull != null) {
                            Bukkit.getScheduler().runTask(this, () -> sender.sendMessage(record.slug + " is already up to date."));
                        }
                        continue;
                    }
                    PluginSummary summary = apiClient.getPlugin(record.slug);
                    PluginInstaller.Result result = installer.install(summary, check.latest_version);
                    final String message = result.message;
                    Bukkit.getScheduler().runTask(this, () -> sender.sendMessage(message));
                    if (result.success) updated++;
                } catch (Exception e) {
                    final String slug = record.slug;
                    Bukkit.getScheduler().runTask(this, () -> sender.sendMessage("Update failed for " + slug + ": " + e.getMessage()));
                }
            }
            final int count = updated;
            Bukkit.getScheduler().runTask(this, () -> {
                if (count > 0) {
                    sender.sendMessage("Updated " + count + " plugin(s). Restart required before changes take effect.");
                } else if (slugOrNull == null) {
                    sender.sendMessage("Everything is already up to date.");
                }
            });
        });
    }
}
