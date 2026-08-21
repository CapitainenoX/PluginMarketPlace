package network.corelabs.mcmarket;

import network.corelabs.mcmarket.api.MarketplaceApiClient;
import network.corelabs.mcmarket.command.MarketplaceCommand;
import network.corelabs.mcmarket.gui.GuiListener;
import network.corelabs.mcmarket.install.PluginInstaller;
import network.corelabs.mcmarket.install.UpdateChecker;
import org.bukkit.plugin.java.JavaPlugin;

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
}
