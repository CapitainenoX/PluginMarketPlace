package network.corelabs.mcmarket.model;

/** Mirrors the JSON object returned by /v1/plugins/{slug}/versions and /v1/versions/{id}. */
public class PluginVersion {
    public long id;
    public long plugin_id;
    public String version;
    public String changelog;
    public String mc_version_min;
    public String mc_version_max;
    public String file_sha256;
    public long file_size;
    public long downloads_count;
    public String status;
    public String created_at;
}
