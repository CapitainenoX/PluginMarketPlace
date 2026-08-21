package network.corelabs.mcmarket.gui;

import io.papermc.paper.event.player.AsyncChatEvent;
import net.kyori.adventure.text.serializer.plain.PlainTextComponentSerializer;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.plugin.Plugin;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

/**
 * Captures the next chat message from a player as free-text input for the
 * GUI (search queries, the API key). Replaces an earlier anvil-rename-text
 * trick that turned out to be unreliable in practice - AnvilInventory's
 * rename text and result-slot behavior isn't consistent across clients/
 * versions when the inventory isn't backed by a real anvil block. Chat
 * capture is the standard, dependable way plugins take free text from a
 * player without opening a full conversation/API dependency.
 */
public class ChatInputManager implements Listener {

    private final Plugin plugin;
    private final Map<UUID, Consumer<String>> pending = new ConcurrentHashMap<>();

    public ChatInputManager(Plugin plugin) {
        this.plugin = plugin;
    }

    /** Closes the player's current inventory, sends {@code promptMessage}, and captures their next chat line. */
    public void prompt(Player player, String promptMessage, Consumer<String> onSubmit) {
        player.closeInventory();
        player.sendMessage(promptMessage);
        player.sendMessage("§7(Type §ccancel§7 to abort.)");
        pending.put(player.getUniqueId(), onSubmit);
    }

    @EventHandler(priority = EventPriority.LOWEST)
    public void onChat(AsyncChatEvent event) {
        Player player = event.getPlayer();
        Consumer<String> waiting = pending.get(player.getUniqueId());
        if (waiting == null) {
            return;
        }
        event.setCancelled(true);
        pending.remove(player.getUniqueId());

        String text = PlainTextComponentSerializer.plainText().serialize(event.message());
        if (text.equalsIgnoreCase("cancel")) {
            Bukkit.getScheduler().runTask(plugin, () -> player.sendMessage("§7Cancelled."));
            return;
        }
        Bukkit.getScheduler().runTask(plugin, () -> waiting.accept(text));
    }
}
