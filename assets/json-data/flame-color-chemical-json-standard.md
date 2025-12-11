# Flame-Color Chemical JSON Standard

## 1. File Naming and Location

- One JSON file per chemical compound.
- File names must be **lower-case-with-dashes-only**, with no spaces.
- Recommended file naming pattern: `{chemical-name}-{anion}.json`, for example:
  - `strontium-nitrate.json`
  - `strontium-carbonate.json`
  - `strontium-chloride.json`
- Typical path within the project:
  - `motors/assets/json-data/{file-name}.json`

## 2. Top-Level JSON Structure (Per Chemical)

Each chemical file uses the following structure:

```json
{
  "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "reference_id": "optional_short_name",
  "chemical_name": "Strontium nitrate",
  "chemical_compound": "Sr(NO3)2",
  "flame_color": "deep_red",
  "burn_contribution": "oxidizer",
  "burn_modification": "burn_accelerant",
  "physical_form": "fine crystalline powder",
  "hygroscopic": true,
  "color_saturation": "high",
  "equivalent_weight": null,
  "oh_value": null,
  "notes": "",
  "other_references": [
    {
      "description": "material safety data sheet",
      "url": ""
    }
  ],
  "procurement_sources": [
    {
      "vendor_name": "",
      "url": "",
      "minimum_order_quantity": null,
      "minimum_order_unit": "",
      "typical_purity": "",
      "acquisition_restrictions": "",
      "notes": ""
    }
  ],
  "last_updated": "YYYY-MM-DDThh:mm:ssZ"
}
```

### 2.1 Field Definitions

- `id`  
  GUID or random string that uniquely identifies this chemical record.

- `reference_id`  
  Optional short internal identifier, human-readable.

- `chemical_name`  
  English descriptive name, e.g. `"Strontium nitrate"`.

- `chemical_compound`  
  Chemical formula or compound notation, e.g. `"Sr(NO3)2"`.

- `flame_color`  
  Primary flame color contribution, e.g. `"deep_red"`, `"blue_violet"`, `"pale_violet"`.  
  This field is descriptive and may use lower-case with underscores for multi-word colors.

- `burn_contribution`  
  Describes **what** the chemical contributes to the energetic system overall.  
  Allowed values include:
  - `"oxidizer"`
  - `"fuel"`
  - `"neutral"`
  - `"binder"`
  - `"plasticizer"`
  - `"curative"`
  - `"color_donor"`

- `burn_modification`  
  Describes **how** the chemical modifies burn rate or behavior.  
  Allowed values include:
  - `"burn_accelerant"`
  - `"burn_inhibitor"`
  - `"neutral"`
  - `"pressure_sensitive"`
  - `"temperature_sensitive"`
  - `"slag_former"`
  - `"smoke_reducer"`
  - `"smoke_enhancer"`
  - `"spark_producer"`

- `physical_form`  
  Descriptive English phrase **without underscores**, e.g.:
  - `"fine crystalline powder"`
  - `"coarse granules"`
  - `"low viscosity liquid"`
  - `"viscous polymer"`

- `hygroscopic`  
  Boolean indicating whether the chemical is hygroscopic (`true` or `false`).

- `color_saturation`  
  Qualitative indicator of how strong and saturated the flame color from this compound is under typical pyrotechnic or APCP-adjacent conditions.  
  Allowed values:
  - `"high"` – strong, vivid color, usually the preferred salt for that hue.
  - `"medium"` – useful color but less vivid than the best options or easily masked.
  - `"low"` – weak coloration or largely masked by other components.

- `equivalent_weight`  
  Optional numeric equivalent weight where it is relevant (for curatives, binders, etc.).  
  Use `null` when not applicable.

- `oh_value`  
  Optional numeric OH value or functionality-related metric where applicable.  
  Use `null` when not applicable.

- `apcp_compatibility`  
  Qualitative indicator of whether this compound is appropriate for use in APCP formulations (binder-based composite propellants).  
  Suggested values:
  - `"suitable"` – generally compatible with APCP systems when normal best practices are followed.
  - `"limited"` – can be used, but only in restricted roles or with significant caveats (e.g., hygroscopicity, strong burn inhibition, cost, procurement difficulty).
  - `"unsuitable"` – not recommended for APCP due to sensitivity, incompatibility, or unacceptable safety risk.

- `notes`  
  Free-text comments about handling, typical uses, or constraints.

- `other_references`  
  Array of supplemental reference objects, such as SDS/MSDS or technical data sheets:
  - `description`: short label for the reference
  - `url`: link to the reference

- `procurement_sources`  
  Array of vendor/procurement objects describing where this chemical can be sourced.  
  Each entry includes:
  - `vendor_name`: name of the supplier
  - `url`: product or catalog URL
  - `minimum_order_quantity`: numeric value if known (e.g. 1, 10, 25)
  - `minimum_order_unit`: unit for the minimum order (e.g. `"lb"`, `"kg"`, `"g"`)
  - `typical_purity`: descriptive purity information (e.g. `"99.5%"`, `"technical grade"`)
  - `acquisition_restrictions`: notes on any legal or policy limitations (e.g. ATF-regulated, hazmat shipping, business-only sales)
  - `notes`: any additional procurement notes (lead times, packaging, pricing hints, hobby-friendly vs industrial, etc.)

- `last_updated`  
  ISO 8601 timestamp indicating when this chemical JSON file was last modified.

## 3. Wrapper / Index Files

To work with groups of chemicals, a separate "wrapper" JSON file can be used.  
This file references individual chemical JSON files rather than duplicating content.

Example wrapper structure:

```json
{
  "chemicals": [
    {
      "id": "66666666-6666-6666-6666-111111111111",
      "chemical_name": "Strontium nitrate",
      "file_name": "strontium-nitrate.json"
    },
    {
      "id": "66666666-6666-6666-6666-222222222222",
      "chemical_name": "Strontium carbonate",
      "file_name": "strontium-carbonate.json"
    },
    {
      "id": "66666666-6666-6666-6666-333333333333",
      "chemical_name": "Strontium chloride",
      "file_name": "strontium-chloride.json"
    }
  ],
  "last_updated": "YYYY-MM-DDThh:mm:ssZ"
}
```

Wrapper files must also follow the **lower-case-with-dashes-only** file naming rule.
