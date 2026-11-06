ALTER TABLE branches DROP CONSTRAINT branches_name_key;

CREATE UNIQUE INDEX idx_branches_name_per_org
  ON branches (organization_id, lower(name));
