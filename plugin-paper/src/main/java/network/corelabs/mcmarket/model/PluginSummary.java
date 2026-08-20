package network.corelabs.mcmarket.model;

import java.util.List;

/** Mirrors the JSON object returned by GET /v1/plugins and /v1/plugins/{slug}. */
public class PluginSummary {
    public long id;
    public String slug;
    public String name;
    public String summary;
    public String description;
    public long owner_id;
    public Long category_id;
    public String status;
    public long downloads_count;
    public List<String> tags;
    public String created_at;
    public String updated_at;
}
