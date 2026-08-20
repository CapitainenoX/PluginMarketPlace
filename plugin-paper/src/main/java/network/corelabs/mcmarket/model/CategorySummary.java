package network.corelabs.mcmarket.model;

import com.google.gson.annotations.SerializedName;

/**
 * Mirrors GET /v1/categories. The Go handler marshals the db.Category struct
 * without json tags, so field names come through PascalCase (ID/Slug/Name/
 * Description) rather than the snake_case used everywhere else in the API.
 * Both spellings are accepted here so this keeps working once that's fixed.
 */
public class CategorySummary {
    @SerializedName(value = "id", alternate = "ID")
    public long id;

    @SerializedName(value = "slug", alternate = "Slug")
    public String slug;

    @SerializedName(value = "name", alternate = "Name")
    public String name;

    @SerializedName(value = "description", alternate = "Description")
    public String description;
}
