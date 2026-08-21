package network.corelabs.mcmarket.gui;

import network.corelabs.mcmarket.MarketplacePlugin;
import network.corelabs.mcmarket.model.CategorySummary;
import network.corelabs.mcmarket.model.PluginSummary;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.ItemStack;

import java.util.List;

/**
 * Two modes in one screen: with no category selected it lists categories;
 * with one selected it lists that category's plugins. Both are paginated
 * over the same 45-slot grid (bottom row reserved for navigation).
 */
public class CategoryGui implements MarketplaceGui {

    private static final int PAGE_SIZE = 45;

    private final MarketplacePlugin plugin;
    private final Inventory inventory;
    private final String categorySlug;
    private final String categoryName;
    private final int page;

    private List<CategorySummary> categories = List.of();
    private List<PluginSummary> plugins = List.of();

    public CategoryGui(MarketplacePlugin plugin) {
        this(plugin, null, null, 0);
    }

    public CategoryGui(MarketplacePlugin plugin, String categorySlug, String categoryName, int page) {
        this.plugin = plugin;
        this.categorySlug = categorySlug;
        this.categoryName = categoryName;
        this.page = page;
        String title = categorySlug == null ? "Browse Categories" : "Category: " + categoryName;
        this.inventory = Bukkit.createInventory(this, 54, title);
        loadAndRender();
    }

    private void loadAndRender() {
        Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
            try {
                if (categorySlug == null) {
                    categories = plugin.getApiClient().listCategories();
                } else {
                    plugins = plugin.getApiClient().listPlugins(null, categorySlug, PAGE_SIZE, page * PAGE_SIZE);
                }
            } catch (Exception e) {
                plugin.getLogger().warning("Failed to load categories/plugins: " + e.getMessage());
            }
            Bukkit.getScheduler().runTask(plugin, this::render);
        });
    }

    private void render() {
        inventory.clear();
        if (categorySlug == null) {
            int slot = 0;
            for (CategorySummary cat : categories) {
                if (slot >= PAGE_SIZE) break;
                inventory.setItem(slot++, MainMenuGui.icon(Material.BOOKSHELF, cat.name, List.of(cat.description == null ? "" : cat.description)));
            }
        } else {
            int slot = 0;
            for (PluginSummary p : plugins) {
                if (slot >= PAGE_SIZE) break;
                inventory.setItem(slot++, MainMenuGui.icon(Material.PAPER, p.name, List.of(
                        p.summary == null ? "" : p.summary,
                        "Downloads: " + p.downloads_count,
                        "Click for details")));
            }
            inventory.setItem(45, MainMenuGui.icon(Material.ARROW, "Back to Categories", List.of()));
            if (page > 0) {
                inventory.setItem(48, MainMenuGui.icon(Material.ARROW, "Previous Page", List.of()));
            }
            if (plugins.size() == PAGE_SIZE) {
                inventory.setItem(50, MainMenuGui.icon(Material.ARROW, "Next Page", List.of()));
            }
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
        if (categorySlug == null) {
            if (slot < categories.size()) {
                CategorySummary cat = categories.get(slot);
                new CategoryGui(plugin, cat.slug, cat.name, 0).open(player);
            }
            return;
        }
        if (slot == 45) {
            new CategoryGui(plugin).open(player);
            return;
        }
        if (slot == 48 && page > 0) {
            new CategoryGui(plugin, categorySlug, categoryName, page - 1).open(player);
            return;
        }
        if (slot == 50 && plugins.size() == PAGE_SIZE) {
            new CategoryGui(plugin, categorySlug, categoryName, page + 1).open(player);
            return;
        }
        if (slot < plugins.size()) {
            PluginSummary p = plugins.get(slot);
            new PluginDetailGui(plugin, p.slug).open(player);
        }
    }
}
