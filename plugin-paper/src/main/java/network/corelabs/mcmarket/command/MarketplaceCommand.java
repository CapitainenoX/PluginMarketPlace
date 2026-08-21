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
import java.util.stream.Stream;

/**
 * {@code /marketplace} (aliases {@code /mcmarket}, {@code /market}) with no
 * arguments opens the GUI (players only). With arguments it's an admin CLI -
 * {@code reload} and {@code update} - usable from console, since restarting
 * the whole server just to pick up a config change or push an update is
 * exactly what the marketplace is meant to avoid.
 */
public class MarketplaceCommand implements CommandExecutor, TabCompleter {

    private final MarketplacePlugin plugin;

    public MarketplaceCommand(MarketplacePlugin plugin) {
        this.plugin = plugin;
    }

    @Override
    public boolean onCommand(@NotNull CommandSender sender, @NotNull Command command, @NotNull String label, String[] args) {
        if (args.length == 0) {
            if (!(sender instanceof Player player)) {
                sender.sendMessage("This command can only be used in-game. Try /mcmarket reload or /mcmarket update from console.");
                return true;
            }
            if (!player.hasPermission("mcmarket.use")) {
                player.sendMessage("You do not have permission to use the marketplace.");
                return true;
            }
            new MainMenuGui(plugin).open(player);
            return true;
        }

        String sub = args[0].toLowerCase();
        switch (sub) {
            case "reload" -> {
                if (!requireAdmin(sender)) return true;
                plugin.reloadPluginConfig();
                sender.sendMessage("MCMarket config reloaded.");
            }
            case "update" -> {
                if (!requireAdmin(sender)) return true;
                if (args.length < 2) {
                    sender.sendMessage("Usage: /mcmarket update <self|all|slug>");
                    return true;
                }
                String target = args[1].toLowerCase();
                if (target.equals("self")) {
                    plugin.commandUpdateSelf(sender);
                } else if (target.equals("all")) {
                    plugin.commandUpdatePlugin(sender, null);
                } else {
                    plugin.commandUpdatePlugin(sender, args[1]);
                }
            }
            default -> sender.sendMessage("Unknown subcommand. Usage: /mcmarket [reload|update <self|all|slug>]");
        }
        return true;
    }

    private boolean requireAdmin(CommandSender sender) {
        if (!sender.hasPermission("mcmarket.admin")) {
            sender.sendMessage("You do not have permission to do that.");
            return false;
        }
        return true;
    }

    @Override
    public List<String> onTabComplete(@NotNull CommandSender sender, @NotNull Command command, @NotNull String label, String[] args) {
        if (!sender.hasPermission("mcmarket.admin")) {
            return List.of();
        }
        if (args.length == 1) {
            return filter(Stream.of("reload", "update"), args[0]);
        }
        if (args.length == 2 && args[0].equalsIgnoreCase("update")) {
            return filter(Stream.of("self", "all"), args[1]);
        }
        return List.of();
    }

    private List<String> filter(Stream<String> options, String prefix) {
        String lower = prefix.toLowerCase();
        return options.filter(s -> s.startsWith(lower)).toList();
    }
}
