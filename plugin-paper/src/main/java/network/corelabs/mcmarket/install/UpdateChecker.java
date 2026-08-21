package network.corelabs.mcmarket.install;

import network.corelabs.mcmarket.api.MarketplaceApiClient;
import network.corelabs.mcmarket.model.UpdateCheckResult;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitTask;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.NoSuchAlgorithmException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Level;

/**
 * Periodically re-hashes every jar this installer knows about (see
 * PluginInstaller's installed.json manifest) and asks the API whether a
 * newer approved version exists. The API has no "look this jar hash up"
 * endpoint, so identity comes from the manifest (slug + installed version);
 * the hash check just confirms the jar on disk still matches what we
 * installed before trusting that version number.
 */
public class UpdateChecker {

    private final JavaPlugin plugin;
    private volatile MarketplaceApiClient api;
    private final PluginInstaller installer;
    private final Map<String, UpdateCheckResult> latestResults = new ConcurrentHashMap<>();
    private BukkitTask task;

    public UpdateChecker(JavaPlugin plugin, MarketplaceApiClient api, PluginInstaller installer) {
        this.plugin = plugin;
        this.api = api;
        this.installer = installer;
    }

    /** Swaps the live API client (e.g. after the admin sets a new API key in-game). */
    public void setApiClient(MarketplaceApiClient api) {
        this.api = api;
    }

    public void start(long intervalMinutes) {
        long ticks = Math.max(1, intervalMinutes) * 60L * 20L;
        task = plugin.getServer().getScheduler().runTaskTimerAsynchronously(plugin, this::checkNow, 200L, ticks);
    }

    public void stop() {
        if (task != null) {
            task.cancel();
        }
    }

    /** Blocking; safe to call from an async task or trigger manually before opening UpdatesGui. */
    public void checkNow() {
        for (PluginInstaller.InstalledRecord record : installer.loadManifest().values()) {
            try {
                Path jarPath = jarPathFor(record);
                if (!Files.exists(jarPath)) {
                    continue;
                }
                String currentHash = PluginInstaller.sha256(jarPath);
                if (!currentHash.equalsIgnoreCase(record.sha256)) {
                    plugin.getLogger().warning("Installed jar for " + record.slug + " no longer matches the recorded hash; skipping update check.");
                    continue;
                }
                UpdateCheckResult result = api.checkUpdates(record.slug, record.version);
                latestResults.put(record.slug, result);
            } catch (Exception e) {
                plugin.getLogger().log(Level.WARNING, "Update check failed for " + record.slug, e);
            }
        }
    }

    public Map<String, UpdateCheckResult> getLatestResults() {
        return latestResults;
    }

    private Path jarPathFor(PluginInstaller.InstalledRecord record) {
        // This plugin's data folder always lives directly inside plugins/.
        return plugin.getDataFolder().toPath().getParent().resolve(record.jarFileName);
    }
}
