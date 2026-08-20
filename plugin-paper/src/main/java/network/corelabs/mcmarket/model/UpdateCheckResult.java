package network.corelabs.mcmarket.model;

/** Mirrors the JSON object returned by GET /v1/mc/check-updates. */
public class UpdateCheckResult {
    public boolean update_available;
    public PluginVersion latest_version;
}
