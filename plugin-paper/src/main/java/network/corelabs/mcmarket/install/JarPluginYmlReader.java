package network.corelabs.mcmarket.install;

import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.YamlConfiguration;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

/**
 * Reads the {@code name}, {@code version} and {@code commands} declared in a
 * jar's embedded plugin.yml, straight out of the zip entry - no classloading,
 * no touching the jar's actual plugin classes. Used both for this plugin's
 * own installed.json-tracked jars (to list their commands) and for foreign
 * jars sitting in plugins/ that were never installed through MCMarket.
 */
public final class JarPluginYmlReader {

    public static class Descriptor {
        public final String name;
        public final String version;
        public final List<String> commands;

        Descriptor(String name, String version, List<String> commands) {
            this.name = name;
            this.version = version;
            this.commands = commands;
        }
    }

    private JarPluginYmlReader() {
    }

    /**
     * Blocking (disk I/O); call off the main thread. Returns {@code null} if
     * the jar has no readable plugin.yml or it fails to parse - callers must
     * treat that as "skip this jar", never crash a wider scan over it.
     */
    public static Descriptor read(Path jarFile) {
        try (ZipFile zip = new ZipFile(jarFile.toFile())) {
            ZipEntry entry = zip.getEntry("plugin.yml");
            if (entry == null) {
                return null;
            }
            String content;
            try (InputStream in = zip.getInputStream(entry)) {
                content = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            }
            YamlConfiguration yaml = new YamlConfiguration();
            yaml.loadFromString(content);
            String name = yaml.getString("name");
            if (name == null || name.isBlank()) {
                return null;
            }
            String version = yaml.getString("version", "");
            List<String> commands = new ArrayList<>();
            ConfigurationSection commandsSection = yaml.getConfigurationSection("commands");
            if (commandsSection != null) {
                commands.addAll(commandsSection.getKeys(false));
            }
            return new Descriptor(name, version, commands);
        } catch (Exception e) {
            return null;
        }
    }

    /** Lowercase, alphanumerics-only - so "My Plugin", "my-plugin" and "myplugin" all compare equal. */
    public static String normalize(String s) {
        if (s == null) {
            return "";
        }
        return s.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }
}
