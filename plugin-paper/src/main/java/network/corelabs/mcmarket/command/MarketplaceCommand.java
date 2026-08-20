package network.corelabs.mcmarket.command;

import network.corelabs.mcmarket.MarketplacePlugin;
import network.corelabs.mcmarket.gui.MainMenuGui;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;
import org.bukkit.entity.Player;
import org.jetbrains.annotations.NotNull;

import java.util.List;

public class MarketplaceCommand implements CommandExecutor, TabCompleter {

    private final MarketplacePlugin plugin;

    public MarketplaceCommand(MarketplacePlugin plugin) {
        this.plugin = plugin;
    }

    @Override
    public boolean onCommand(@NotNull CommandSender sender, @NotNull Command command, @NotNull String label, String[] args) {
        if (!(sender instanceof Player player)) {
            sender.sendMessage("This command can only be used in-game.");
            return true;
        }
        if (!player.hasPermission("mcmarket.use")) {
            player.sendMessage("You do not have permission to use the marketplace.");
            return true;
        }
        new MainMenuGui(plugin).open(player);
        return true;
    }

    @Override
    public List<String> onTabComplete(@NotNull CommandSender sender, @NotNull Command command, @NotNull String label, String[] args) {
        return List.of();
    }
}
