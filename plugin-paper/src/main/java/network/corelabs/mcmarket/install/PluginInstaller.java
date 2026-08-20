package network.corelabs.mcmarket.install;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import network.corelabs.mcmarket.api.MarketplaceApiClient;
import network.corelabs.mcmarket.model.PluginSummary;
import network.corelabs.mcmarket.model.PluginVersion;

import java.io.IOException;
import java.io.Reader;
import java.io.Writer;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Downloads and installs marketplace jars into the server's plugins/ folder.
 *
 * IMPORTANT: Paper cannot hot-swap a plugin's classes at runtime (old class
 * definitions stay loaded, and re-loading risks classloader leaks and
 * corrupted static state). So this installer only ever writes the jar to
 * disk and never attempts to enable/reload it in the running JVM. Every
 * caller must surface a "restart required" message after a successful
 * install/update — that constraint is deliberate, not a missing feature.
 */
public class PluginInstaller {

    /** One entry per marketplace plugin this installer has put into plugins/. */
    public static class InstalledRecord {
        public String slug;
        public String version;
        public long versionId;
        public String jarFileName;
        public String sha256;
    }

    public static class Result {
        public final boolean success;
        public final String message;

        private Result(boolean success, String message) {
            this.success = success;
            this.message = message;
        }

        public static Result ok(String message) {
            return new Result(true, message);
        }

        public static Result fail(String message) {
            return new Result(false, message);
        }
    }

    private final MarketplaceApiClient api;
    private final Path pluginsDir;
    private final Path manifestFile;
    private final Gson gson = new Gson();

    public PluginInstaller(MarketplaceApiClient api, Path pluginsDir, Path pluginDataFolder) {
        this.api = api;
        this.pluginsDir = pluginsDir;
        this.manifestFile = pluginDataFolder.resolve("installed.json");
    }

    /** Blocking: downloads the jar, verifies its hash, and atomically installs it. Call off the main thread. */
    public Result install(PluginSummary plugin, PluginVersion version) {
        Path tempFile = pluginsDir.resolve(".mcmarket-" + UUID.randomUUID() + ".tmp");
        try {
            Files.createDirectories(pluginsDir);
            api.downloadVersion(version.id, tempFile);

            String actualHash = sha256(tempFile);
            if (version.file_sha256 == null || !version.file_sha256.equalsIgnoreCase(actualHash)) {
                Files.deleteIfExists(tempFile);
                return Result.fail("Downloaded file hash did not match the marketplace's recorded hash. Install aborted.");
            }

            String jarFileName = plugin.slug + "-" + version.version + ".jar";
            Path finalPath = pluginsDir.resolve(jarFileName);
            Files.move(tempFile, finalPath, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);

            InstalledRecord record = new InstalledRecord();
            record.slug = plugin.slug;
            record.version = version.version;
            record.versionId = version.id;
            record.jarFileName = jarFileName;
            record.sha256 = actualHash;
            saveRecord(record);

            return Result.ok("Installed " + plugin.name + " " + version.version + ". Restart the server to load it.");
        } catch (IOException | InterruptedException | NoSuchAlgorithmException e) {
            try {
                Files.deleteIfExists(tempFile);
            } catch (IOException ignored) {
                // best effort cleanup
            }
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            return Result.fail("Install failed: " + e.getMessage());
        }
    }

    public synchronized Map<String, InstalledRecord> loadManifest() {
        if (!Files.exists(manifestFile)) {
            return new HashMap<>();
        }
        try (Reader reader = Files.newBufferedReader(manifestFile, StandardCharsets.UTF_8)) {
            Type type = new TypeToken<Map<String, InstalledRecord>>() {}.getType();
            Map<String, InstalledRecord> map = gson.fromJson(reader, type);
            return map != null ? map : new HashMap<>();
        } catch (IOException e) {
            return new HashMap<>();
        }
    }

    private synchronized void saveRecord(InstalledRecord record) throws IOException {
        Map<String, InstalledRecord> manifest = loadManifest();
        manifest.put(record.slug, record);
        Files.createDirectories(manifestFile.getParent());
        try (Writer writer = Files.newBufferedWriter(manifestFile, StandardCharsets.UTF_8)) {
            gson.toJson(manifest, writer);
        }
    }

    public static String sha256(Path file) throws IOException, NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (var in = Files.newInputStream(file)) {
            byte[] buf = new byte[8192];
            int read;
            while ((read = in.read(buf)) != -1) {
                digest.update(buf, 0, read);
            }
        }
        StringBuilder sb = new StringBuilder();
        for (byte b : digest.digest()) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
