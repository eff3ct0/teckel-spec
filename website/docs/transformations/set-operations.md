# Set Operations

Set operations combine or compare entire datasets. Teckel provides three set operations: Union, Intersect, and Except.

All three require **schema compatibility**: source datasets must have the same number of columns, matched positionally (by order, not by name). The output uses column names from the first source. Column types must be compatible — the runtime applies implicit type widening where possible (e.g., `int` + `long` becomes `long`) and raises `E-SCHEMA-001` for incompatible types.

---

## Union (8.6)

Combines rows from multiple datasets into one.

**Schema:**

| Field     | Type                    | Required | Default | Description                                          |
|-----------|-------------------------|----------|---------|------------------------------------------------------|
| `sources` | NonEmptyList[AssetRef]  | Yes      | —       | Assets to combine. Must contain at least 2 elements. |
| `all`     | boolean                 | No       | `true`  | `true` = keep duplicates. `false` = remove duplicates.|

**Example — combine events from multiple sources:**

```yaml
transformation:
  - name: allEvents
    union:
      sources: [webEvents, mobileEvents, apiEvents]
      all: true
```

**Example — union with deduplication:**

```yaml
transformation:
  - name: uniqueCustomers
    union:
      sources: [onlineCustomers, storeCustomers]
      all: false
```

> **Tip:** The default for `all` is `true` (UNION ALL), which is usually what you want for performance. Set `all: false` only when you explicitly need deduplication.

---

## Intersect (8.7)

Returns rows that are present in **all** source datasets.

**Schema:**

| Field     | Type                    | Required | Default | Description                                           |
|-----------|-------------------------|----------|---------|-------------------------------------------------------|
| `sources` | NonEmptyList[AssetRef]  | Yes      | —       | Assets to intersect. Must contain at least 2 elements.|
| `all`     | boolean                 | No       | `false` | `true` = INTERSECT ALL. `false` = INTERSECT DISTINCT. |

**Example — find common products across two catalogs:**

```yaml
transformation:
  - name: commonProducts
    intersect:
      sources: [catalogA, catalogB]
      all: false
```

**Example — intersect all (preserving duplicate counts):**

```yaml
transformation:
  - name: sharedRecords
    intersect:
      sources: [datasetA, datasetB]
      all: true
```

> **Tip:** The default for `all` in intersect is `false` (distinct), which differs from union's default of `true`. This matches standard SQL semantics.

---

## Except (8.8)

Returns rows from the first source that are **not** in the second. This operation is not commutative: `A EXCEPT B` is different from `B EXCEPT A`.

**Schema:**

| Field   | Type     | Required | Default | Description                                       |
|---------|----------|----------|---------|---------------------------------------------------|
| `left`  | AssetRef | Yes      | —       | Source dataset.                                   |
| `right` | AssetRef | Yes      | —       | Dataset to subtract.                              |
| `all`   | boolean  | No       | `false` | `true` = EXCEPT ALL. `false` = EXCEPT DISTINCT.   |

Unlike union and intersect, except uses `left` and `right` fields instead of `sources` because the operation is directional.

**Example — find customers who have not placed orders:**

```yaml
transformation:
  - name: customersWithoutOrders
    except:
      left: allCustomerIds
      right: orderCustomerIds
      all: false
```

**Example — except all (preserving duplicate counts):**

```yaml
transformation:
  - name: remainingInventory
    except:
      left: warehouseStock
      right: shippedItems
      all: true
```

> **Tip:** Schema compatibility applies here too — `left` and `right` must have the same number of columns with compatible types.
