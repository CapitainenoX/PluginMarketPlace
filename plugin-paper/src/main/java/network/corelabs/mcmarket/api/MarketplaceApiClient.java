package network.corelabs.mcmarket.api;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import network.corelabs.mcmarket.model.CategorySummary;
import network.corelabs.mcmarket.model.PluginSummary;
import network.corelabs.mcmarket.model.PluginVersion;
import network.corelabs.mcmarket.model.UpdateCheckResult;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * Blocking HTTPS client for the marketplace's Go API. All methods here do
 * network I/O and must be called off the main server thread (callers are
 * responsible for wrapping calls in an async Bukkit task).
 */
public class MarketplaceApiClient {

    private final String baseUrl;
    private final String apiKey;
    private final HttpClient http;
    private final Gson gson = new Gson();

    public MarketplaceApiClient(String baseUrl, String apiKey) {
        String normalized = baseUrl.trim();
        if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
            normalized = "https://" + normalized;
        }
        if (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        this.baseUrl = normalized;
        this.apiKey = apiKey;
        this.http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    public List<PluginSummary> listPlugins(String query, String category, int limit, int offset) throws IOException, InterruptedException {
        StringBuilder path = new StringBuilder("/v1/plugins?limit=").append(limit).append("&offset=").append(offset);
        if (query != null && !query.isBlank()) {
            path.append("&q=").append(encode(query));
        }
        if (category != null && !category.isBlank()) {
            path.append("&category=").append(encode(category));
        }
        JsonObject body = getJson(path.toString());
        List<PluginSummary> out = new ArrayList<>();
        if (body.has("plugins")) {
            for (var el : body.getAsJsonArray("plugins")) {
                out.add(gson.fromJson(el, PluginSummary.class));
            }
        }
        return out;
    }

    public PluginSummary getPlugin(String slug) throws IOException, InterruptedException {
        JsonObject body = getJson("/v1/plugins/" + encode(slug));
        return gson.fromJson(body, PluginSummary.class);
    }

    public List<PluginVersion> listVersions(String slug) throws IOException, InterruptedException {
        JsonObject body = getJson("/v1/plugins/" + encode(slug) + "/versions");
        List<PluginVersion> out = new ArrayList<>();
        if (body.has("versions")) {
            for (var el : body.getAsJsonArray("versions")) {
                out.add(gson.fromJson(el, PluginVersion.class));
            }
        }
        return out;
    }

    public List<CategorySummary> listCategories() throws IOException, InterruptedException {
        JsonObject body = getJson("/v1/categories");
        List<CategorySummary> out = new ArrayList<>();
        if (body.has("categories")) {
            for (var el : body.getAsJsonArray("categories")) {
                out.add(gson.fromJson(el, CategorySummary.class));
            }
        }
        return out;
    }

    public UpdateCheckResult checkUpdates(String slug, String installedVersion) throws IOException, InterruptedException {
        String path = "/v1/mc/check-updates?plugin=" + encode(slug) + "&version=" + encode(installedVersion == null ? "" : installedVersion);
        JsonObject body = getJson(path);
        return gson.fromJson(body, UpdateCheckResult.class);
    }

    public void reportFingerprint(String slug, long versionId, String fingerprint) throws IOException, InterruptedException {
        JsonObject req = new JsonObject();
        req.addProperty("plugin_slug", slug);
        req.addProperty("version_id", versionId);
        req.addProperty("fingerprint", fingerprint);
        HttpRequest request = requestBuilder("/v1/mc/report-fingerprint")
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(gson.toJson(req), StandardCharsets.UTF_8))
                .build();
        HttpResponse<String> resp = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() >= 300) {
            throw new IOException("report-fingerprint failed: HTTP " + resp.statusCode() + " " + resp.body());
        }
    }

    /** Streams the jar for a version download straight to {@code dest}, overwriting it. */
    public void downloadVersion(long versionId, Path dest) throws IOException, InterruptedException {
        HttpRequest request = requestBuilder("/v1/versions/" + versionId + "/download").GET().build();
        HttpResponse<Path> resp = http.send(request, HttpResponse.BodyHandlers.ofFile(dest));
        if (resp.statusCode() >= 300) {
            throw new IOException("download failed: HTTP " + resp.statusCode());
        }
    }

    private JsonObject getJson(String path) throws IOException, InterruptedException {
        HttpRequest request = requestBuilder(path).GET().build();
        HttpResponse<String> resp = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() >= 300) {
            throw new IOException("HTTP " + resp.statusCode() + " for " + path + ": " + resp.body());
        }
        return gson.fromJson(resp.body(), JsonObject.class);
    }

    private HttpRequest.Builder requestBuilder(String path) {
        HttpRequest.Builder b = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + path))
                .timeout(Duration.ofSeconds(30));
        if (apiKey != null && !apiKey.isBlank()) {
            b.header("Authorization", "Bearer " + apiKey);
        }
        return b;
    }

    private static String encode(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }
}
