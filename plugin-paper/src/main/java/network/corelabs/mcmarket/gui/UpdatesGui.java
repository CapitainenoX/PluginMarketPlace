package network.corelabs.mcmarket.gui;

import network.corelabs.mcmarket.MarketplacePlugin;
import network.corelabs.mcmarket.install.InstalledPluginScanner;
import network.corelabs.mcmarket.install.JarPluginYmlReader;
import network.corelabs.mcmarket.install.PluginInstaller;
import network.corelabs.mcmarket.model.PluginSummary;
import network.corelabs.mcmarket.model.PluginVersion;
import network.corelabs.mcmarket.model.UpdateCheckResult;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.inventory.Inventory;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * "My Installed / Updates": every marketplace plugin this server has, either
 * because MCMarket installed it (installed.json - trusted sha256) or because
 * a scan of plugins/ fuzzy-matched some other jar's declared name against the
 * marketplace catalog (unmanaged - no trusted hash, but still worth showing).
 * Also surfaces a self-update entry for MCMarket itself.
 */
public class UpdatesGui implements MarketplaceGui {

    private static final int PAGE_SIZE = 45;

    private static class Entry {
        String slug;
        String displayName;
        String installedVersion;
        List<String> commands = List.of();
        UpdateCheckResult updateCheck;
        boolean managed; // true = tracked in installed.json (trusted sha256), false = fuzzy-detected
    }

    private final MarketplacePlugin plugin;
    private final Inventory inventory;
    private final List<Entry> entries = new ArrayList<>();
    private volatile boolean loading = true;
    private volatile boolean selfUpdateAvailable;
    private volatile PluginVersion selfLatestVersion;

    public UpdatesGui(MarketplacePlugin plugin) {
        this.plugin = plugin;
        this.inventory = Bukkit.createInventory(this, 54, "My Installed / Updates");
        render();
        load();
    }

    private void load() {
        Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
            Map<String, Entry> merged = new LinkedHashMap<>();

            // 1. Entries this installer put there itself - trusted sha256, identity from installed.json.
            Map<String, PluginInstaller.InstalledRecord> manifest = plugin.getInstaller().loadManifest();
            Path pluginsDir = plugin.getDataFolder().toPath().getParent();
            for (PluginInstaller.InstalledRecord record : manifest.values()) {
                Entry e = new Entry();
                e.slug = record.slug;
                e.displayName = record.slug;
                e.installedVersion = record.version;
                e.managed = true;
                JarPluginYmlReader.Descriptor descriptor = JarPluginYmlReader.read(pluginsDir.resolve(record.jarFileName));
                if (descriptor != null) {
                    e.commands = descriptor.commands;
                    if (e.displayName.equals(record.slug) && !descriptor.name.isBlank()) {
                        e.displayName = descriptor.name;
                    }
                }
                try {
                    e.updateCheck = plugin.getApiClient().checkUpdates(record.slug, record.version);
                } catch (Exception ex) {
                    plugin.getLogger().warning("Update check failed for " + record.slug + ": " + ex.getMessage());
                }
                merged.put(record.slug, e);
            }

            // 2. Fuzzy-detected jars: anything else in plugins/ whose declared
            // plugin.yml name matches a marketplace listing. Manifest entries
            // above already win any conflict, since they carry a verified hash.
            try {
                Path ownJar = plugin.getSelfJarFile().toPath();
                List<InstalledPluginScanner.ForeignPlugin> foreign = InstalledPluginScanner.scan(pluginsDir, ownJar);
                List<PluginSummary> catalog = fetchFullCatalog();
                Map<String, InstalledPluginScanner.ForeignMatch> matches = InstalledPluginScanner.matchAgainstMarketplace(foreign, catalog);
                for (var match : matches.entrySet()) {
                    String slug = match.getKey();
                    if (merged.containsKey(slug)) {
                        continue;
                    }
                    InstalledPluginScanner.ForeignMatch fm = match.getValue();
                    Entry e = new Entry();
                    e.slug = slug;
                    e.displayName = fm.marketplacePlugin.name;
                    e.installedVersion = fm.jar.descriptor.version;
                    e.commands = fm.jar.descriptor.commands;
                    e.managed = false;
                    try {
                        e.updateCheck = plugin.getApiClient().checkUpdates(slug, e.installedVersion);
                    } catch (Exception ex) {
                        plugin.getLogger().warning("Update check failed for " + slug + ": " + ex.getMessage());
                    }
                    merged.put(slug, e);
                }
            } catch (Exception ex) {
                plugin.getLogger().warning("Fuzzy plugin detection failed: " + ex.getMessage());
            }

            entries.clear();
            entries.addAll(merged.values());

            // 3. Self-update: is MCMarket's own marketplace listing newer than this jar?
            try {
                String selfSlug = plugin.getSelfPluginSlug();
                UpdateCheckResult selfCheck = plugin.getApiClient().checkUpdates(selfSlug, plugin.getDescription().getVersion());
                selfUpdateAvailable = selfCheck != null && selfCheck.update_available;
                selfLatestVersion = selfCheck != null ? selfCheck.latest_version : null;
            } catch (Exception ex) {
                plugin.getLogger().warning("Self-update check failed: " + ex.getMessage());
            }

            loading = false;
            Bukkit.getScheduler().runTask(plugin, this::render);
        });
    }

    private List<PluginSummary> fetchFullCatalog() throws Exception {
        List<PluginSummary> all = new ArrayList<>();
        int offset = 0;
        int limit = 100;
        for (int page = 0; page < 10; page++) {
            List<PluginSummary> batch = plugin.getApiClient().listPlugins(null, null, limit, offset);
            all.addAll(batch);
            if (batch.size() < limit) {
                break;
            }
            offset += limit;
        }
        return all;
    }

    private void render() {
        inventory.clear();
        if (loading) {
            inventory.setItem(22, MainMenuGui.icon(Material.CLOCK, "Loading...", List.of("Scanning installed plugins", "and checking for updates")));
            inventory.setItem(45, MainMenuGui.icon(Material.ARROW, "Back to Main Menu", List.of()));
            GuiUtil.fillEmpty(inventory);
            return;
        }

        if (entries.isEmpty() && !selfUpdateAvailable) {
            inventory.setItem(22, MainMenuGui.icon(Material.LIME_WOOL, "Everything up to date",
                    List.of("No marketplace plugins detected,", "or everything installed is current.")));
        }

        int slot = 0;
        for (Entry e : entries) {
            if (slot >= PAGE_SIZE) break;
            boolean outdated = e.updateCheck != null && e.updateCheck.update_available;
            Material material = outdated ? Material.ANVIL : (e.managed ? Material.LIME_WOOL : Material.EMERALD);

            List<String> lore = new ArrayList<>();
            lore.add("Installed: v" + (e.installedVersion == null || e.installedVersion.isBlank() ? "?" : e.installedVersion));
            lore.add(e.managed ? "Source: installed via MCMarket" : "Source: detected in plugins/ (unmanaged)");
            if (outdated && e.updateCheck.latest_version != null) {
                lore.add("Available: v" + e.updateCheck.latest_version.version);
                lore.add("Click to update");
            } else {
                lore.add("Up to date");
            }
            lore.add("");
            if (e.commands.isEmpty()) {
                lore.add("Commands: none registered");
            } else {
                lore.add("Commands: /" + String.join(", /", e.commands));
            }
            inventory.setItem(slot++, MainMenuGui.icon(material, e.displayName, lore));
        }

        if (selfUpdateAvailable && selfLatestVersion != null) {
            inventory.setItem(49, MainMenuGui.icon(Material.NETHER_STAR, "Update MCMarket Itself",
                    List.of("Installed: v" + plugin.getDescription().getVersion(),
                            "Available: v" + selfLatestVersion.version,
                            "",
                            "Overwrites this plugin's own jar file.",
                            "Config and data are preserved.",
                            "Click to update")));
        }

        inventory.setItem(45, MainMenuGui.icon(Material.ARROW, "Back to Main Menu", List.of()));
        GuiUtil.fillEmpty(inventory);
    }

    @Override
    public Inventory getInventory() {
        return inventory;
    }

    @Override
    public void onClick(Player player, InventoryClickEvent event) {
        int slot = event.getSlot();
        if (slot == 45) {
            new MainMenuGui(plugin).open(player);
            return;
        }
        if (slot == 49 && selfUpdateAvailable && selfLatestVersion != null) {
            new SelfUpdateConfirmGui(plugin, selfLatestVersion).open(player);
            return;
        }
        if (loading || slot >= entries.size()) {
            return;
        }
        Entry e = entries.get(slot);
        if (e.updateCheck == null || !e.updateCheck.update_available || e.updateCheck.latest_version == null) {
            return;
        }
        player.closeInventory();
        PluginVersion version = e.updateCheck.latest_version;
        Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
            PluginSummary summary;
            try {
                summary = plugin.getApiClient().getPlugin(e.slug);
            } catch (Exception ex) {
                Bukkit.getScheduler().runTask(plugin, () -> player.sendMessage("Failed to load plugin details: " + ex.getMessage()));
                return;
            }
            Bukkit.getScheduler().runTask(plugin, () -> new InstallConfirmGui(plugin, summary, version).open(player));
        });
    }
}
