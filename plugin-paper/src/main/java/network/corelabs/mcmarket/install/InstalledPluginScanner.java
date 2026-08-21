package network.corelabs.mcmarket.install;

import network.corelabs.mcmarket.model.PluginSummary;

import java.io.IOException;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Scans the server's plugins/ folder for jars this installer doesn't already
 * track in installed.json (that manifest only knows about jars MCMarket put
 * there itself) and fuzzy-matches their declared plugin.yml name against the
 * marketplace catalog. This lets "My Installed / Updates" recognize a
 * marketplace plugin even when it was manually placed under a different jar
 * filename, or predates ever being installed through this tool.
 */
public final class InstalledPluginScanner {

    public static class ForeignPlugin {
        public final Path jarFile;
        public final JarPluginYmlReader.Descriptor descriptor;

        ForeignPlugin(Path jarFile, JarPluginYmlReader.Descriptor descriptor) {
            this.jarFile = jarFile;
            this.descriptor = descriptor;
        }
    }

    public static class ForeignMatch {
        public final PluginSummary marketplacePlugin;
        public final ForeignPlugin jar;

        public ForeignMatch(PluginSummary marketplacePlugin, ForeignPlugin jar) {
            this.marketplacePlugin = marketplacePlugin;
            this.jar = jar;
        }
    }

    private InstalledPluginScanner() {
    }

    /**
     * Blocking (disk I/O); call off the main thread. Skips this plugin's own
     * jar, and skips (rather than throws on) any jar it can't read.
     */
    public static List<ForeignPlugin> scan(Path pluginsDir, Path ownJarFile) {
        List<ForeignPlugin> out = new ArrayList<>();
        if (!Files.isDirectory(pluginsDir)) {
            return out;
        }
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(pluginsDir, "*.jar")) {
            for (Path jar : stream) {
                if (isOwnJar(jar, ownJarFile)) {
                    continue;
                }
                JarPluginYmlReader.Descriptor descriptor = JarPluginYmlReader.read(jar);
                if (descriptor != null) {
                    out.add(new ForeignPlugin(jar, descriptor));
                }
            }
        } catch (IOException ignored) {
            // Best effort: an unreadable plugins/ dir just yields no fuzzy matches.
        }
        return out;
    }

    private static boolean isOwnJar(Path jar, Path ownJarFile) {
        if (ownJarFile == null) {
            return false;
        }
        try {
            return Files.isSameFile(jar, ownJarFile);
        } catch (IOException e) {
            return jar.getFileName().equals(ownJarFile.getFileName());
        }
    }

    /**
     * Matches foreign jars against the marketplace catalog by normalized
     * name/slug. Normalizes both {@code name} and {@code slug} on the
     * marketplace side since either could line up with a jar's declared name.
     */
    public static Map<String, ForeignMatch> matchAgainstMarketplace(List<ForeignPlugin> foreign, List<PluginSummary> marketplace) {
        Map<String, ForeignMatch> out = new LinkedHashMap<>();
        for (ForeignPlugin fp : foreign) {
            String normName = JarPluginYmlReader.normalize(fp.descriptor.name);
            if (normName.isEmpty()) {
                continue;
            }
            for (PluginSummary p : marketplace) {
                if (normName.equals(JarPluginYmlReader.normalize(p.name)) || normName.equals(JarPluginYmlReader.normalize(p.slug))) {
                    out.putIfAbsent(p.slug, new ForeignMatch(p, fp));
                    break;
                }
            }
        }
        return out;
    }
}
