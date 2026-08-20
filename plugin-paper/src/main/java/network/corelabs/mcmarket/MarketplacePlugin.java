package network.corelabs.mcmarket;

import network.corelabs.mcmarket.api.MarketplaceApiClient;
import network.corelabs.mcmarket.command.MarketplaceCommand;
import network.corelabs.mcmarket.gui.GuiListener;
import network.corelabs.mcmarket.install.PluginInstaller;
import network.corelabs.mcmarket.install.UpdateChecker;
import org.bukkit.plugin.java.JavaPlugin;

public class MarketplacePlugin extends JavaPlugin {

    private MarketplaceApiClient apiClient;
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
}
