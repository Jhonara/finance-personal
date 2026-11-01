ALTER TABLE categories
    ADD COLUMN parent_category_id BIGINT;

-- Current rows are deliberately left as roots. Their IDs and all financial
-- references remain unchanged until each user chooses a parent.
ALTER TABLE categories
    ADD CONSTRAINT ck_categories_not_own_parent
        CHECK (parent_category_id IS NULL OR parent_category_id <> id),
    ADD CONSTRAINT uk_categories_id_user_type
        UNIQUE (id, user_id, type),
    ADD CONSTRAINT fk_categories_parent_owner_type
        FOREIGN KEY (parent_category_id, user_id, type)
            REFERENCES categories (id, user_id, type)
            ON DELETE RESTRICT;

CREATE INDEX idx_categories_parent_owner_type
    ON categories (parent_category_id, user_id, type);

-- Do not silently rename or merge historic user data if it already contains
-- case/whitespace-only duplicates which violate the new sibling rule.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM categories
        GROUP BY user_id, type, parent_category_id, lower(btrim(name))
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Category hierarchy migration found duplicate sibling names; resolve them without deleting category history before retrying';
    END IF;
END $$;

ALTER TABLE categories
    DROP CONSTRAINT uk_category_user_type_name;

CREATE UNIQUE INDEX ux_categories_root_user_type_name
    ON categories (user_id, type, lower(btrim(name)))
    WHERE parent_category_id IS NULL;

CREATE UNIQUE INDEX ux_categories_sibling_user_type_name
    ON categories (user_id, type, parent_category_id, lower(btrim(name)))
    WHERE parent_category_id IS NOT NULL;

CREATE OR REPLACE FUNCTION enforce_category_hierarchy_depth()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    parent_parent_id BIGINT;
BEGIN
    IF NEW.parent_category_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.parent_category_id = NEW.id THEN
        RAISE EXCEPTION 'A category cannot be its own parent' USING ERRCODE = '23514';
    END IF;

    -- Serialize hierarchy edits for one owner so concurrent changes cannot
    -- create a cycle or a third level.
    PERFORM pg_advisory_xact_lock(NEW.user_id);

    SELECT parent_category_id
      INTO parent_parent_id
      FROM categories
     WHERE id = NEW.parent_category_id
       AND user_id = NEW.user_id
       AND type = NEW.type;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Category parent must belong to the same user and type' USING ERRCODE = '23503';
    END IF;

    IF parent_parent_id IS NOT NULL THEN
        RAISE EXCEPTION 'Only two category levels are supported' USING ERRCODE = '23514';
    END IF;

    IF EXISTS (SELECT 1 FROM categories WHERE parent_category_id = NEW.id) THEN
        RAISE EXCEPTION 'A category with children cannot become a subcategory' USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_categories_hierarchy_depth
    BEFORE INSERT OR UPDATE OF parent_category_id ON categories
    FOR EACH ROW
    EXECUTE FUNCTION enforce_category_hierarchy_depth();
